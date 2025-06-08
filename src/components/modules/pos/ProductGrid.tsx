import React, { useState } from 'react';
import { Product } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { ShoppingCart, Plus, Minus } from 'lucide-react';
import { LayoutGrid, List } from 'lucide-react';


interface ProductGridProps {
  products: Product[];
}

export const ProductGrid: React.FC<ProductGridProps> = ({ products }) => {
  const { addToCart, cart, updateCartItemQuantity } = useApp();
  const [viewMode, setViewMode] = useState<'grid' | 'row'>('row');

  const handleAddToCart = (product: Product) => {
    addToCart({ ...product, quantity: 1 });
  };

  const getItemQuantityInCart = (productId: string): number => {
    const item = cart.find(item => item.id === productId);
    return item ? item.quantity : 0;
  };

  const handleUpdateQuantity = (product: Product, change: number) => {
    const currentQuantity = getItemQuantityInCart(product.id);
    const newQuantity = Math.max(0, currentQuantity + change);

    if (newQuantity === 0) {
      updateCartItemQuantity(product.id, 0);
    } else if (currentQuantity === 0 && change > 0) {
      addToCart({ ...product, quantity: newQuantity });
    } else {
      updateCartItemQuantity(product.id, newQuantity);
    }
  };

  return (
    <>
      {/* Toggle View Button */}
      <div className="flex justify-end mb-4">
      <button
        onClick={() => setViewMode(viewMode === 'row' ? 'grid' : 'row')}
        className="p-3 rounded-full border border-gray-200 bg-white hover:bg-gray-100 shadow transition-all"
        title={viewMode === 'row' ? 'Switch to Grid View' : 'Switch to List View'}
      >
        {viewMode === 'row' ? (
          <LayoutGrid size={22} className="text-gray-700" />
        ) : (
          <List size={22} className="text-gray-700" />
        )}
      </button>
    </div>

      {/* Product Cards */}
      <div
        className={`${
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            : 'flex flex-col'
        } gap-4 h-full overflow-y-auto`}
      >
        {products.length > 0 ? (
          products.map((product) => {
            const quantityInCart = getItemQuantityInCart(product.id);

            return (
              <div
                key={product.id}
                className={`bg-white rounded-xl shadow-sm border border-gray-100 transition-all hover:shadow-md ${
                  viewMode === 'grid' ? '' : 'flex items-center gap-4 p-4'
                }`}
              >
                {/* Product Image */}
                <div
                  className={`${
                    viewMode === 'grid' ? 'h-40' : 'w-20 h-20'
                  } bg-gray-100 relative overflow-hidden rounded-lg flex-shrink-0`}
                >
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                      No Image
                    </div>
                  )}
                  {viewMode === 'grid' && (
                    <div className="absolute top-2 right-2 bg-[#ECFF76] px-2 py-1 rounded text-xs font-medium">
                      ${product.price.toFixed(2)}
                    </div>
                  )}
                </div>

                {/* Info + Controls */}
                <div className={`p-4 ${viewMode === 'grid' ? '' : 'flex-1'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-800 text-sm mb-1">{product.name}</h3>
                      <p className="text-xs text-gray-500 mb-2">
                        {product.category} • Stock: {product.stock}
                      </p>
                    </div>
                    {viewMode === 'row' && (
                      <div className="bg-[#ECFF76] text-xs font-medium px-2 py-1 rounded text-gray-800">
                        ${product.price.toFixed(2)}
                      </div>
                    )}
                  </div>

                  {/* Add to Cart or Quantity Controls */}
                  {quantityInCart === 0 ? (
                    <button
                    onClick={() => handleAddToCart(product)}
                    disabled={product.stock === 0}
                    title="Add to Cart"
                    className={`${
                      viewMode === 'grid'
                        ? 'w-full py-2 text-sm rounded-lg'
                        : 'px-14 py-2 text-sm rounded-full mx-auto'
                    } flex items-center justify-center gap-2 transition-colors ${
                      product.stock === 0
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-[#ECFF76] text-gray-800 hover:bg-[#D6E85C]'
                    }`}
                  >
                    <ShoppingCart size={viewMode === 'grid' ? 16 : 16} />
                    {viewMode === 'grid' ? 'Add to Cart' : 'Add'}
                  </button>

                  ) : (
                    <div className={`flex items-center ${viewMode === 'grid' ? 'gap-3 mt-1' : 'gap-2 mt-0'}`}>
                      <button
                        onClick={() => handleUpdateQuantity(product, -1)}
                        className={`${
                          viewMode === 'grid' ? 'w-8 h-8' : 'w-7 h-7'
                        } rounded bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200`}
                      >
                        <Minus size={viewMode === 'grid' ? 14 : 12} />
                      </button>
                      <span
                        className={`font-medium text-gray-800 ${
                          viewMode === 'grid' ? 'text-sm' : 'text-xs'
                        }`}
                      >
                        {quantityInCart}
                      </span>
                      <button
                        onClick={() => handleUpdateQuantity(product, 1)}
                        disabled={product.stock <= quantityInCart}
                        className={`${
                          viewMode === 'grid' ? 'w-8 h-8' : 'w-7 h-7'
                        } rounded flex items-center justify-center transition-colors ${
                          product.stock <= quantityInCart
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-[#ECFF76] text-gray-800 hover:bg-[#D6E85C]'
                        }`}
                      >
                        <Plus size={viewMode === 'grid' ? 14 : 12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full flex items-center justify-center h-64 bg-white rounded-xl border border-gray-100">
            <div className="text-center">
              <p className="text-gray-500 mb-2">No products found</p>
              <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
