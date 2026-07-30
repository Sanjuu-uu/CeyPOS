import React, { useEffect, useMemo, useState, memo } from "react";
import { Product } from "../../../types";
import { useApp } from "../../../context/AppContext";
import {
  Plus,
  Minus,
  LayoutGrid,
  List,
  Package,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

const PRODUCT_CARD_WIDTHS = [120, 140, 165, 195] as const;
const DEFAULT_PRODUCT_ZOOM = 1;

const normalizeImageUrl = (value?: string): string | null => {
  if (!value) return null;
  let url = value.trim().replace(/^['"]|['"]$/g, "");
  if (!url) return null;

  url = url.replace(/\\/g, "/");

  const driveMatch =
    url.match(/drive\.google\.com\/file\/d\/([^/]+)/i) ||
    url.match(/drive\.google\.com\/open\?id=([^&]+)/i);
  if (driveMatch?.[1]) {
    return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(driveMatch[1])}`;
  }

  if (/dropbox\.com/i.test(url)) {
    url = url.replace("www.dropbox.com", "dl.dropboxusercontent.com");
    url = url.replace(/[?&]dl=0/i, "");
  }

  if (url.startsWith("//")) return `https:${encodeURI(url)}`;
  if (/^(data:image\/|blob:|https?:\/\/|\/)/i.test(url)) return encodeURI(url);
  if (/^(localhost|127\.0\.0\.1)(:\d+)?\//i.test(url)) return `http://${encodeURI(url)}`;
  if (/^[\w.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(url)) return `https://${encodeURI(url)}`;

  return encodeURI(url);
};

const ProductImageFallback: React.FC<{
  compact: boolean;
  hasBrokenUrl: boolean;
  mode: "grid" | "row";
}> = ({ compact, hasBrokenUrl, mode }) => {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-white text-gray-300">
      <div
        className={`flex items-center justify-center rounded-2xl border border-gray-100 bg-white ${
          compact ? "h-9 w-9" : "h-12 w-12"
        }`}
      >
        <Package
          size={compact ? 22 : 30}
          strokeWidth={1.8}
          className="text-gray-300"
        />
      </div>
      {hasBrokenUrl && mode === "grid" && (
        <span className={`rounded-full bg-gray-50 px-2 py-0.5 font-semibold text-gray-400 ${
          compact ? "max-w-[92%] truncate text-[9px]" : "text-[10px]"
        }`}>
          Try another image URL
        </span>
      )}
    </div>
  );
};

const ProductImage: React.FC<{ product: Product; compact: boolean; mode: "grid" | "row" }> = ({
  product,
  compact,
  mode,
}) => {
  const imageUrl = useMemo(() => normalizeImageUrl(product.imageUrl), [product.imageUrl]);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [imageUrl]);

  if (!imageUrl || hasError) {
    return (
      <ProductImageFallback
        compact={compact || mode === "row"}
        hasBrokenUrl={Boolean(imageUrl && hasError)}
        mode={mode}
      />
    );
  }

  return (
    <img
      src={imageUrl}
      alt={product.name}
      className={`h-full w-full object-contain ${compact ? "p-1" : "p-2"} transition-transform group-hover:scale-[1.03]`}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
    />
  );
};

const ProductCard = memo(
  ({
    product,
    quantityInCart,
    viewMode,
    currencySymbol,
    onAdd,
    onUpdate,
    compact,
  }: {
    product: Product;
    quantityInCart: number;
    viewMode: "grid" | "row";
    currencySymbol: string;
    onAdd: (p: Product) => void;
    onUpdate: (p: Product, change: number) => void;
    compact: boolean;
  }) => {
    // availableStock = real stock minus what's held across ALL terminals' carts
    // (including this one). Fall back to stock when reservation data isn't
    // loaded yet. Since this terminal's own cart is already subtracted, both the
    // "Add" and "+" buttons stop exactly when nothing is left.
    const available = product.availableStock ?? product.stock;
    const isOutOfStock = available <= 0;
    const isMaxStock = available <= 0;

    if (viewMode === "row") {
      return (
        <div className="bg-white rounded-xl p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)] border border-[#e4e4e0] hover:border-[#c5f542]/70 transition-all flex items-center gap-3">
          <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-md border border-gray-100 bg-white">
            <ProductImage product={product} compact mode="row" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-800 text-sm truncate">
              {product.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                {available} in stock
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-gray-900">
              {currencySymbol}
              {product.price.toFixed(2)}
            </div>
            {quantityInCart === 0 ? (
              <button
                onClick={() => onAdd(product)}
                disabled={isOutOfStock}
                className="mt-1 h-8 px-4 bg-[#ecff76] text-gray-900 text-xs font-bold rounded hover:bg-[#c5f542] disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
              >
                Add
              </button>
            ) : (
              <div className="flex items-center gap-2 mt-1 bg-gray-100 rounded p-0.5">
                <button
                  onClick={() => onUpdate(product, -1)}
                  className="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm hover:bg-gray-50"
                >
                  <Minus size={12} />
                </button>
                <span className="w-4 text-center text-xs font-bold">
                  {quantityInCart}
                </span>
                <button
                  onClick={() => onUpdate(product, 1)}
                  disabled={isMaxStock}
                  className="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  <Plus size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="group bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] border border-[#e4e4e0] hover:shadow-md hover:border-[#c5f542] transition-all flex flex-col h-full overflow-hidden relative">
        <div className="aspect-[4/3] bg-white relative overflow-hidden border-b border-gray-100">
          <ProductImage product={product} compact={compact} mode="grid" />
            <div
              className={`absolute bg-white/90 backdrop-blur-sm rounded-md font-bold shadow-sm border border-gray-100 ${
                compact ? "top-1.5 right-1.5 px-1.5 py-0.5 text-xs" : "top-2 right-2 px-2 py-1 text-sm"
              }`}
            >
            {currencySymbol}
            {product.price.toFixed(2)}
          </div>
          {quantityInCart > 0 && (
            <div className="absolute top-2 left-2 bg-[#ecff76] text-gray-900 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md">
              {quantityInCart}
            </div>
          )}
        </div>
        <div className={`${compact ? "p-2" : "p-3"} flex flex-col flex-1`}>
          <h3
            className={`font-semibold text-gray-800 leading-tight mb-1 line-clamp-2 ${
              compact ? "text-xs" : "text-sm"
            }`}
          >
            {product.name}
          </h3>
          <p className={`text-gray-500 ${compact ? "text-[10px] mb-2" : "text-xs mb-3"}`}>
            {available} available
          </p>
          <div className="mt-auto">
            {quantityInCart === 0 ? (
              <button
                onClick={() => onAdd(product)}
                disabled={isOutOfStock}
                className={`w-full flex items-center justify-center bg-gray-100 text-gray-800 font-medium rounded-lg hover:bg-[#c5f542] hover:text-gray-900 disabled:bg-gray-50 disabled:text-gray-300 transition-all active:scale-95 ${
                  compact ? "h-8 text-xs" : "h-9 text-sm"
                }`}
              >
                {isOutOfStock ? "Out of Stock" : "Add to Cart"}
              </button>
            ) : (
              <div className="flex items-center justify-between bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => onUpdate(product, -1)}
                  className="w-8 h-7 flex items-center justify-center bg-white rounded shadow-sm hover:bg-gray-50 active:scale-95 transition-transform"
                >
                  <Minus size={14} />
                </button>
                <span className="font-bold text-sm text-gray-900">
                  {quantityInCart}
                </span>
                <button
                  onClick={() => onUpdate(product, 1)}
                  disabled={isMaxStock}
                  className="w-8 h-7 flex items-center justify-center bg-white rounded shadow-sm hover:bg-gray-50 disabled:opacity-50 active:scale-95 transition-transform"
                >
                  <Plus size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);

ProductCard.displayName = "ProductCard";

export const ProductGrid: React.FC<{ products: Product[] }> = ({
  products,
}) => {
  // Extract currentShop from useApp
  const { addToCart, cart, updateCartItemQuantity, currentShop } = useApp();
  const [viewMode, setViewMode] = useState<"grid" | "row">("grid");
  const [productZoom, setProductZoom] = useState(DEFAULT_PRODUCT_ZOOM);
  const cardWidth = PRODUCT_CARD_WIDTHS[productZoom];
  const isCompact = productZoom <= 1;

  // Determine the currency symbol, defaulting to "$"
  const currencySymbol = currentShop?.currency ?? "$";

  const cartMap = useMemo(
    () => Object.fromEntries(cart.map((item) => [item.id, item.quantity])),
    [cart],
  );

  const handleAddToCart = (product: Product) =>
    addToCart({ ...product, quantity: 1 });
  const handleUpdateQuantity = (product: Product, change: number) => {
    const newQuantity = Math.max(0, (cartMap[product.id] || 0) + change);
    if (newQuantity === 0) updateCartItemQuantity(product.id, 0);
    else if ((cartMap[product.id] || 0) === 0 && change > 0)
      addToCart({ ...product, quantity: newQuantity });
    else updateCartItemQuantity(product.id, newQuantity);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 px-1">
        <span className="text-sm text-gray-500 font-medium">
          {products.length} Products Found
        </span>
        <div className="flex items-center gap-2">
          {viewMode === "grid" && (
            <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
              <button
                type="button"
                onClick={() => setProductZoom((zoom) => Math.max(0, zoom - 1))}
                disabled={productZoom === 0}
                aria-label="Zoom products out"
                title="Show smaller products"
                className="p-1.5 rounded-md text-gray-600 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                <ZoomOut size={18} />
              </button>
              <button
                type="button"
                onClick={() =>
                  setProductZoom((zoom) =>
                    Math.min(PRODUCT_CARD_WIDTHS.length - 1, zoom + 1),
                  )
                }
                disabled={productZoom === PRODUCT_CARD_WIDTHS.length - 1}
                aria-label="Zoom products in"
                title="Show larger products"
                className="p-1.5 rounded-md text-gray-600 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                <ZoomIn size={18} />
              </button>
            </div>
          )}
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
              className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-black" : "text-gray-400 hover:text-gray-600"}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("row")}
              aria-label="List view"
              className={`p-1.5 rounded-md transition-all ${viewMode === "row" ? "bg-white shadow-sm text-black" : "text-gray-400 hover:text-gray-600"}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>
      {products.length > 0 ? (
        <div
          className={
            viewMode === "grid"
              ? "grid justify-center content-start gap-3 pb-20"
              : "flex flex-col gap-2 pb-20"
          }
          style={
            viewMode === "grid"
              ? {
                  gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${cardWidth}px), ${cardWidth}px))`,
                }
              : undefined
          }
        >
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              quantityInCart={cartMap[product.id] || 0}
              viewMode={viewMode}
              currencySymbol={currencySymbol} // Passed down here
              onAdd={handleAddToCart}
              onUpdate={handleUpdateQuantity}
              compact={isCompact}
            />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 pb-20">
          <div className="bg-gray-100 p-4 rounded-full mb-3">
            <Package size={40} className="opacity-50" />
          </div>
          <p className="font-medium">No products found</p>
          <p className="text-sm">Try searching for something else</p>
        </div>
      )}
    </div>
  );
};
