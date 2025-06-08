import React, { useState } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Trash2, Plus, Minus, CreditCard, X, ShoppingCart as ShoppingCartIcon } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { db } from '../../../lib/db';

export const ShoppingCart: React.FC = () => {
  const { 
    cart, 
    removeFromCart, 
    updateCartItemQuantity, 
    clearCart, 
    cartTotal,
    currentShop,
    setCurrentModule
  } = useApp();
  
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });
  
  const handleQuantityChange = (productId: string, change: number) => {
    const item = cart.find(item => item.id === productId);
    if (!item) return;
    
    const newQuantity = Math.max(1, item.quantity + change);
    updateCartItemQuantity(productId, newQuantity);
  };
  
  const handleCheckout = async () => {
  if (cart.length === 0 || !currentShop) return;

  const newSale = {
  shopId: currentShop.id,
  customerInfo: customerInfo.name || customerInfo.email || customerInfo.phone ? customerInfo : undefined,
  items: [...cart],
  total: cartTotal,
  paymentMethod: 'card' as const,
  timestamp: new Date().toISOString() // ✅ Add this line
};

  try {
    await db.sales.create(newSale); // ✅ FIXED
    clearCart();
    setCurrentModule('checkout');
  } catch (error) {
    console.error("Checkout failed:", error);
  }
};

  return (
    <Card 
      title="Shopping Cart" 
      className="h-full flex flex-col border border-gray-100"
    >
      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto">
        {cart.length > 0 ? (
          <div className="space-y-4">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {/* Product Image Thumbnail */}
                  <div className="h-12 w-12 bg-white rounded border border-gray-200 flex-shrink-0 overflow-hidden">
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                        No Image
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm text-gray-800">{item.name}</h4>
                    <p className="text-xs text-gray-500">${item.price.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {/* Quantity Controls */}
                  <div className="flex items-center">
                    <button
                      onClick={() => handleQuantityChange(item.id, -1)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="mx-1 w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(item.id, 1)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  
                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-300 mb-2">
                <ShoppingCartIcon size={48} />
              </div>
              <p className="text-gray-500">Your cart is empty</p>
              <p className="text-sm text-gray-400 mt-1">Add items from the product grid</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Cart Total */}
      <div className="mt-auto pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium">${cartTotal.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between mb-6">
          <span className="text-gray-600">Tax</span>
          <span className="font-medium">$0.00</span>
        </div>
        <div className="flex items-center justify-between text-lg mb-6">
          <span className="font-medium">Total</span>
          <span className="font-semibold">${cartTotal.toFixed(2)}</span>
        </div>
        
        {/* Customer Email Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer Email</label>
          <input
            type="email"
            value={customerInfo.email}
            onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
            placeholder="example@email.com"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring focus:border-blue-300"
          />
        </div>
        <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Customer Phone number</label>
        <input
          type="tel"
          value={customerInfo.phone}
          onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
          placeholder="07X-XXXXXXX"
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring focus:border-blue-300"
        />
      </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            variant="primary"
            fullWidth
            icon={<CreditCard size={16} />}
            disabled={cart.length === 0}
            onClick={handleCheckout}
          >
            Proceed to Checkout
          </Button>

          <Button
            variant="outline"
            fullWidth
            icon={<Trash2 size={16} />}
            disabled={cart.length === 0}
            onClick={clearCart}
          >
            Clear Cart
          </Button>
        </div>
      </div>
    </Card>
  );
};
