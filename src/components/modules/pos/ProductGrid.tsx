import React from 'react';
import { Product } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { ShoppingCart, Plus, Minus } from 'lucide-react';

interface ProductGridProps {
  products: Product[];
}

export const ProductGrid: React.FC<ProductGridProps> = ({ products }) => {
  const { addToCart, cart, updateCartItemQuantity } = useApp();
  
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
      // If quantity becomes 0, product will be removed from cart
      updateCartItemQuantity(product.id, 0);
    } else if (currentQuantity === 0 && change > 0) {
      // If product isn't in cart yet, add it
      addToCart({ ...product, quantity: newQuantity });
    } else {
      // Otherwise just update the quantity
      updateCartItemQuantity(product.id, newQuantity);
    }
  };
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 h-full overflow-y-auto">
      {products.length > 0 ? (
        products.map((product) => {
          const quantityInCart = getItemQuantityInCart(product.id);
          
          return (
            <div 
              key={product.id}
              className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 transition-all hover:shadow-md"
            >
              {/* Product Image */}
              <div className="h-40 bg-gray-100 relative overflow-hidden">
                {product.imageUrl ? (
                  <img 
                    src={product.imageUrl} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No Image
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-[#ECFF76] px-2 py-1 rounded text-xs font-medium">
                  ${product.price.toFixed(2)}
                </div>
              </div>
              
              {/* Product Info */}
              <div className="p-4">
                <h3 className="font-medium text-gray-800 mb-1">{product.name}</h3>
                <p className="text-xs text-gray-500 mb-3">
                  {product.category} • Stock: {product.stock}
                </p>
                
                {/* Add to Cart Button or Quantity Controls */}
                {quantityInCart === 0 ? (
                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={product.stock === 0}
                    className={`w-full py-2 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                      product.stock === 0
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-[#ECFF76] text-gray-800 hover:bg-[#D6E85C]'
                    }`}
                  >
                    <ShoppingCart size={16} className="mr-2" />
                    Add to Cart
                  </button>
                ) : (
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleUpdateQuantity(product, -1)}
                      className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="font-medium text-gray-800">{quantityInCart}</span>
                    <button
                      onClick={() => handleUpdateQuantity(product, 1)}
                      disabled={product.stock <= quantityInCart}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                        product.stock <= quantityInCart
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-[#ECFF76] text-gray-800 hover:bg-[#D6E85C]'
                      }`}
                    >
                      <Plus size={16} />
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
  );
};