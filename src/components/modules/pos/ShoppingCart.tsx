import React, { useState, useMemo } from "react";
import { Button } from "../../ui/Button";
import {
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  QrCode,
  Search,
  CheckCircle2,
  ArrowRight,
  ShoppingCart as CartIcon,
  X,
  User
} from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { db } from "../../../lib/db";

type PaymentMethod = "card" | "cash" | "mobile";

export const ShoppingCart: React.FC = () => {
  const {
    cart,
    clearCart,
    updateCartItemQuantity,
    cartTotal, // This is basically the Subtotal (Sum of Items)
    currentShop,
  } = useApp();

  const [viewState, setViewState] = useState<'cart' | 'checkout' | 'success'>('cart');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("cash");
  const [saving, setSaving] = useState(false);

  // States for Tax and Discount
  const [taxRate, setTaxRate] = useState<number>(0); // Percentage
  const [discount, setDiscount] = useState<number>(0); // Fixed Amount

  // Customer & Form States
  const [searchPhone, setSearchPhone] = useState("");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ name: "", email: "", phone: "" });
  const [cashReceived, setCashReceived] = useState("");

  // --- Calculations ---
  const taxAmount = useMemo(() => {
    return cartTotal * (taxRate / 100);
  }, [cartTotal, taxRate]);

  const finalTotal = useMemo(() => {
    // Total = Subtotal + Tax - Discount
    const total = cartTotal + taxAmount - discount;
    return Math.max(0, total); // Prevent negative total
  }, [cartTotal, taxAmount, discount]);

  const changeAmount = useMemo(() => {
    const received = parseFloat(cashReceived) || 0;
    return Math.max(0, received - finalTotal);
  }, [cashReceived, finalTotal]);

  const isInsufficientPayment = useMemo(() => {
      if (selectedPaymentMethod !== 'cash') return false;
      const received = parseFloat(cashReceived) || 0;
      // Use a small epsilon for float comparison safety
      return received < (finalTotal - 0.01);
  }, [selectedPaymentMethod, cashReceived, finalTotal]);


  // Quick Customer Lookup
  const handleCustomerCheck = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchPhone.trim() || !currentShop) return;

    // Fast local lookup in cache
    const customers = db.customers.getByShopId(currentShop.id);
    const existing = customers.find(c => c.phone === searchPhone.trim());

    if (existing) {
      setCustomerInfo({
        name: existing.name || '',
        email: existing.email || '',
        phone: existing.phone || ''
      });
    } else {
      // Not found -> Open Register Popup
      setCustomerInfo({ name: "", email: "", phone: searchPhone });
      setShowRegisterModal(true);
    }
  };

  const handleRegisterSave = (e: React.FormEvent) => {
    e.preventDefault();
    setShowRegisterModal(false);
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || !currentShop || saving || isInsufficientPayment) return;
    setSaving(true);

    try {
      const newSale = {
        shopId: currentShop.id,
        customerInfo: (customerInfo.name || customerInfo.email) ? customerInfo : undefined,
        items: [...cart],
        subtotal: cartTotal,
        tax: taxAmount,
        discount: discount,
        total: finalTotal,
        paymentMethod: selectedPaymentMethod,
        timestamp: new Date().toISOString(),
      };

      await db.sales.create(newSale);
      
      setViewState('success');
      setTimeout(() => {
         clearCart();
         setViewState('cart');
         setCashReceived("");
         setCustomerInfo({ name: "", email: "", phone: "" });
         setSearchPhone("");
         setTaxRate(0);
         setDiscount(0);
         setSaving(false);
      }, 2000);

    } catch (error) {
      console.error("Checkout failed:", error);
      alert("Transaction failed");
      setSaving(false);
    }
  };

  if (viewState === 'success') {
    return (
        <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
            <div className="w-20 h-20 bg-[#ecff76] text-gray-900 rounded-full flex items-center justify-center mb-4 shadow-sm">
                <CheckCircle2 size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-500 mb-6">Total Paid: ${finalTotal.toFixed(2)}</p>
            <p className="text-sm text-gray-400">Redirecting to new order...</p>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      
      {/* --- Registration Modal (Popup) --- */}
      {showRegisterModal && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-lg">New Customer</h3>
                 <button onClick={() => setShowRegisterModal(false)} className="text-gray-400 hover:text-black">
                    <X size={20} />
                 </button>
              </div>
              <form onSubmit={handleRegisterSave} className="space-y-3">
                 <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                    <input 
                      value={customerInfo.phone} 
                      onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 font-medium bg-gray-50 focus:border-[#ecff76] focus:ring-[#ecff76] outline-none"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
                    <input 
                      autoFocus
                      required
                      value={customerInfo.name} 
                      onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})}
                      placeholder="Enter name"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-[#ecff76] focus:ring-1 focus:ring-[#ecff76]"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Email (Optional)</label>
                    <input 
                      type="email"
                      value={customerInfo.email} 
                      onChange={e => setCustomerInfo({...customerInfo, email: e.target.value})}
                      placeholder="Enter email"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-[#ecff76] focus:ring-1 focus:ring-[#ecff76]"
                    />
                 </div>
                 <div className="pt-2">
                    <Button fullWidth type="submit" className="bg-[#ecff76] hover:bg-[#d9ec60] text-gray-900 font-bold border-none">
                       Register & Attach
                    </Button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white z-10">
        <div className="flex items-center gap-2">
            <h2 className="font-bold text-lg text-gray-900">Current Order</h2>
            <span className="bg-[#ecff76] text-gray-900 text-xs px-2 py-0.5 rounded-full font-bold">{cart.length}</span>
        </div>
        {cart.length > 0 && (
             <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-700 hover:underline flex items-center gap-1">
                 <Trash2 size={12} /> Clear
             </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length > 0 ? (
          cart.map((item) => (
            <div key={item.id} className="group flex justify-between items-start gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                     <span className="font-medium text-gray-800 text-sm">{item.name}</span>
                     <span className="font-bold text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">@ ${item.price.toFixed(2)}</span>
                    <div className="flex items-center gap-3 bg-gray-50 rounded px-2 py-1">
                        <button 
                            onClick={() => updateCartItemQuantity(item.id, Math.max(0, item.quantity - 1))}
                            className="text-gray-400 hover:text-black transition-colors"
                        >
                            <Minus size={14} />
                        </button>
                        <span className="text-xs font-bold min-w-[16px] text-center">{item.quantity}</span>
                        <button 
                            onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                            className="text-gray-400 hover:text-black transition-colors"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-3">
             <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                <CartIcon size={24} className="opacity-50" />
             </div>
             <p className="text-sm">Cart is empty</p>
          </div>
        )}
      </div>

      {/* Footer Section: Customer & Checkout */}
      <div className="border-t border-gray-100 bg-gray-50 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        
        {/* --- FAST CUSTOMER LOOKUP --- */}
        <div className="mb-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
           {customerInfo.name ? (
              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                     <div className="w-8 h-8 bg-[#ecff76] text-gray-900 rounded-full flex items-center justify-center">
                        <User size={14} />
                     </div>
                     <div>
                        <p className="text-xs font-bold text-gray-900">{customerInfo.name}</p>
                        <p className="text-[10px] text-gray-500">{customerInfo.phone}</p>
                     </div>
                  </div>
                  <button 
                    onClick={() => {
                        setCustomerInfo({name: "", email: "", phone: ""});
                        setSearchPhone("");
                    }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Change
                  </button>
              </div>
           ) : (
              <form onSubmit={handleCustomerCheck} className="flex gap-2">
                 <input 
                    type="tel" 
                    placeholder="Enter Mobile Number"
                    value={searchPhone}
                    onChange={(e) => setSearchPhone(e.target.value)}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#ecff76] focus:ring-1 focus:ring-[#ecff76] transition-all"
                 />
                 <button 
                    type="submit"
                    className="bg-[#ecff76] text-gray-900 px-3 py-2 rounded-lg hover:brightness-95 transition-colors font-medium"
                 >
                    <Search size={16} />
                 </button>
              </form>
           )}
        </div>

        {viewState === 'cart' ? (
           <div className="space-y-3">
              {/* --- TAX & DISCOUNT SECTION (Small Text) --- */}
              <div className="space-y-1 mb-2 border-b border-dashed border-gray-200 pb-2">
                <div className="flex justify-between text-xs text-gray-500">
                    <span>Subtotal</span>
                    <span>${cartTotal.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Tax (%)</span>
                    <div className="flex items-center gap-1">
                        <input 
                        type="number" 
                        min="0"
                        value={taxRate} 
                        onChange={e => setTaxRate(Number(e.target.value))}
                        className="w-10 text-right border border-gray-200 rounded p-0.5 outline-none focus:border-black text-[10px]" 
                        placeholder="0"
                        />
                        <span className="min-w-[40px] text-right text-gray-700">${taxAmount.toFixed(2)}</span>
                    </div>
                </div>

                <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Discount ($)</span>
                    <input 
                        type="number" 
                        min="0"
                        value={discount} 
                        onChange={e => setDiscount(Number(e.target.value))}
                        className="w-16 text-right border border-gray-200 rounded p-0.5 outline-none focus:border-black text-[10px] text-gray-700" 
                        placeholder="0.00"
                    />
                </div>
              </div>

              {/* Total Display */}
              <div className="flex justify-between items-end">
                  <span className="text-gray-500 text-sm">Total Amount</span>
                  <span className="text-3xl font-black tracking-tight text-gray-900">${finalTotal.toFixed(2)}</span>
              </div>

              <Button 
                onClick={() => setViewState('checkout')} 
                fullWidth 
                className="h-12 text-base font-bold bg-[#ecff76] text-gray-900 hover:bg-[#d9ec60] border-none"
                disabled={cart.length === 0}
              >
                 Pay Now
              </Button>
           </div>
        ) : (
           <div className="space-y-4 animate-in slide-in-from-bottom-5">
              
              {/* Payment Methods */}
              <div className="grid grid-cols-3 gap-2">
                 {[
                    { id: 'cash', icon: Banknote, label: 'Cash' },
                    { id: 'card', icon: CreditCard, label: 'Card' },
                    { id: 'mobile', icon: QrCode, label: 'QR' },
                 ].map((m) => (
                    <button
                        key={m.id}
                        onClick={() => setSelectedPaymentMethod(m.id as PaymentMethod)}
                        className={`flex flex-col items-center justify-center py-2 rounded-lg border transition-all ${
                            selectedPaymentMethod === m.id
                            ? 'bg-[#ecff76] text-gray-900 border-[#dcefa8] shadow-md font-bold'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        <m.icon size={20} className="mb-1" />
                        <span className="text-xs">{m.label}</span>
                    </button>
                 ))}
              </div>

              {/* Dynamic Inputs */}
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                  {selectedPaymentMethod === 'cash' && (
                      <div className="space-y-3">
                          <div className="flex justify-between text-sm mb-1">
                              <span>Total Due:</span>
                              <span className="font-bold">${finalTotal.toFixed(2)}</span>
                          </div>
                          <div>
                              <input 
                                  type="number" 
                                  autoFocus
                                  placeholder="Amount Received"
                                  className="w-full text-right text-lg font-bold p-2 border-b-2 border-gray-200 focus:border-[#ecff76] outline-none"
                                  value={cashReceived}
                                  onChange={e => setCashReceived(e.target.value)}
                              />
                          </div>
                          <div className="flex justify-between items-center pt-2">
                              <span className="text-sm text-gray-500">Change:</span>
                              <span className={`text-xl font-bold ${changeAmount < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                  ${changeAmount.toFixed(2)}
                              </span>
                          </div>
                      </div>
                  )}

                  {selectedPaymentMethod === 'card' && (
                      <div className="text-center py-2 text-gray-500 text-sm">
                          Use attached terminal to swipe card...
                      </div>
                  )}
                  
                  {selectedPaymentMethod === 'mobile' && (
                      <div className="flex justify-center py-2">
                          <div className="w-24 h-24 bg-gray-900 rounded-lg flex items-center justify-center text-white">
                              <QrCode size={40} />
                          </div>
                      </div>
                  )}
              </div>

              <div className="flex gap-2">
                 <button 
                    onClick={() => setViewState('cart')}
                    className="flex-1 py-3 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                 >
                    Cancel
                 </button>
                 <button 
                    onClick={handleCheckout}
                    disabled={saving || isInsufficientPayment}
                    className="flex-[2] py-3 text-sm font-bold text-gray-900 bg-[#ecff76] rounded-lg hover:bg-[#d9ec60] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                 >
                    {saving ? 'Processing...' : 'Complete Sale'}
                    {!saving && <ArrowRight size={16} />}
                 </button>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};