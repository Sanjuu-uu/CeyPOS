import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
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
  Save,
  Wifi,
  WifiOff,
  RefreshCw,
  Printer,
  MessageSquare,
  Mail,
} from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { db, BusinessRules } from "../../../lib/db";
import { Customer, KeyboardShortcuts } from "../../../types";

type PaymentMethod = "card" | "cash" | "mobile";
type ReceiptMethod = "print" | "sms" | "email";
const MAX_RECEIPT_METHODS = 2;

const useCartCalculations = (
  cartTotal: number,
  rules: BusinessRules | null,
  activeTaxIds: number[],
  selectedDiscountId: number | null,
  selectedPaymentMethod: PaymentMethod,
  customer: Customer | null,
  redeemPointsInput: string,
  convertChangeToPoints: boolean,
  saveChangeAmount: string,
  cashReceived: string,
) => {
  const discountAmount = useMemo(() => {
    if (!selectedDiscountId || !rules) return 0;
    const discount = rules.discounts.find((d) => d.id === selectedDiscountId);
    return discount
      ? discount.type === "percent"
        ? cartTotal * (discount.value / 100)
        : discount.value
      : 0;
  }, [cartTotal, selectedDiscountId, rules]);

  const taxableAmount = Math.max(0, cartTotal - discountAmount);
  const taxAmount = useMemo(() => {
    if (!rules) return 0;
    return rules.taxes
      .filter((t) => activeTaxIds.includes(t.id!))
      .reduce((sum, t) => sum + taxableAmount * (t.rate / 100), 0);
  }, [taxableAmount, activeTaxIds, rules]);

  const surchargeAmount = useMemo(() => {
    if (!rules || selectedPaymentMethod !== "card") return 0;
    const applicable = rules.surcharges.find(
      (s) => taxableAmount >= s.minAmount,
    );
    return applicable
      ? applicable.type === "percent"
        ? taxableAmount * (applicable.value / 100)
        : applicable.value
      : 0;
  }, [taxableAmount, selectedPaymentMethod, rules]);

  const potentialTotal = taxableAmount + taxAmount + surchargeAmount;
  const actualPointsRedeemed = useMemo(() => {
    if (!customer || !rules?.loyalty.enabled) return 0;
    const inputPoints = parseFloat(redeemPointsInput) || 0;
    const redeemRate = rules.loyalty.redeemRate || 0.01;
    return Math.min(
      inputPoints,
      customer.pointsBalance || 0,
      Number((potentialTotal / redeemRate).toFixed(2)),
    );
  }, [customer, rules, redeemPointsInput, potentialTotal]);

  const redemptionValue = useMemo(
    () => actualPointsRedeemed * (rules?.loyalty.redeemRate || 0.01),
    [actualPointsRedeemed, rules],
  );
  const finalTotal = Math.max(0, potentialTotal - redemptionValue);
  const pointsToEarn = useMemo(() => {
    if (!rules?.loyalty.enabled || (rules.loyalty.earnRate || 1) <= 0) return 0;
    return Number((finalTotal / rules.loyalty.earnRate!).toFixed(2));
  }, [finalTotal, rules]);

  const rawChange = parseFloat(cashReceived) - finalTotal;
  const totalChangeAvailable = Math.max(0, rawChange);
  const amountToConvert = useMemo(() => {
    if (!convertChangeToPoints || totalChangeAvailable <= 0) return 0;
    return Math.min(parseFloat(saveChangeAmount) || 0, totalChangeAvailable);
  }, [convertChangeToPoints, saveChangeAmount, totalChangeAvailable]);
  const pointsFromChange = useMemo(
    () =>
      amountToConvert > 0 && rules?.loyalty.redeemRate
        ? Number((amountToConvert / rules.loyalty.redeemRate).toFixed(2))
        : 0,
    [amountToConvert, rules],
  );

  const cashChangeToReturn = totalChangeAvailable - amountToConvert;
  const isInsufficientPayment = useMemo(
    () =>
      finalTotal > 0.001 &&
      selectedPaymentMethod === "cash" &&
      (parseFloat(cashReceived) || 0) < finalTotal - 0.01,
    [selectedPaymentMethod, cashReceived, finalTotal],
  );

  return {
    discountAmount,
    taxableAmount,
    taxAmount,
    surchargeAmount,
    potentialTotal,
    actualPointsRedeemed,
    redemptionValue,
    finalTotal,
    pointsToEarn,
    totalChangeAvailable,
    amountToConvert,
    pointsFromChange,
    cashChangeToReturn,
    isInsufficientPayment,
  };
};

export const ShoppingCart: React.FC = () => {
  const {
    cart,
    clearCart,
    updateCartItemQuantity,
    cartTotal,
    currentShop,
    currentUser,
  } = useApp();
  const currencySymbol = currentShop?.currency ?? "$";

  const [viewState, setViewState] = useState<"cart" | "checkout" | "success">(
    "cart",
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("cash");
  const [receiptMethods, setReceiptMethods] = useState<ReceiptMethod[]>([
    "print",
  ]);
  const [saving, setSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [syncingOffline, setSyncingOffline] = useState(false);
  const [syncErrorMsg, setSyncErrorMsg] = useState<string | null>(null);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  const [rules, setRules] = useState<BusinessRules | null>(null);
  const [selectedDiscountId, setSelectedDiscountId] = useState<number | null>(
    null,
  );
  const [activeTaxIds, setActiveTaxIds] = useState<number[]>([]);

  const [searchPhone, setSearchPhone] = useState("");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [newCustomerInfo, setNewCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [redeemPointsInput, setRedeemPointsInput] = useState<string>("");
  const [convertChangeToPoints, setConvertChangeToPoints] = useState(false);
  const [saveChangeAmount, setSaveChangeAmount] = useState<string>("");
  const [cashReceived, setCashReceived] = useState<string>("");

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

  const viewStateRef = useRef(viewState);
  const cartRef = useRef(cart);
  const showRegisterModalRef = useRef(showRegisterModal);

  useEffect(() => {
    viewStateRef.current = viewState;
  }, [viewState]);
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);
  useEffect(() => {
    showRegisterModalRef.current = showRegisterModal;
  }, [showRegisterModal]);

  // Production Validation: Auto-Kick on Empty Cart
  useEffect(() => {
    if (cart.length === 0 && viewState === "checkout") {
      setViewState("cart");
    }
  }, [cart.length, viewState]);

  useEffect(() => {
    if (showRegisterModal) {
      setTimeout(
        () => document.getElementById("new-customer-name")?.focus(),
        100,
      );
    }
  }, [showRegisterModal]);

  // FIX: Dynamic Dependency Event Listeners
  useEffect(() => {
    const handleCheckoutNav = () => {
      if (cart.length > 0) setViewState("checkout");
    };
    const handleTogglePayment = () => {
      setSelectedPaymentMethod((prev) =>
        prev === "cash" ? "card" : prev === "card" ? "mobile" : "cash",
      );
    };
    const handleEnterAction = () => {
      if (viewState === "cart" && cart.length > 0) {
        setViewState("checkout");
      } else if (viewState === "checkout") {
        const confirmBtn = document.getElementById(
          "checkout-confirm-btn",
        ) as HTMLButtonElement | null;
        if (confirmBtn && !confirmBtn.disabled) confirmBtn.click();
      }
    };

    const handleAddCustomer = () => {
      const customerInput = document.getElementById("customer-search-input");
      if (customerInput) customerInput.focus();
    };

    const handleRemoveCustomer = () => {
      setCustomer(null);
      setRedeemPointsInput("");
      setConvertChangeToPoints(false);
    };

    const handleEscape = () => {
      if (showRegisterModal) {
        setShowRegisterModal(false);
      } else if (viewState === "checkout") {
        setViewState("cart");
      }
    };

    window.addEventListener("pos:checkout", handleCheckoutNav);
    window.addEventListener("pos:toggle-payment", handleTogglePayment);
    window.addEventListener("pos:action-enter", handleEnterAction);
    window.addEventListener("pos:add-customer", handleAddCustomer);
    window.addEventListener("pos:remove-customer", handleRemoveCustomer);
    window.addEventListener("pos:escape", handleEscape);

    return () => {
      window.removeEventListener("pos:checkout", handleCheckoutNav);
      window.removeEventListener("pos:toggle-payment", handleTogglePayment);
      window.removeEventListener("pos:action-enter", handleEnterAction);
      window.removeEventListener("pos:add-customer", handleAddCustomer);
      window.removeEventListener("pos:remove-customer", handleRemoveCustomer);
      window.removeEventListener("pos:escape", handleEscape);
    };
  }, [cart.length, viewState, showRegisterModal]);

  useEffect(() => {
    const toggle = (id: ReceiptMethod) => {
      setReceiptMethods((prev) =>
        prev.includes(id)
          ? prev.filter((m) => m !== id)
          : prev.length >= MAX_RECEIPT_METHODS
            ? prev
            : [...prev, id],
      );
    };
    const handlePrint = () => toggle("print");
    const handleSms = () => toggle("sms");
    const handleEmail = () => toggle("email");

    window.addEventListener("pos:toggle-receipt-print", handlePrint);
    window.addEventListener("pos:toggle-receipt-sms", handleSms);
    window.addEventListener("pos:toggle-receipt-email", handleEmail);
    return () => {
      window.removeEventListener("pos:toggle-receipt-print", handlePrint);
      window.removeEventListener("pos:toggle-receipt-sms", handleSms);
      window.removeEventListener("pos:toggle-receipt-email", handleEmail);
    };
  }, []);

  useEffect(() => {
    const loadedRules = db.businessRules.get();
    if (loadedRules) {
      setRules(loadedRules);
      setActiveTaxIds(
        loadedRules.taxes
          .filter(
            (
              tax,
            ): tax is {
              id: number;
              name: string;
              rate: number;
              isDefault: boolean;
            } => Boolean(tax.isDefault) && typeof tax.id === "number",
          )
          .map((tax) => tax.id),
      );
    }
  }, [currentShop]);

  const syncRetryCount = useRef(0);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncOfflineSales = useCallback(async () => {
    if (syncingOffline || !navigator.onLine || !currentShop) return;
    setSyncingOffline(true);
    setSyncErrorMsg(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      let unsyncedSales: any[] = [];
      const salesDb = db.sales as any;

      if (typeof salesDb.where === "function")
        unsyncedSales = await salesDb.where("isSynced").equals(false).toArray();
      else if (typeof salesDb.getAll === "function") {
        const all = await salesDb.getAll();
        unsyncedSales = all.filter((s: any) => s.isSynced === false);
      }

      if (unsyncedSales.length === 0) {
        syncRetryCount.current = 0;
        setSyncingOffline(false);
        clearTimeout(timeoutId);
        return;
      }

      const payload = unsyncedSales.map((sale) => ({
        ...sale,
        inventoryVersions: sale.items.map((i: any) => ({
          id: i.id,
          lastVersion: i.version || 1,
        })),
      }));

      const token = localStorage.getItem("pos_auth_token") || "";
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

      const response = await fetch(`${apiUrl}/api/sales/bulk-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sales: payload, shopId: currentShop.id }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`Server returned ${response.status}`);

      const result = await response.json();
      const successfullySyncedIds = result.syncedIds || [];
      for (const id of successfullySyncedIds) {
        if (typeof salesDb.update === "function")
          await salesDb.update(id, { isSynced: true });
      }

      syncRetryCount.current = 0;
      setSyncErrorMsg(null);
      setSyncSuccessMsg(`Synced ${successfullySyncedIds.length} sales`);
      setTimeout(() => setSyncSuccessMsg(null), 3000);
    } catch (error) {
      clearTimeout(timeoutId);
      setSyncErrorMsg("Sync Failed");
      syncRetryCount.current += 1;
      const nextRetryDelay = Math.min(
        10000 * Math.pow(2, syncRetryCount.current),
        300000,
      );
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(syncOfflineSales, nextRetryDelay);
    } finally {
      setSyncingOffline(false);
    }
  }, [currentShop, syncingOffline]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineSales();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    if (navigator.onLine) syncOfflineSales();
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncOfflineSales]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (navigator.onLine) syncOfflineSales();
    }, 60000);
    return () => clearInterval(intervalId);
  }, [syncOfflineSales]);

  const {
    discountAmount,
    taxableAmount,
    taxAmount,
    surchargeAmount,
    potentialTotal,
    actualPointsRedeemed,
    redemptionValue,
    finalTotal,
    pointsToEarn,
    totalChangeAvailable,
    amountToConvert,
    pointsFromChange,
    cashChangeToReturn,
    isInsufficientPayment,
  } = useCartCalculations(
    cartTotal,
    rules,
    activeTaxIds,
    selectedDiscountId,
    selectedPaymentMethod,
    customer,
    redeemPointsInput,
    convertChangeToPoints,
    saveChangeAmount,
    cashReceived,
  );

  const handleCustomerCheck = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchPhone.trim() || !currentShop) return;
    const existing = db.customers
      .getByShopId(currentShop.id)
      .find((entry) => entry.phone === searchPhone.trim());
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
    setCustomer({
      id: `temp_${Date.now()}`,
      shopId: currentShop?.id || "",
      ...newCustomerInfo,
      pointsBalance: 0,
      totalSpend: 0,
    });
    setShowRegisterModal(false);
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || !currentShop || saving || isInsufficientPayment)
      return;
    setSaving(true);
    try {
      await db.sales.create({
        shopId: currentShop.id,
        customerInfo: customer
          ? {
              name: customer.name || "",
              email: customer.email || "",
              phone: customer.phone || "",
            }
          : undefined,
        items: [...cart],
        subtotal: cartTotal,
        tax: taxAmount,
        discount: discountAmount,
        total: finalTotal,
        pointsEarned: Number((pointsToEarn + pointsFromChange).toFixed(2)),
        pointsRedeemed: actualPointsRedeemed,
        paymentMethod: selectedPaymentMethod,
        timestamp: new Date().toISOString(),
        isSynced: isOnline,
      } as any);

      // FIX 5: Real-time sync is now managed entirely by `db.ts` internally, eliminating duplicate WebSockets.

      setViewState("success");
      setTimeout(() => {
        clearCart();
        setViewState("cart");
        setCashReceived("");
        setCustomer(null);
        setSelectedDiscountId(null);
        setSearchPhone("");
        setRedeemPointsInput("");
        setConvertChangeToPoints(false);
        setSaveChangeAmount("");
        setReceiptMethods(["print"]);
        setSaving(false);
      }, 2000);
    } catch (error) {
      console.error("Checkout failed:", error);
      alert("Transaction failed");
      setSaving(false);
    }
  };

  if (viewState === "success") {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
        <div className="w-20 h-20 bg-[#ecff76] text-gray-900 rounded-full flex items-center justify-center mb-4 shadow-sm">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Successful!
        </h2>
        <p className="text-gray-500 mb-6">
          Total Paid: {currencySymbol}
          {finalTotal.toFixed(2)}
        </p>
        {rules?.loyalty.enabled && customer && (
          <div className="space-y-2 mb-6">
            {(pointsToEarn > 0 || pointsFromChange > 0) && (
              <div className="bg-gray-50 px-4 py-2 rounded-full text-sm font-medium text-gray-600 border border-gray-100">
                <span className="font-bold text-black">
                  +{Number((pointsToEarn + pointsFromChange).toFixed(2))} Points
                </span>{" "}
                added
                {pointsFromChange > 0 && (
                  <div className="text-xs text-blue-600 mt-1">
                    ({currencySymbol}
                    {parseFloat(saveChangeAmount || "0").toFixed(2)} change
                    saved)
                  </div>
                )}
              </div>
            )}
            {actualPointsRedeemed > 0 && (
              <div className="text-xs text-red-500 font-medium">
                -{actualPointsRedeemed} Points Redeemed
              </div>
            )}
          </div>
        )}
        <p className="text-sm text-gray-400 mt-2">
          {!isOnline
            ? "Saved offline. Redirecting..."
            : "Redirecting to new order..."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      {showRegisterModal && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">New Customer</h3>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-gray-400 hover:text-black"
                title="Cancel [Esc]"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRegisterSave} className="space-y-3">
              <input
                id="new-customer-phone"
                value={newCustomerInfo.phone}
                onChange={(e) =>
                  setNewCustomerInfo({
                    ...newCustomerInfo,
                    phone: e.target.value,
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    document.getElementById("new-customer-name")?.focus();
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 outline-none focus:ring-2 focus:ring-[#ecff76]"
                placeholder="Phone"
              />
              <input
                id="new-customer-name"
                required
                value={newCustomerInfo.name}
                onChange={(e) =>
                  setNewCustomerInfo({
                    ...newCustomerInfo,
                    name: e.target.value,
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    document.getElementById("new-customer-email")?.focus();
                  }
                }}
                placeholder="Full Name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-[#ecff76] focus:ring-1 focus:ring-[#ecff76]"
              />
              <input
                id="new-customer-email"
                type="email"
                value={newCustomerInfo.email}
                onChange={(e) =>
                  setNewCustomerInfo({
                    ...newCustomerInfo,
                    email: e.target.value,
                  })
                }
                placeholder="Email (Optional)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-[#ecff76] focus:ring-1 focus:ring-[#ecff76]"
              />
              <Button
                id="new-customer-submit"
                fullWidth
                type="submit"
                className="bg-[#ecff76] hover:bg-[#d9ec60] text-gray-900 font-bold border-none mt-2"
              >
                Create Customer [Enter]
              </Button>
            </form>
          </div>
        </div>
      )}

      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white z-10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-lg text-gray-900">Current Order</h2>
          <span className="bg-[#ecff76] text-gray-900 text-xs px-2 py-0.5 rounded-full font-bold">
            {cart.length}
          </span>

          {!isOnline && (
            <span className="ml-2 flex items-center text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
              <WifiOff size={10} className="mr-1" /> Offline (Saved Locally)
            </span>
          )}
          {isOnline && syncingOffline && (
            <span className="ml-2 flex items-center text-[10px] text-blue-500 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 animate-pulse">
              <RefreshCw size={10} className="mr-1 animate-spin" /> Syncing...
            </span>
          )}
          {isOnline && syncSuccessMsg && (
            <span className="ml-2 flex items-center text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200 animate-in fade-in zoom-in duration-300">
              <CheckCircle2 size={10} className="mr-1" /> {syncSuccessMsg}
            </span>
          )}
          {isOnline && syncErrorMsg && !syncingOffline && !syncSuccessMsg && (
            <button
              onClick={() => syncOfflineSales()}
              className="ml-2 flex items-center text-[10px] text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100 hover:bg-red-100 transition-colors"
            >
              <AlertCircle size={10} className="mr-1" /> {syncErrorMsg} (Click
              to Retry)
            </button>
          )}
          {isOnline && !syncingOffline && !syncErrorMsg && !syncSuccessMsg && (
            <span className="ml-2 flex items-center text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">
              <Wifi size={10} className="mr-1" /> Online
            </span>
          )}
        </div>
        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className="text-xs text-red-500 hover:text-red-700 hover:underline flex items-center gap-1"
          >
            <Trash2 size={12} /> Clear [{shortcuts.clearCart}]
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length > 0 ? (
          cart.map((item) => (
            <div
              key={item.id}
              className="group flex justify-between items-start gap-3 py-2 border-b border-gray-50 last:border-0"
            >
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-gray-800 text-sm">
                    {item.name}
                  </span>
                  <span className="font-bold text-sm">
                    {currencySymbol}
                    {(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    @ {currencySymbol}
                    {item.price.toFixed(2)}
                  </span>
                  <div className="flex items-center gap-3 bg-gray-50 rounded px-2 py-1">
                    <button
                      onClick={() =>
                        updateCartItemQuantity(
                          item.id,
                          Math.max(0, item.quantity - 1),
                        )
                      }
                      className="text-gray-400 hover:text-black transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-xs font-bold min-w-[16px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateCartItemQuantity(item.id, item.quantity + 1)
                      }
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

      <div className="border-t border-gray-100 bg-gray-50 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex-shrink-0">
        <div className="mb-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
          {customer ? (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center relative">
                  <User size={18} />
                  {rules?.loyalty.enabled && (
                    <div className="absolute -top-1 -right-1 bg-[#ecff76] text-black text-[9px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-white">
                      <Gift size={10} />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {customer.name}
                  </p>
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
                onClick={() => {
                  setCustomer(null);
                  setRedeemPointsInput("");
                  setConvertChangeToPoints(false);
                }}
                className="text-xs text-red-500 hover:bg-red-50 p-2 rounded flex items-center gap-1"
                title={`Remove Customer [${shortcuts.removeCustomer}]`}
              >
                <X size={16} />{" "}
                <span className="hidden sm:inline">
                  [{shortcuts.removeCustomer}]
                </span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleCustomerCheck} className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-2.5 text-gray-400"
                />
                <input
                  id="customer-search-input"
                  type="tel"
                  placeholder={`Customer Mobile [${shortcuts.addCustomer}]`}
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

        {viewState === "cart" ? (
          <div className="space-y-3">
            <div className="space-y-2 mb-2 border-b border-dashed border-gray-200 pb-3">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Subtotal</span>
                <span>
                  {currencySymbol}
                  {cartTotal.toFixed(2)}
                </span>
              </div>
              {rules?.discounts && rules.discounts.length > 0 && (
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Tag size={10} /> Discount
                  </span>
                  <select
                    className="bg-transparent border-b border-gray-300 text-right outline-none text-xs w-24 focus:border-[#ecff76]"
                    onChange={(e) =>
                      setSelectedDiscountId(Number(e.target.value) || null)
                    }
                    value={selectedDiscountId || ""}
                  >
                    <option value="">None</option>
                    {rules.discounts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} (
                        {d.type === "percent"
                          ? `-${d.value}%`
                          : `-${currencySymbol}${d.value}`}
                        )
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {rules?.taxes &&
                rules.taxes.map((tax) => (
                  <div
                    key={tax.id}
                    className="flex justify-between items-center text-xs text-gray-500"
                  >
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeTaxIds.includes(tax.id!)}
                        onChange={(e) => {
                          e.target.checked
                            ? setActiveTaxIds([...activeTaxIds, tax.id!])
                            : setActiveTaxIds(
                                activeTaxIds.filter((id) => id !== tax.id),
                              );
                        }}
                        className="accent-[#ecff76] w-3 h-3"
                      />
                      {tax.name} ({tax.rate}%)
                    </label>
                    <span>
                      {activeTaxIds.includes(tax.id!)
                        ? `${currencySymbol}${(taxableAmount * (tax.rate / 100)).toFixed(2)}`
                        : "-"}
                    </span>
                  </div>
                ))}
              {actualPointsRedeemed > 0 && (
                <div className="flex justify-between items-center text-xs font-bold text-green-600 bg-green-50 p-1.5 rounded">
                  <span className="flex items-center gap-1">
                    <Coins size={10} /> Points Used ({actualPointsRedeemed})
                  </span>
                  <span>
                    - {currencySymbol}
                    {redemptionValue.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex justify-between items-end">
              <div className="flex flex-col">
                <span className="text-gray-500 text-sm">Total Amount</span>
                {rules?.loyalty.enabled && (
                  <span className="text-[10px] text-[#8a9928] bg-[#ecff76]/20 px-1.5 rounded w-fit">
                    +{pointsToEarn} Pts
                  </span>
                )}
              </div>
              <span className="text-3xl font-black tracking-tight text-gray-900">
                {currencySymbol}
                {finalTotal.toFixed(2)}
              </span>
            </div>
            <Button
              onClick={() => setViewState("checkout")}
              fullWidth
              className="h-12 text-base font-bold bg-[#ecff76] text-gray-900 hover:bg-[#d9ec60] border-none"
              disabled={cart.length === 0}
            >
              Pay Now [{shortcuts.checkout}]
            </Button>
          </div>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-bottom-5">
            {rules?.loyalty.enabled &&
              customer &&
              (customer.pointsBalance || 0) > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Coins size={16} className="text-gray-500" />
                      <span className="text-sm font-bold text-gray-900">
                        Redeem Points
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      Bal: {customer.pointsBalance}
                    </span>
                  </div>
                  <div className="flex gap-2 h-9">
                    <input
                      type="number"
                      value={redeemPointsInput}
                      onChange={(e) => setRedeemPointsInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          document
                            .getElementById("checkout-confirm-btn")
                            ?.click();
                        }
                      }}
                      placeholder="Points to use"
                      className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-[#ecff76] focus:ring-1 focus:ring-[#ecff76]"
                    />
                    <button
                      onClick={() =>
                        setRedeemPointsInput(
                          Math.min(
                            customer.pointsBalance || 0,
                            Number(
                              (
                                potentialTotal /
                                (rules.loyalty.redeemRate || 0.01)
                              ).toFixed(2),
                            ),
                          ).toString(),
                        )
                      }
                      className="bg-black text-white text-xs px-3 rounded-lg hover:bg-gray-800"
                    >
                      Max
                    </button>
                  </div>
                  {redemptionValue > 0 && (
                    <div className="mt-2 text-right text-xs font-bold text-green-600">
                      Saving {currencySymbol}
                      {redemptionValue.toFixed(2)}
                    </div>
                  )}
                </div>
              )}
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "cash", icon: Banknote, label: "Cash" },
                { id: "card", icon: CreditCard, label: "Card" },
                { id: "mobile", icon: QrCode, label: "QR" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() =>
                    setSelectedPaymentMethod(m.id as PaymentMethod)
                  }
                  className={`flex flex-col items-center justify-center py-2 rounded-lg border transition-all ${selectedPaymentMethod === m.id ? "bg-[#ecff76] text-gray-900 border-[#dcefa8] shadow-md font-bold" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}
                >
                  <m.icon size={20} className="mb-1" />
                  <span className="text-xs">{m.label}</span>
                </button>
              ))}
              <div className="col-span-3 text-center text-[10px] text-gray-400 mt-1">
                Press{" "}
                <kbd className="bg-gray-100 px-1 py-0.5 rounded border border-gray-200 text-gray-800 font-bold">
                  {shortcuts.togglePayment}
                </kbd>{" "}
                to toggle payment method
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              {surchargeAmount > 0 && (
                <div className="flex justify-between items-center text-xs text-orange-600 bg-orange-50 p-2 rounded mb-2">
                  <span className="flex items-center gap-1">
                    <AlertCircle size={12} /> Card Fee Applied
                  </span>
                  <span className="font-bold">
                    +{currencySymbol}
                    {surchargeAmount.toFixed(2)}
                  </span>
                </div>
              )}
              {selectedPaymentMethod === "cash" && (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Total Due:</span>
                    <span className="font-bold text-lg">
                      {currencySymbol}
                      {finalTotal.toFixed(2)}
                    </span>
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
                          onChange={(e) => setCashReceived(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              document
                                .getElementById("checkout-confirm-btn")
                                ?.click();
                            }
                          }}
                        />
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-sm text-gray-500">Change:</span>
                        <span
                          className={`text-xl font-bold ${cashChangeToReturn < 0 ? "text-red-500" : "text-green-600"}`}
                        >
                          {currencySymbol}
                          {cashChangeToReturn.toFixed(2)}
                        </span>
                      </div>
                      {rules?.loyalty.enabled &&
                        customer &&
                        totalChangeAvailable > 0 && (
                          <div className="mt-3 bg-blue-50 p-3 rounded-lg border border-blue-100 shadow-sm transition-all">
                            <div className="flex items-center justify-between mb-2">
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={convertChangeToPoints}
                                  onChange={(e) => {
                                    setConvertChangeToPoints(e.target.checked);
                                    setSaveChangeAmount(
                                      e.target.checked
                                        ? totalChangeAvailable.toFixed(2)
                                        : "",
                                    );
                                  }}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 accent-blue-600"
                                />
                                <span className="text-xs font-bold text-blue-800 flex items-center gap-1">
                                  <Save size={12} /> Save Change as Points
                                </span>
                              </label>
                            </div>
                            {convertChangeToPoints && (
                              <div className="animate-in fade-in slide-in-from-top-1 space-y-2">
                                <div className="flex items-center gap-2 bg-white rounded-lg border border-blue-200 p-1">
                                  <span className="pl-2 text-xs text-gray-400">
                                    {currencySymbol}
                                  </span>
                                  <input
                                    type="number"
                                    value={saveChangeAmount}
                                    onChange={(e) =>
                                      setSaveChangeAmount(e.target.value)
                                    }
                                    className="flex-1 py-1 text-sm font-bold text-gray-900 outline-none"
                                    placeholder="0.00"
                                  />
                                  <button
                                    onClick={() =>
                                      setSaveChangeAmount(
                                        totalChangeAvailable.toFixed(2),
                                      )
                                    }
                                    className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded hover:bg-blue-200"
                                  >
                                    MAX
                                  </button>
                                </div>
                                <div className="flex justify-between text-[10px] font-medium text-gray-600 px-1">
                                  <span>
                                    Points:{" "}
                                    <b className="text-blue-700">
                                      +{pointsFromChange}
                                    </b>
                                  </span>
                                  <span>
                                    Return Cash:{" "}
                                    <b>
                                      {currencySymbol}
                                      {cashChangeToReturn.toFixed(2)}
                                    </b>
                                  </span>
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
              {selectedPaymentMethod === "card" && (
                <div className="text-center py-2 text-gray-500 text-sm">
                  Charge:{" "}
                  <span className="font-bold text-black">
                    {currencySymbol}
                    {finalTotal.toFixed(2)}
                  </span>
                </div>
              )}
              {selectedPaymentMethod === "mobile" && (
                <div className="flex justify-center py-2">
                  <div className="w-24 h-24 bg-gray-900 rounded-lg flex items-center justify-center text-white">
                    <QrCode size={40} />
                  </div>
                </div>
              )}
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-700">
                  Receipt Delivery
                </span>
                <span
                  className={`text-[10px] font-medium ${receiptMethods.length >= MAX_RECEIPT_METHODS ? "text-amber-600" : "text-gray-400"}`}
                >
                  {receiptMethods.length}/{MAX_RECEIPT_METHODS} selected
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    id: "print",
                    icon: Printer,
                    label: "Print",
                    shortcut: shortcuts.toggleReceiptPrint,
                  },
                  {
                    id: "sms",
                    icon: MessageSquare,
                    label: "SMS PDF",
                    shortcut: shortcuts.toggleReceiptSms,
                  },
                  {
                    id: "email",
                    icon: Mail,
                    label: "Email",
                    shortcut: shortcuts.toggleReceiptEmail,
                  },
                ].map((opt) => {
                  const id = opt.id as ReceiptMethod;
                  const isSelected = receiptMethods.includes(id);
                  const isDisabled =
                    !isSelected &&
                    receiptMethods.length >= MAX_RECEIPT_METHODS;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setReceiptMethods((prev) =>
                          prev.includes(id)
                            ? prev.filter((m) => m !== id)
                            : prev.length >= MAX_RECEIPT_METHODS
                              ? prev
                              : [...prev, id],
                        )
                      }
                      disabled={isDisabled}
                      title={`Toggle ${opt.label} [${opt.shortcut}]`}
                      className={`flex flex-col items-center justify-center py-2 rounded-lg border transition-all ${
                        isSelected
                          ? "bg-[#ecff76] text-gray-900 border-[#dcefa8] shadow-md font-bold"
                          : isDisabled
                            ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                            : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <opt.icon size={20} className="mb-1" />
                      <span className="text-xs">{opt.label}</span>
                      <kbd
                        className={`mt-1 text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                          isSelected
                            ? "bg-white/70 border-[#dcefa8] text-gray-700"
                            : "bg-gray-100 border-gray-200 text-gray-500"
                        }`}
                      >
                        {opt.shortcut}
                      </kbd>
                    </button>
                  );
                })}
              </div>
              <div className="text-center text-[10px] text-gray-400 mt-2">
                Choose up to {MAX_RECEIPT_METHODS} ways to deliver the receipt
                · keys customizable in Settings
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewState("cart")}
                className="flex-1 py-3 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                title="Go back [Esc]"
              >
                Cancel
              </button>
              <button
                id="checkout-confirm-btn"
                onClick={handleCheckout}
                disabled={saving || isInsufficientPayment}
                className="flex-[2] py-3 text-sm font-bold text-gray-900 bg-[#ecff76] rounded-lg hover:bg-[#d9ec60] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving
                  ? "Processing..."
                  : `Complete Sale [${shortcuts.confirmPayment}]`}
                {!saving && <ArrowRight size={16} />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
