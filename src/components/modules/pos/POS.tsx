import React, { useState, useEffect, useMemo, useRef } from "react";
import { ProductGrid } from "./ProductGrid";
import { ShoppingCart } from "./ShoppingCart";
import { Search, X, ScanBarcode, AlertCircle } from "lucide-react";
import { db } from "../../../lib/db";
import { useApp } from "../../../context/AppContext";
import { Product, CartItem } from "../../../types";

type InventoryUpdatedPayload = {
  shopId?: string;
  items?: Product[];
};

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

// --- 1. ENTERPRISE BARCODE HOOK ---
const useBarcodeScanner = (
  products: Product[],
  cart: CartItem[],
  addToCart: (p: CartItem) => void,
  updateCartItemQuantity: (id: string, qty: number) => void,
  searchInputRef: React.RefObject<HTMLInputElement>,
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>,
  setScanError: React.Dispatch<React.SetStateAction<string | null>>, // <-- FIX: Accept error state setter
) => {
  const lastScanRef = useRef<number>(0);

  // Native Web Audio Beeps
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

  const handleScan = (scannedBarcode: string) => {
    if (!scannedBarcode || scannedBarcode.length < 8) return false;

    const now = Date.now();
    if (now - lastScanRef.current < 300) return false; // Debounce

    const matchedProduct = products.find((p) => p.barcode === scannedBarcode);
    if (matchedProduct) {
      lastScanRef.current = now;
      const existingItem = cart.find((item) => item.id === matchedProduct.id);
      if (existingItem) {
        updateCartItemQuantity(matchedProduct.id, existingItem.quantity + 1);
      } else {
        addToCart({ ...matchedProduct, quantity: 1 });
      }
      playBeep("success");
      return true;
    }

    // UI Error Handling (Replaces Alert)
    playBeep("error");
    setScanError(`Barcode not found: ${scannedBarcode}`);

    // Auto-clear popup after 3 seconds
    setTimeout(() => {
      setScanError(null);
    }, 3000);

    return false;
  };

  useEffect(() => {
    let barcodeBuffer = "";
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" &&
        document.activeElement !== searchInputRef.current
      ) {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) {
        barcodeBuffer = "";
      }

      if (e.key === "Enter") {
        if (barcodeBuffer.length >= 8) {
          const added = handleScan(barcodeBuffer.trim());
          if (added) {
            setSearchTerm("");
          }
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
  }, [
    products,
    cart,
    addToCart,
    updateCartItemQuantity,
    searchInputRef,
    setSearchTerm,
    setScanError,
  ]);

  return { handleScan };
};

// --- MAIN POS COMPONENT ---
export const POS: React.FC = () => {
  const { currentShop, cart, addToCart, updateCartItemQuantity } = useApp();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Custom Error Popup State
  const [scanError, setScanError] = useState<string | null>(null);

  const { handleScan } = useBarcodeScanner(
    products,
    cart,
    addToCart,
    updateCartItemQuantity,
    searchInputRef,
    setSearchTerm,
    setScanError,
  );

  // Focus Recovery
  useEffect(() => {
    searchInputRef.current?.focus();
    const handleFocusRecovery = () => {
      if (
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          document.activeElement?.tagName || "",
        )
      ) {
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("click", handleFocusRecovery);
    return () => window.removeEventListener("click", handleFocusRecovery);
  }, []);

  // Sync with DB
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

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-80px)] gap-4 pb-2 relative">
      {/* ERROR TOAST NOTIFICATION */}
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
                  if (handleScan(searchTerm.trim())) setSearchTerm("");
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
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === null
                  ? "bg-[#ecff76] text-gray-900 shadow-sm border border-[#dcefa8]"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All Items
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === category
                    ? "bg-[#ecff76] text-gray-900 shadow-sm border border-[#dcefa8]"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
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
  );
};