import React, { useState, useMemo, memo } from "react";
import { Product } from "../../../types";
import { useApp } from "../../../context/AppContext";
import { Plus, Minus, LayoutGrid, List, Package } from "lucide-react";

const ProductCard = memo(
  ({
    product,
    quantityInCart,
    viewMode,
    currencySymbol,
    onAdd,
    onUpdate,
  }: {
    product: Product;
    quantityInCart: number;
    viewMode: "grid" | "row";
    currencySymbol: string;
    onAdd: (p: Product) => void;
    onUpdate: (p: Product, change: number) => void;
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
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:border-[#ecff76]/50 transition-all flex items-center gap-3">
          <div className="h-14 w-14 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <Package size={20} />
              </div>
            )}
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
                className="mt-1 h-8 px-4 bg-[#ecff76] text-gray-900 text-xs font-bold rounded hover:brightness-95 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
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
      <div className="group bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-[#ecff76] transition-all flex flex-col h-full overflow-hidden relative">
        <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <Package size={32} />
            </div>
          )}
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-sm font-bold shadow-sm border border-gray-100">
            {currencySymbol}
            {product.price.toFixed(2)}
          </div>
          {quantityInCart > 0 && (
            <div className="absolute top-2 left-2 bg-[#ecff76] text-gray-900 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md">
              {quantityInCart}
            </div>
          )}
        </div>
        <div className="p-3 flex flex-col flex-1">
          <h3 className="font-semibold text-gray-800 text-sm leading-tight mb-1 line-clamp-2">
            {product.name}
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            {available} available
          </p>
          <div className="mt-auto">
            {quantityInCart === 0 ? (
              <button
                onClick={() => onAdd(product)}
                disabled={isOutOfStock}
                className="w-full h-9 flex items-center justify-center bg-gray-100 text-gray-800 text-sm font-medium rounded-lg hover:bg-[#ecff76] hover:text-gray-900 disabled:bg-gray-50 disabled:text-gray-300 transition-all active:scale-95"
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
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-black" : "text-gray-400 hover:text-gray-600"}`}
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => setViewMode("row")}
            className={`p-1.5 rounded-md transition-all ${viewMode === "row" ? "bg-white shadow-sm text-black" : "text-gray-400 hover:text-gray-600"}`}
          >
            <List size={18} />
          </button>
        </div>
      </div>
      {products.length > 0 ? (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-20"
              : "flex flex-col gap-2 pb-20"
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
