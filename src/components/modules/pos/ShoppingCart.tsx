import React, { useState, useMemo, useEffect } from "react";
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
  User,
  Tag,
  AlertCircle,
  Gift,
  Coins,
  Save
} from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { db, BusinessRules } from "../../../lib/db";
import { Customer } from "../../../types";

type PaymentMethod = "card" | "cash" | "mobile";

export const ShoppingCart: React.FC = () => {
  const {
    cart,
    clearCart,
    updateCartItemQuantity,
    cartTotal,
    currentShop,
  } = useApp();

  const currencySymbol = (currentShop as any)?.currency || '$';

  const [viewState, setViewState] = useState<'cart' | 'checkout' | 'success'>('cart');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("cash");
  const [saving, setSaving] = useState(false);

  // --- Business Rules State ---
  const [rules, setRules] = useState<BusinessRules | null>(null);
  const [selectedDiscountId, setSelectedDiscountId] = useState<number | null>(null);
  const [activeTaxIds, setActiveTaxIds] = useState<number[]>([]);

  // --- Customer State ---
  const [searchPhone, setSearchPhone] = useState("");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [newCustomerInfo, setNewCustomerInfo] = useState({ name: "", email: "", phone: "" });
  
  // --- Redemption & Change Logic ---
  const [redeemPointsInput, setRedeemPointsInput] = useState<string>(""); 
  const [convertChangeToPoints, setConvertChangeToPoints] = useState(false);
  const [saveChangeAmount, setSaveChangeAmount] = useState<string>(""); 
  const [cashReceived, setCashReceived] = useState<string>("");

  // Load Rules & Defaults
  useEffect(() => {
    // @ts-ignore
    const loadedRules = db.businessRules?.get();
    if (loadedRules) {
        setRules(loadedRules);
        const defaultTaxes = loadedRules.taxes
            .filter((t: any) => t.isDefault)
            .map((t: any) => t.id);
        setActiveTaxIds(defaultTaxes);
    }
  }, [currentShop]);

  // --- Calculations ---

  const discountAmount = useMemo(() => {
    if (!selectedDiscountId || !rules) return 0;
    const discount = rules.discounts.find(d => d.id === selectedDiscountId);
    if (!discount) return 0;
    
    if (discount.type === 'percent') {
        return cartTotal * (discount.value / 100);
    }
    return discount.value;
  }, [cartTotal, selectedDiscountId, rules]);

  const taxableAmount = Math.max(0, cartTotal - discountAmount);

  const taxAmount = useMemo(() => {
    if (!rules) return 0;
    return rules.taxes
        .filter(t => activeTaxIds.includes(t.id!))
        .reduce((sum, t) => sum + (taxableAmount * (t.rate / 100)), 0);
  }, [taxableAmount, activeTaxIds, rules]);

  const surchargeAmount = useMemo(() => {
    if (!rules || selectedPaymentMethod !== 'card') return 0;
    const applicable = rules.surcharges.find(s => taxableAmount >= s.minAmount);
    if (!applicable) return 0;

    if (applicable.type === 'percent') {
        return taxableAmount * (applicable.value / 100);
    }
    return applicable.value;
  }, [taxableAmount, selectedPaymentMethod, rules]);

  const potentialTotal = taxableAmount + taxAmount + surchargeAmount;
  
  // ✅ FIX 1: Allow decimals in Redemption
  const actualPointsRedeemed = useMemo(() => {
    if (!customer || !rules?.loyalty.enabled) return 0;
    
    const inputPoints = parseFloat(redeemPointsInput) || 0; // Allow float
    const balance = customer.pointsBalance || 0;
    const redeemRate = rules.loyalty.redeemRate || 0.01;
    
    // Exact points needed (decimals allowed)
    const maxNeeded = Number((potentialTotal / redeemRate).toFixed(2));
    
    // Min of: Input, Balance, or Amount needed to pay bill
    return Math.min(inputPoints, balance, maxNeeded);
  }, [customer, rules, redeemPointsInput, potentialTotal]);

  const redemptionValue = useMemo(() => {
    if (!actualPointsRedeemed || !rules) return 0;
    return actualPointsRedeemed * (rules.loyalty.redeemRate || 0.01);
  }, [actualPointsRedeemed, rules]);

  const finalTotal = Math.max(0, potentialTotal - redemptionValue);

  // ✅ FIX 2: Allow decimals in Points Earning
  const pointsToEarn = useMemo(() => {
    if (!rules?.loyalty.enabled) return 0;
    const earnRate = rules.loyalty.earnRate || 1;
    if (earnRate <= 0) return 0;
    // Removed Math.floor() -> toFixed(2) keeps decimals like 2.67
    return Number((finalTotal / earnRate).toFixed(2)); 
  }, [finalTotal, rules]);

  // --- Change Logic ---
  const rawChange = parseFloat(cashReceived) - finalTotal;
  const totalChangeAvailable = Math.max(0, rawChange);

  const amountToConvert = useMemo(() => {
    if (!convertChangeToPoints || totalChangeAvailable <= 0) return 0;
    const userAmount = parseFloat(saveChangeAmount);
    if (isNaN(userAmount)) return 0;
    return Math.min(userAmount, totalChangeAvailable);
  }, [convertChangeToPoints, saveChangeAmount, totalChangeAvailable]);

  // ✅ FIX 3: Allow decimals in Change Conversion
  const pointsFromChange = useMemo(() => {
    if (amountToConvert <= 0 || !rules?.loyalty.redeemRate) return 0;
    // Removed Math.floor() -> toFixed(2)
    return Number((amountToConvert / rules.loyalty.redeemRate).toFixed(2));
  }, [amountToConvert, rules]);

  const cashChangeToReturn = totalChangeAvailable - amountToConvert;

  const isInsufficientPayment = useMemo(() => {
      // Small tolerance for float math
      if (finalTotal <= 0.001) return false;
      if (selectedPaymentMethod !== 'cash') return false;
      const received = parseFloat(cashReceived) || 0;
      return received < (finalTotal - 0.01);
  }, [selectedPaymentMethod, cashReceived, finalTotal]);


  // --- Handlers ---

  const handleCustomerCheck = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchPhone.trim() || !currentShop) return;

    // @ts-ignore
    const customers = db.customers.getByShopId(currentShop.id);
    const existing = customers.find((c: Customer) => c.phone === searchPhone.trim());

    if (existing) {
      setCustomer(existing);
      setSearchPhone("");
      setRedeemPointsInput("");
    } else {
      setNewCustomerInfo({ name: "", email: "", phone: searchPhone });
      setShowRegisterModal(true);
    }
  };

  const handleRegisterSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const tempCustomer: Customer = {
        id: `temp_${Date.now()}`,
        shopId: currentShop?.id || "",
        ...newCustomerInfo,
        pointsBalance: 0,
        totalSpend: 0
    };
    setCustomer(tempCustomer);
    setShowRegisterModal(false);
  };

  const toggleSaveChange = (checked: boolean) => {
    setConvertChangeToPoints(checked);
    if (checked) {
        setSaveChangeAmount(totalChangeAvailable.toFixed(2)); // Pre-fill exact amount
    } else {
        setSaveChangeAmount("");
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || !currentShop || saving || isInsufficientPayment) return;
    setSaving(true);

    try {
      const newSale = {
        shopId: currentShop.id,
        customerInfo: customer ? {
            name: customer.name || "",
            email: customer.email || "",
            phone: customer.phone || ""
        } : undefined,
        items: [...cart],
        subtotal: cartTotal,
        tax: taxAmount,
        discount: discountAmount,
        total: finalTotal,
        // Sum earned points + change points (decimals preserved)
        pointsEarned: Number((pointsToEarn + pointsFromChange).toFixed(2)),
        pointsRedeemed: actualPointsRedeemed,
        paymentMethod: selectedPaymentMethod,
        timestamp: new Date().toISOString(),
      };

      // @ts-ignore
      await db.sales.create(newSale);
      
      setViewState('success');
      setTimeout(() => {
         clearCart();
         setViewState('cart');
         setCashReceived("");
         setCustomer(null);
         setSelectedDiscountId(null);
         setSearchPhone("");
         setRedeemPointsInput("");
         setConvertChangeToPoints(false);
         setSaveChangeAmount("");
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
            <p className="text-gray-500 mb-6">Total Paid: {currencySymbol}{finalTotal.toFixed(2)}</p>
            
            {rules?.loyalty.enabled && customer && (
                <div className="space-y-2 mb-6">
                    {(pointsToEarn > 0 || pointsFromChange > 0) && (
                        <div className="bg-gray-50 px-4 py-2 rounded-full text-sm font-medium text-gray-600 border border-gray-100">
                            <span className="font-bold text-black">+{Number((pointsToEarn + pointsFromChange).toFixed(2))} Points</span> added
                            {pointsFromChange > 0 && <div className="text-xs text-blue-600 mt-1">({currencySymbol}{parseFloat(saveChangeAmount || '0').toFixed(2)} change saved)</div>}
                        </div>
                    )}
                    {actualPointsRedeemed > 0 && (
                        <div className="text-xs text-red-500 font-medium">
                            -{actualPointsRedeemed} Points Redeemed
                        </div>
                    )}
                </div>
            )}
            
            <p className="text-sm text-gray-400 mt-2">Redirecting to new order...</p>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      
      {/* --- Register Modal --- */}
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
                 <input 
                    value={newCustomerInfo.phone} 
                    onChange={e => setNewCustomerInfo({...newCustomerInfo, phone: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 outline-none"
                    placeholder="Phone"
                 />
                 <input 
                    autoFocus
                    required
                    value={newCustomerInfo.name} 
                    onChange={e => setNewCustomerInfo({...newCustomerInfo, name: e.target.value})}
                    placeholder="Full Name"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-[#ecff76] focus:ring-1 focus:ring-[#ecff76]"
                 />
                 <input 
                    type="email"
                    value={newCustomerInfo.email} 
                    onChange={e => setNewCustomerInfo({...newCustomerInfo, email: e.target.value})}
                    placeholder="Email (Optional)"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-[#ecff76] focus:ring-1 focus:ring-[#ecff76]"
                 />
                 <Button fullWidth type="submit" className="bg-[#ecff76] hover:bg-[#d9ec60] text-gray-900 font-bold border-none mt-2">
                    Create Customer
                 </Button>
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
                     <span className="font-bold text-sm">{currencySymbol}{(item.price * item.quantity).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">@ {currencySymbol}{item.price.toFixed(2)}</span>
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

      {/* Footer Section */}
      <div className="border-t border-gray-100 bg-gray-50 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        
        {/* --- CUSTOMER LOOKUP --- */}
        <div className="mb-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
           {customer ? (
              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center relative">
                        <User size={18} />
                        {rules?.loyalty.enabled && (
                            <div className="absolute -top-1 -right-1 bg-[#ecff76] text-black text-[9px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-white">
                                <Gift size={10}/>
                            </div>
                        )}
                     </div>
                     <div>
                        <p className="text-sm font-bold text-gray-900">{customer.name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{customer.phone}</span>
                            {rules?.loyalty.enabled && (
                                <span className="text-[#8a9928] font-bold bg-[#ecff76]/30 px-1.5 rounded">
                                    {customer.pointsBalance ?? 0} Pts
                                </span>
                            )}
                        </div>
                     </div>
                  </div>
                  <button 
                    onClick={() => { setCustomer(null); setRedeemPointsInput(""); setConvertChangeToPoints(false); }}
                    className="text-xs text-red-500 hover:bg-red-50 p-2 rounded"
                  >
                    <X size={16}/>
                  </button>
              </div>
           ) : (
              <form onSubmit={handleCustomerCheck} className="flex gap-2">
                 <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                    <input 
                        type="tel" 
                        placeholder="Customer Mobile"
                        value={searchPhone}
                        onChange={(e) => setSearchPhone(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-[#ecff76] focus:ring-1 focus:ring-[#ecff76] transition-all"
                    />
                 </div>
                 <button 
                    type="submit"
                    className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                 >
                    <ArrowRight size={16} />
                 </button>
              </form>
           )}
        </div>

        {viewState === 'cart' ? (
           <div className="space-y-3">
              {/* --- DYNAMIC TOTALS --- */}
              <div className="space-y-2 mb-2 border-b border-dashed border-gray-200 pb-3">
                <div className="flex justify-between text-xs text-gray-500">
                    <span>Subtotal</span>
                    <span>{currencySymbol}{cartTotal.toFixed(2)}</span>
                </div>

                {rules?.discounts && rules.discounts.length > 0 && (
                    <div className="flex justify-between items-center text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Tag size={10}/> Discount</span>
                        <select 
                            className="bg-transparent border-b border-gray-300 text-right outline-none text-xs w-24 focus:border-[#ecff76]"
                            onChange={(e) => setSelectedDiscountId(Number(e.target.value) || null)}
                            value={selectedDiscountId || ""}
                        >
                            <option value="">None</option>
                            {rules.discounts.map(d => (
                                <option key={d.id} value={d.id}>
                                    {d.name} ({d.type === 'percent' ? `-${d.value}%` : `-${currencySymbol}${d.value}`})
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                
                {rules?.taxes && rules.taxes.map(tax => (
                    <div key={tax.id} className="flex justify-between items-center text-xs text-gray-500">
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={activeTaxIds.includes(tax.id!)}
                                onChange={(e) => {
                                    if(e.target.checked) setActiveTaxIds([...activeTaxIds, tax.id!]);
                                    else setActiveTaxIds(activeTaxIds.filter(id => id !== tax.id));
                                }}
                                className="accent-[#ecff76] w-3 h-3"
                            />
                            {tax.name} ({tax.rate}%)
                        </label>
                        <span>{activeTaxIds.includes(tax.id!) ? `${currencySymbol}${(taxableAmount * (tax.rate/100)).toFixed(2)}` : '-'}</span>
                    </div>
                ))}

                {/* --- REDEEM POINTS ROW --- */}
                {actualPointsRedeemed > 0 && (
                    <div className="flex justify-between items-center text-xs font-bold text-green-600 bg-green-50 p-1.5 rounded">
                        <span className="flex items-center gap-1"><Coins size={10}/> Points Used ({actualPointsRedeemed})</span>
                        <span>- {currencySymbol}{redemptionValue.toFixed(2)}</span>
                    </div>
                )}
              </div>

              {/* Total Display */}
              <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-sm">Total Amount</span>
                    {rules?.loyalty.enabled && (
                        <span className="text-[10px] text-[#8a9928] bg-[#ecff76]/20 px-1.5 rounded w-fit">
                            +{pointsToEarn} Pts
                        </span>
                    )}
                  </div>
                  <span className="text-3xl font-black tracking-tight text-gray-900">{currencySymbol}{finalTotal.toFixed(2)}</span>
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
              
              {/* --- CUSTOM POINTS REDEMPTION --- */}
              {rules?.loyalty.enabled && customer && (customer.pointsBalance || 0) > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                              <Coins size={16} className="text-gray-500"/>
                              <span className="text-sm font-bold text-gray-900">Redeem Points</span>
                          </div>
                          <span className="text-xs text-gray-500">Bal: {customer.pointsBalance}</span>
                      </div>
                      
                      <div className="flex gap-2 h-9">
                          <input 
                             type="number"
                             value={redeemPointsInput}
                             onChange={(e) => setRedeemPointsInput(e.target.value)}
                             placeholder="Points to use"
                             className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-[#ecff76] focus:ring-1 focus:ring-[#ecff76]"
                          />
                          <button 
                             // Auto-calculate exact points needed to cover bill
                             onClick={() => setRedeemPointsInput(Math.min(customer.pointsBalance || 0, Number((potentialTotal / (rules.loyalty.redeemRate || 0.01)).toFixed(2))).toString())}
                             className="bg-black text-white text-xs px-3 rounded-lg hover:bg-gray-800"
                          >
                             Max
                          </button>
                      </div>
                      
                      {redemptionValue > 0 && (
                          <div className="mt-2 text-right text-xs font-bold text-green-600">
                              Saving {currencySymbol}{redemptionValue.toFixed(2)}
                          </div>
                      )}
                  </div>
              )}

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
                  {surchargeAmount > 0 && (
                      <div className="flex justify-between items-center text-xs text-orange-600 bg-orange-50 p-2 rounded mb-2">
                          <span className="flex items-center gap-1"><AlertCircle size={12}/> Card Fee Applied</span>
                          <span className="font-bold">+{currencySymbol}{surchargeAmount.toFixed(2)}</span>
                      </div>
                  )}

                  {selectedPaymentMethod === 'cash' && (
                      <div className="space-y-3">
                          <div className="flex justify-between text-sm mb-1">
                              <span>Total Due:</span>
                              <span className="font-bold text-lg">{currencySymbol}{finalTotal.toFixed(2)}</span>
                          </div>
                          {finalTotal > 0 ? (
                              <>
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
                                      <span className={`text-xl font-bold ${cashChangeToReturn < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                          {currencySymbol}{cashChangeToReturn.toFixed(2)}
                                      </span>
                                  </div>
                                  
                                  {/* --- CONVERT CHANGE TO POINTS --- */}
                                  {rules?.loyalty.enabled && customer && totalChangeAvailable > 0 && (
                                      <div className="mt-3 bg-blue-50 p-3 rounded-lg border border-blue-100 shadow-sm transition-all">
                                          <div className="flex items-center justify-between mb-2">
                                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                                  <input 
                                                      type="checkbox"
                                                      checked={convertChangeToPoints}
                                                      onChange={(e) => toggleSaveChange(e.target.checked)}
                                                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 accent-blue-600"
                                                  />
                                                  <span className="text-xs font-bold text-blue-800 flex items-center gap-1">
                                                      <Save size={12}/> Save Change as Points
                                                  </span>
                                              </label>
                                          </div>
                                          
                                          {convertChangeToPoints && (
                                              <div className="animate-in fade-in slide-in-from-top-1 space-y-2">
                                                  <div className="flex items-center gap-2 bg-white rounded-lg border border-blue-200 p-1">
                                                      <span className="pl-2 text-xs text-gray-400">{currencySymbol}</span>
                                                      <input 
                                                          type="number" 
                                                          value={saveChangeAmount} 
                                                          onChange={e => setSaveChangeAmount(e.target.value)} 
                                                          className="flex-1 py-1 text-sm font-bold text-gray-900 outline-none"
                                                          placeholder="0.00"
                                                      />
                                                      <button 
                                                          onClick={() => setSaveChangeAmount(totalChangeAvailable.toFixed(2))} 
                                                          className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded hover:bg-blue-200"
                                                      >
                                                          MAX
                                                      </button>
                                                  </div>
                                                  <div className="flex justify-between text-[10px] font-medium text-gray-600 px-1">
                                                      {/* FIX: Show exact decimal points */}
                                                      <span>Points: <b className="text-blue-700">+{pointsFromChange}</b></span>
                                                      <span>Return Cash: <b>{currencySymbol}{cashChangeToReturn.toFixed(2)}</b></span>
                                                  </div>
                                              </div>
                                          )}
                                      </div>
                                  )}
                              </>
                          ) : (
                              <div className="text-center text-green-600 font-bold py-2 bg-green-50 rounded-lg border border-green-100">
                                  Fully paid by points!
                              </div>
                          )}
                      </div>
                  )}

                  {selectedPaymentMethod === 'card' && (
                      <div className="text-center py-2 text-gray-500 text-sm">
                          Charge: <span className="font-bold text-black">{currencySymbol}{finalTotal.toFixed(2)}</span>
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