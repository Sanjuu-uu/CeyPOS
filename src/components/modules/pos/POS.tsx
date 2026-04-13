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
import { db } from "../../../lib/db";
import { useApp } from "../../../context/AppContext";
import { Product, CartItem } from "../../../types";

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

// --- ENTERPRISE BARCODE HOOK (WITH 30s IDLE TIMEOUT) ---
const useBarcodeScanner = (
  products: Product[],
  cart: CartItem[],
  addToCart: (p: CartItem) => void,
  updateCartItemQuantity: (id: string, qty: number) => void,
  searchInputRef: React.RefObject<HTMLInputElement>,
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>,
  setScanError: React.Dispatch<React.SetStateAction<string | null>>,
  setIsScannerConnected: React.Dispatch<React.SetStateAction<boolean>>,
) => {
  const scanQueueRef = useRef<string[]>([]);

  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const batchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // NEW: Idle Timer

  const productsRef = useRef(products);
  const cartRef = useRef(cart);
  useEffect(() => {
    productsRef.current = products;
  }, [products]);
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      if (batchTimeoutRef.current) clearTimeout(batchTimeoutRef.current);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
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
        if (existingItem) {
          updateCartItemQuantity(matchedProduct.id, existingItem.quantity + 1);
        } else {
          addToCart({ ...matchedProduct, quantity: 1 });
        }
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
      errorTimeoutRef.current = setTimeout(() => {
        setScanError(null);
      }, 3000);
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

  const activateScanner = () => {
    setIsScannerConnected(true);
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);

    // Set scanner back to idle if no scans happen for 30 seconds
    idleTimeoutRef.current = setTimeout(() => {
      setIsScannerConnected(false);
    }, 30000);
  };

  useEffect(() => {
    let barcodeBuffer = "";
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" &&
        document.activeElement !== searchInputRef.current
      )
        return;

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) barcodeBuffer = "";

      if (e.key === "Enter") {
        if (barcodeBuffer.length >= 8) {
          pushToQueue(barcodeBuffer.trim());
          setSearchTerm("");
          activateScanner(); // Wake up scanner & reset idle timer
          e.preventDefault();
        }
        barcodeBuffer = "";
        return;
      }
      if (e.key.length === 1) barcodeBuffer += e.key;
      lastKeyTime = currentTime;
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [searchInputRef, setSearchTerm, setIsScannerConnected]);

  return { pushToQueue, activateScanner };
};

// --- MAIN POS COMPONENT ---
export const POS: React.FC = () => {
  const { currentShop, cart, addToCart, updateCartItemQuantity } = useApp();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scanError, setScanError] = useState<string | null>(null);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isScannerConnected, setIsScannerConnected] = useState(false);

  const { pushToQueue, activateScanner } = useBarcodeScanner(
    products,
    cart,
    addToCart,
    updateCartItemQuantity,
    searchInputRef,
    setSearchTerm,
    setScanError,
    setIsScannerConnected,
  );

  // Note on Event System: Currently using window.dispatchEvent for simplicity across sibling modules.
  // In future large-scale refactors, we can migrate this global sync trigger to Zustand/Redux.
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    const handleRemoteRefresh = () => {
      if (currentShop) setProducts(db.products.getByShopId(currentShop.id));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("inventory-force-refresh", handleRemoteRefresh);

    searchInputRef.current?.focus();
    const handleFocusRecovery = () => {
      if (
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          document.activeElement?.tagName || "",
        )
      )
        searchInputRef.current?.focus();
    };
    window.addEventListener("click", handleFocusRecovery);

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

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))].sort(),
    [products],
  );
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        searchTerm === "" ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.barcode || "").includes(searchTerm);
      const matchesCategory =
        selectedCategory === null || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const simulateScan = () => {
    activateScanner(); // Keep scanner awake during simulation
    if (products.length > 0)
      pushToQueue(
        products[Math.floor(Math.random() * products.length)].barcode,
      );
    else pushToQueue("12345678");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="bg-gray-900 text-xs text-gray-300 px-4 py-1.5 flex justify-between items-center rounded-t-xl mx-0 mb-2 shadow-inner">
        <div className="flex items-center gap-4">
          <span
            className={`flex items-center gap-1.5 px-2 ${isOnline ? "text-green-400" : "text-red-400"}`}
          >
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isOnline ? "Online (Real-time Sync)" : "Offline Mode (Local DB)"}
          </span>

          <span
            className={`flex items-center gap-1.5 px-2 transition-colors duration-500 ${isScannerConnected ? "text-blue-400" : "text-gray-600"}`}
          >
            <Keyboard size={14} />{" "}
            {isScannerConnected ? "Scanner Active" : "Scanner Idle"}
          </span>
        </div>
        <button
          onClick={simulateScan}
          className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 text-gray-100 px-2 py-0.5 rounded border border-gray-700 transition-colors"
        >
          <MonitorPlay size={12} /> Simulate Scan
        </button>
      </div>

      <div className="flex flex-col md:flex-row flex-1 gap-4 pb-2 relative">
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
          <div className="p-4 border-b border-gray-100 space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Search size={20} />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                className="w-full h-12 pl-10 pr-10 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ecff76] focus:border-[#ecff76] text-base transition-all"
                placeholder="Search by name or scan barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchTerm) {
                    pushToQueue(searchTerm.trim());
                    setSearchTerm("");
                    activateScanner();
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
