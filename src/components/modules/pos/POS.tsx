import React, { useState, useEffect, useMemo, useRef } from "react";
import { ProductGrid } from "./ProductGrid";
import { ShoppingCart } from "./ShoppingCart";
import {
  Search,
  X,
  ScanBarcode,
  AlertCircle,
  MonitorPlay,
  Wifi,
  WifiOff,
  Keyboard,
} from "lucide-react";
import { db, normalizeKey } from "../../../lib/db";
import { useApp } from "../../../context/AppContext";
import { Product, CartItem, KeyboardShortcuts } from "../../../types";

type InventoryUpdatedPayload = { shopId?: string; items?: Product[] };
const isInventoryUpdatedPayload = (
  payload: unknown,
): payload is InventoryUpdatedPayload => {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as Record<string, unknown>;
  return (
    (candidate.shopId === undefined || typeof candidate.shopId === "string") &&
    (candidate.items === undefined ||
      (Array.isArray(candidate.items) &&
        candidate.items.every(
          (item) => typeof item === "object" && item !== null,
        )))
  );
};

interface POSKeyboardFlowProps {
  products: Product[];
  filteredProducts: Product[];
  cart: CartItem[];
  addToCart: (p: CartItem) => void;
  updateCartItemQuantity: (id: string, qty: number) => void;
  clearCart: () => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  setScanError: React.Dispatch<React.SetStateAction<string | null>>;
  setIsScannerConnected: React.Dispatch<React.SetStateAction<boolean>>;
  shortcuts: KeyboardShortcuts;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

const usePOSKeyboardFlow = ({
  products,
  filteredProducts,
  cart,
  addToCart,
  updateCartItemQuantity,
  clearCart,
  searchInputRef,
  setSearchTerm,
  setScanError,
  setIsScannerConnected,
  shortcuts,
}: POSKeyboardFlowProps) => {
  const scanQueueRef = useRef<string[]>([]);
  const barcodeBufferRef = useRef("");
  const lastKeyTimeRef = useRef(Date.now());

  const scannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const batchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const productsRef = useRef<Product[]>(products);
  const filteredProductsRef = useRef<Product[]>(filteredProducts);
  const cartRef = useRef<CartItem[]>(cart);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);
  useEffect(() => {
    filteredProductsRef.current = filteredProducts;
  }, [filteredProducts]);
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      if (batchTimeoutRef.current) clearTimeout(batchTimeoutRef.current);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      if (scannerTimeoutRef.current) clearTimeout(scannerTimeoutRef.current);
    };
  }, []);

  const playBeep = (type: "success" | "error" = "success") => {
    try {
      const ctx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      if (type === "success") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else {
        osc.type = "square";
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      console.warn("Audio blocked");
    }
  };

  const processBatch = () => {
    if (scanQueueRef.current.length === 0) return;
    const batch = [...scanQueueRef.current];
    scanQueueRef.current = [];

    let successCount = 0;
    let lastError = null;

    batch.forEach((barcode) => {
      const matchedProduct = productsRef.current.find(
        (p) => p.barcode === barcode,
      );
      if (matchedProduct) {
        const existingItem = cartRef.current.find(
          (item) => item.id === matchedProduct.id,
        );
        if (existingItem)
          updateCartItemQuantity(matchedProduct.id, existingItem.quantity + 1);
        else addToCart({ ...matchedProduct, quantity: 1 });
        successCount++;
      } else {
        lastError = barcode;
      }
    });

    if (successCount > 0) playBeep("success");
    if (lastError) {
      playBeep("error");
      setScanError(`Barcode not found: ${lastError}`);
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = setTimeout(() => setScanError(null), 3000);
    }
  };

  const pushToQueue = (scannedBarcode: string) => {
    if (!scannedBarcode || scannedBarcode.length < 8) return false;
    scanQueueRef.current.push(scannedBarcode);
    if (!batchTimeoutRef.current) {
      batchTimeoutRef.current = setTimeout(() => {
        processBatch();
        batchTimeoutRef.current = null;
      }, 200);
    }
    return true;
  };

  const keepScannerAwake = () => {
    setIsScannerConnected(true);
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    idleTimeoutRef.current = setTimeout(
      () => setIsScannerConnected(false),
      30000,
    );
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      let normalizedKey = e.key;
      if (normalizedKey === "NumpadEnter") normalizedKey = "Enter";
      if (normalizedKey === " ") normalizedKey = "Space";

      keepScannerAwake();

      if (normalizedKey === "Escape") {
        window.dispatchEvent(new CustomEvent("pos:escape"));
        return;
      }

      if (timeDiff < 30 && normalizedKey.length === 1) {
        barcodeBufferRef.current += normalizedKey;
        if (scannerTimeoutRef.current) clearTimeout(scannerTimeoutRef.current);
        scannerTimeoutRef.current = setTimeout(() => {
          if (barcodeBufferRef.current.length >= 8) {
            pushToQueue(barcodeBufferRef.current);
            setSearchTerm("");
          }
          barcodeBufferRef.current = "";
        }, 50);
        return;
      }

      if (normalizedKey === "Enter" && barcodeBufferRef.current.length >= 8) {
        if (scannerTimeoutRef.current) clearTimeout(scannerTimeoutRef.current);
        pushToQueue(barcodeBufferRef.current);
        setSearchTerm("");
        barcodeBufferRef.current = "";
        e.preventDefault();
        return;
      }

      if (timeDiff > 50) barcodeBufferRef.current = "";

      const activeTag = document.activeElement?.tagName;
      const isSearchFocused = document.activeElement === searchInputRef.current;
      const isTyping = activeTag === "INPUT" || activeTag === "TEXTAREA";

      let comboStr = "";
      if (e.ctrlKey && normalizedKey !== "Control") comboStr += "Ctrl+";
      if (e.shiftKey && normalizedKey !== "Shift") comboStr += "Shift+";
      if (e.altKey && normalizedKey !== "Alt") comboStr += "Alt+";
      comboStr += normalizedKey;

      const currentComboNorm = normalizeKey(comboStr);

      if (currentComboNorm === normalizeKey(shortcuts.focusSearch)) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (currentComboNorm === normalizeKey(shortcuts.checkout)) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("pos:checkout"));
        return;
      }
      if (currentComboNorm === normalizeKey(shortcuts.clearCart)) {
        e.preventDefault();
        clearCart();
        return;
      }
      if (currentComboNorm === normalizeKey(shortcuts.togglePayment)) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("pos:toggle-payment"));
        return;
      }
      if (currentComboNorm === normalizeKey(shortcuts.addCustomer)) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("pos:add-customer"));
        return;
      }
      if (currentComboNorm === normalizeKey(shortcuts.removeCustomer)) {
        if (isTyping && !isSearchFocused) return;
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("pos:remove-customer"));
        return;
      }

      if (currentComboNorm === normalizeKey(shortcuts.confirmPayment)) {
        if (isTyping && !isSearchFocused) {
          return;
        }
        if (!isSearchFocused || searchInputRef.current?.value === "") {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("pos:action-enter"));
          return;
        }
      }

      if (
        !isTyping ||
        (isSearchFocused && searchInputRef.current?.value === "")
      ) {
        if (
          currentComboNorm === normalizeKey(shortcuts.increaseQuantity) ||
          currentComboNorm === normalizeKey(shortcuts.decreaseQuantity) ||
          normalizedKey === "+" ||
          normalizedKey === "=" ||
          normalizedKey === "-"
        ) {
          e.preventDefault();
          if (cartRef.current.length > 0) {
            const lastItem = cartRef.current[cartRef.current.length - 1];
            const newQty =
              currentComboNorm === normalizeKey(shortcuts.decreaseQuantity) ||
              normalizedKey === "-"
                ? lastItem.quantity - 1
                : lastItem.quantity + 1;

            if (newQty <= 0) {
              updateCartItemQuantity(lastItem.id, 0);
            } else {
              updateCartItemQuantity(lastItem.id, newQty);
            }
          }
          return;
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [
    addToCart,
    clearCart,
    updateCartItemQuantity,
    searchInputRef,
    setSearchTerm,
    setIsScannerConnected,
    shortcuts,
  ]);

  return { pushToQueue, keepScannerAwake };
};

export const POS: React.FC = () => {
  const {
    currentShop,
    currentUser,
    cart,
    addToCart,
    updateCartItemQuantity,
    clearCart,
  } = useApp();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scanError, setScanError] = useState<string | null>(null);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isScannerConnected, setIsScannerConnected] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const userId = currentUser?.id || "default";

  const [shortcuts, setShortcuts] = useState<KeyboardShortcuts>(
    db.shortcuts.get(userId),
  );

  useEffect(() => {
    const handleShortcutUpdate = () => setShortcuts(db.shortcuts.get(userId));
    window.addEventListener("shortcuts-updated", handleShortcutUpdate);
    return () =>
      window.removeEventListener("shortcuts-updated", handleShortcutUpdate);
  }, [userId]);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))].sort(),
    [products],
  );

  const filteredProducts: Product[] = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        debouncedSearchTerm === "" ||
        product.name
          .toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase()) ||
        (product.barcode || "").includes(debouncedSearchTerm);
      const matchesCategory =
        selectedCategory === null || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, debouncedSearchTerm, selectedCategory]);

  const { pushToQueue, keepScannerAwake } = usePOSKeyboardFlow({
    products,
    filteredProducts,
    cart,
    addToCart,
    updateCartItemQuantity,
    clearCart,
    searchInputRef,
    setSearchTerm,
    setScanError,
    setIsScannerConnected,
    shortcuts,
  });

  const isMatchingShop = (shopId?: string) => {
    if (!shopId || !currentShop?.id) return false;
    const normalize = (value: string) => value.replace(/^shop_/, "");
    return normalize(shopId) === normalize(currentShop.id);
  };

  useEffect(() => {
    const handler = (payload: unknown) => {
      if (!payload || typeof payload !== "object") return;
      const candidate = payload as Record<string, unknown>;
      const value =
        typeof candidate.value === "string" ? candidate.value.trim() : "";
      const sessionType =
        typeof candidate.sessionType === "string"
          ? candidate.sessionType
          : "";
      const shopId =
        typeof candidate.shopId === "string" ? candidate.shopId : undefined;

      if (!value || !isMatchingShop(shopId)) return;
      if (sessionType && sessionType !== "checkout") return;

      keepScannerAwake();
      pushToQueue(value);
    };

    const unsubscribe = db.on("mobileBarcode", handler);
    return () => unsubscribe();
  }, [currentShop?.id, keepScannerAwake, pushToQueue]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleRemoteRefresh = () => {
      if (currentShop) setProducts(db.products.getByShopId(currentShop.id));
    };
    const handleFocusRecovery = () => {
      if (
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          document.activeElement?.tagName || "",
        )
      )
        searchInputRef.current?.focus();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("inventory-force-refresh", handleRemoteRefresh);
    window.addEventListener("click", handleFocusRecovery);

    searchInputRef.current?.focus();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(
        "inventory-force-refresh",
        handleRemoteRefresh,
      );
      window.removeEventListener("click", handleFocusRecovery);
    };
  }, [currentShop]);

  useEffect(() => {
    if (!currentShop) return setProducts([]);
    const loadProducts = () => {
      setProducts(db.products.getByShopId(currentShop.id));
      setIsLoading(false);
    };
    loadProducts();

    const handler = (payload: unknown) => {
      if (!isInventoryUpdatedPayload(payload) || !payload.shopId) return;
      if (
        String(payload.shopId).replace(/^shop_/, "") ===
          String(currentShop.id).replace(/^shop_/, "") ||
        payload.shopId === currentShop.id
      ) {
        Array.isArray(payload.items)
          ? setProducts(payload.items)
          : loadProducts();
      }
    };
    const unsubscribe = db.on("inventoryUpdated", handler);
    return () => unsubscribe();
  }, [currentShop]);

  const simulateScan = () => {
    keepScannerAwake();
    if (products.length > 0) {
      pushToQueue(
        products[Math.floor(Math.random() * products.length)].barcode,
      );
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden">
      <div className="bg-white px-5 py-3 flex justify-between items-center rounded-full mx-0 mb-4 shadow-sm border border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-6">
          <span
            className={`flex items-center gap-1.5 text-xs font-bold ${isOnline ? "text-green-600" : "text-gray-500"}`}
          >
            {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
            {isOnline ? "Online Sync Active" : "Offline Database Active"}
          </span>
          <span
            className={`flex items-center gap-1.5 text-xs font-bold transition-colors duration-500 ${isScannerConnected ? "text-blue-600" : "text-gray-400"}`}
          >
            <Keyboard size={16} />{" "}
            {isScannerConnected ? "Scanner Active" : "Scanner Idle"}
          </span>
        </div>
        <button
          onClick={simulateScan}
          className="flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full border border-gray-200 transition-colors text-xs font-bold"
        >
          <MonitorPlay size={14} /> Simulate Scan
        </button>
      </div>

      <div className="flex flex-col md:flex-row flex-1 gap-4 min-h-0 relative">
        {scanError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="bg-red-100 p-2 rounded-full">
              <AlertCircle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="font-bold text-sm text-red-900">Scan Failed</p>
              <p className="text-xs font-medium text-red-700">{scanError}</p>
            </div>
            <button
              onClick={() => setScanError(null)}
              className="text-red-400 hover:text-red-700 ml-4 p-1 rounded-md hover:bg-red-100 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 space-y-4 flex-shrink-0">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Search size={20} />
              </div>

              <input
                ref={searchInputRef}
                type="text"
                className="w-full h-12 pl-10 pr-10 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ecff76] focus:border-[#ecff76] text-base transition-all"
                placeholder={`Search [${shortcuts.focusSearch}] / Checkout [${shortcuts.checkout}] / Clear [${shortcuts.clearCart}]`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  keepScannerAwake();
                  if (e.key === "Enter" && searchTerm) {
                    // ⚠️ FIX: STOP EVENT FROM REACHING GLOBAL KEYDOWN LISTENER
                    e.preventDefault();
                    e.stopPropagation();
                    pushToQueue(searchTerm.trim());
                    setSearchTerm("");
                  }
                }}
                autoFocus
              />

              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    searchInputRef.current?.focus();
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              )}
              <div className="absolute inset-y-0 right-10 flex items-center pointer-events-none text-gray-300">
                <ScanBarcode size={20} />
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCategory === null ? "bg-[#ecff76] text-gray-900 shadow-sm border border-[#dcefa8]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                All Items
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCategory === category ? "bg-[#ecff76] text-gray-900 shadow-sm border border-[#dcefa8]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ecff76]"></div>
              </div>
            ) : (
              <ProductGrid products={filteredProducts} />
            )}
          </div>
        </div>

        <div className="w-full md:w-[400px] flex-shrink-0 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <ShoppingCart />
        </div>
      </div>
    </div>
  );
};
