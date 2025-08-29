import React, { useState } from "react";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import {
  Trash2,
  Plus,
  Minus,
  CreditCard,
  X,
  ShoppingCart as ShoppingCartIcon,
  Banknote,
  QrCode,
  Mail,
  MessageSquare,
  Printer,
  ArrowLeft,
} from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { db } from "../../../lib/db";

type PaymentMethod = "card" | "cash" | "mobile";
type ReceiptOption = "email" | "sms" | "print";

// Inline API helper function
const postJSON = async (endpoint: string, data: any) => {
  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
};

export const ShoppingCart: React.FC = () => {
  const {
    cart,
    removeFromCart,
    updateCartItemQuantity,
    clearCart,
    cartTotal,
    currentShop,
    setCurrentModule,
  } = useApp();

  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("card");
  const [selectedReceiptOptions, setSelectedReceiptOptions] = useState<
    ReceiptOption[]
  >([]);

  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
  });

  // Payment method specific states
  const [cardInfo, setCardInfo] = useState({
    number: "",
    expiry: "",
    cvv: "",
    name: "",
  });

  const [cashInfo, setCashInfo] = useState({
    receivedAmount: "",
  });

  // Add the saving state at the component level
  const [saving, setSaving] = useState(false);

  // Missing function definitions that are referenced in the JSX
  const handleQuantityChange = (productId: string, change: number) => {
    const item = cart.find((item) => item.id === productId);
    if (!item) return;

    const newQuantity = Math.max(1, item.quantity + change);
    updateCartItemQuantity(productId, newQuantity);
  };

  const handleReceiptOptionToggle = (option: ReceiptOption) => {
    setSelectedReceiptOptions((prev) =>
      prev.includes(option)
        ? prev.filter((o) => o !== option)
        : [...prev, option]
    );
  };

  const calculateChange = () => {
    const received = parseFloat(cashInfo.receivedAmount) || 0;
    return Math.max(0, received - cartTotal);
  };

  const isPaymentValid = () => {
    switch (selectedPaymentMethod) {
      case "card":
        return (
          cardInfo.number && cardInfo.expiry && cardInfo.cvv && cardInfo.name
        );
      case "cash":
        return parseFloat(cashInfo.receivedAmount) >= cartTotal;
      case "mobile":
        return true; // Mobile/QR code payment is always valid once selected
      default:
        return false;
    }
  };

  const handleProceedToCheckout = () => {
    if (cart.length === 0) return;
    setShowCheckout(true);
  };

  const handleCompleteCheckout = async () => {
    if (cart.length === 0 || !currentShop || !isPaymentValid() || saving)
      return;

    setSaving(true);

    try {
      // Create the main sale record first
      const newSale = {
        shopId: currentShop.id,
        customerInfo:
          customerInfo.name || customerInfo.email || customerInfo.phone
            ? customerInfo
            : undefined,
        items: [...cart],
        total: cartTotal,
        paymentMethod: selectedPaymentMethod,
        receiptOptions: selectedReceiptOptions,
        paymentDetails: {
          card:
            selectedPaymentMethod === "card"
              ? {
                  lastFour: cardInfo.number.slice(-4),
                  cardholderName: cardInfo.name,
                }
              : undefined,
          cash:
            selectedPaymentMethod === "cash"
              ? {
                  received: parseFloat(cashInfo.receivedAmount),
                  change: calculateChange(),
                }
              : undefined,
        },
        timestamp: new Date().toISOString(),
      };

      // Save the main sale record
      const savedSale = await db.sales.create(newSale);

      // Handle customer data if provided
      if (customerInfo.name || customerInfo.email || customerInfo.phone) {
        try {
          const customerData: any = {
            shopId: currentShop.id,
            totalSpendDelta: cartTotal,
          };

          if (customerInfo.name.trim())
            customerData.name = customerInfo.name.trim();
          if (customerInfo.email.trim())
            customerData.email = customerInfo.email.trim();
          if (customerInfo.phone.trim())
            customerData.phone = customerInfo.phone.trim();

          await db.customers.upsert(customerData);
        } catch (error) {
          console.warn("Failed to save customer data:", error);
        }
      }

      // Update daily sales
      try {
        db.daily_sales.addOrIncrement(
          currentShop.id,
          savedSale.timestamp,
          cartTotal
        );
      } catch (error) {
        console.warn("Failed to update daily sales:", error);
      }

      // Create transaction items
      try {
        const transactionItems = cart.map((item) => ({
          saleId: savedSale.id,
          shopId: currentShop.id,
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.price * item.quantity,
        }));

        await db.transaction_items.bulkCreate(transactionItems);
      } catch (error) {
        console.warn("Failed to save transaction items:", error);
      }

      // Send to server for additional processing (receipts, etc.)
      try {
        // Transform data to match backend expectations
        const serverPayload = {
          shopId: currentShop.id.replace(/^shop_/, ""), // Remove "shop_" prefix
          customer:
            customerInfo.name || customerInfo.email || customerInfo.phone
              ? {
                  name: customerInfo.name || null,
                  email: customerInfo.email || null,
                  phone: customerInfo.phone || null,
                }
              : {},
          items: cart.map((item) => ({
            item_id: null, // Let backend handle this
            inventory_code: item.id,
            name: item.name,
            unit_price: item.price,
            quantity: item.quantity,
          })),
          subtotal: cartTotal,
          discount: 0,
          tax: 0,
          total: cartTotal,
          paymentMethod: selectedPaymentMethod,
          createdAt: savedSale.timestamp,
        };

        await postJSON("/api/sales/complete", serverPayload);
      } catch (error) {
        console.warn("Server notification failed:", error);
      }

      // Reset UI state on successful completion
      clearCart();
      setShowCheckout(false);
      setCardInfo({ number: "", expiry: "", cvv: "", name: "" });
      setCashInfo({ receivedAmount: "" });
      setSelectedReceiptOptions([]);
      setCustomerInfo({ name: "", email: "", phone: "" });
      setCurrentModule("checkout");
    } catch (error) {
      console.error("Checkout failed:", error);
      alert("Payment failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleBackToCart = () => {
    setShowCheckout(false);
  };

  // If showing checkout screen
  if (showCheckout) {
    return (
      <Card
        title="Checkout"
        className="h-full flex flex-col border border-gray-100"
      >
        <div className="flex-1 overflow-y-auto">
          {/* Back Button */}
          <Button
            variant="outline"
            onClick={handleBackToCart}
            icon={<ArrowLeft size={16} />}
            className="mb-4"
          >
            Back to Cart
          </Button>

          {/* Order Summary */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-3">Order Summary</h3>
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.name} × {item.quantity}
                  </span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t mt-3 pt-3 flex justify-between font-semibold">
              <span>Total</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-800 mb-3">Payment Method</h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSelectedPaymentMethod("card")}
                className={`p-4 border rounded-lg flex flex-col items-center space-y-2 ${
                  selectedPaymentMethod === "card"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <CreditCard size={24} />
                <span className="text-sm">Card</span>
              </button>

              <button
                onClick={() => setSelectedPaymentMethod("cash")}
                className={`p-4 border rounded-lg flex flex-col items-center space-y-2 ${
                  selectedPaymentMethod === "cash"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Banknote size={24} />
                <span className="text-sm">Cash</span>
              </button>

              <button
                onClick={() => setSelectedPaymentMethod("mobile")}
                className={`p-4 border rounded-lg flex flex-col items-center space-y-2 ${
                  selectedPaymentMethod === "mobile"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <QrCode size={24} />
                <span className="text-sm">QR Code</span>
              </button>
            </div>
          </div>

          {/* Payment Method Details */}
          {selectedPaymentMethod === "card" && (
            <div className="mb-6 space-y-4">
              <h4 className="font-medium text-gray-800">Card Details</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  value={cardInfo.name}
                  onChange={(e) =>
                    setCardInfo({ ...cardInfo, name: e.target.value })
                  }
                  placeholder="John Doe"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring focus:border-blue-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Card Number
                </label>
                <input
                  type="text"
                  value={cardInfo.number}
                  onChange={(e) => {
                    const value = e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 16);
                    setCardInfo({ ...cardInfo, number: value });
                  }}
                  placeholder="1234 5678 9012 3456"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring focus:border-blue-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    value={cardInfo.expiry}
                    onChange={(e) => {
                      const value = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 4);
                      const formattedValue = value.replace(
                        /(\d{2})(?=\d)/,
                        "$1/"
                      );
                      setCardInfo({ ...cardInfo, expiry: formattedValue });
                    }}
                    placeholder="MM/YY"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring focus:border-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CVV
                  </label>
                  <input
                    type="text"
                    value={cardInfo.cvv}
                    onChange={(e) => {
                      const value = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 3);
                      setCardInfo({ ...cardInfo, cvv: value });
                    }}
                    placeholder="123"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring focus:border-blue-300"
                  />
                </div>
              </div>
            </div>
          )}

          {selectedPaymentMethod === "cash" && (
            <div className="mb-6 space-y-4">
              <h4 className="font-medium text-gray-800">Cash Payment</h4>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-medium">Total Amount:</span>
                  <span className="text-xl font-bold text-green-600">
                    ${cartTotal.toFixed(2)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount Received
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={cashInfo.receivedAmount}
                    onChange={(e) =>
                      setCashInfo({
                        ...cashInfo,
                        receivedAmount: e.target.value,
                      })
                    }
                    placeholder="Enter amount received"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring focus:border-blue-300"
                  />
                </div>
                {cashInfo.receivedAmount && (
                  <div className="mt-4 p-3 bg-white rounded border">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Change:</span>
                      <span
                        className={`text-xl font-bold ${
                          calculateChange() >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        ${calculateChange().toFixed(2)}
                      </span>
                    </div>
                    {calculateChange() < 0 && (
                      <p className="text-sm text-red-600 mt-1">
                        Amount received is insufficient
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedPaymentMethod === "mobile" && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-800 mb-3">
                QR Code Payment
              </h4>
              <div className="p-8 bg-gray-50 rounded-lg text-center">
                <div className="w-32 h-32 bg-white border-2 border-gray-300 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <QrCode size={80} className="text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Scan this QR code to pay
                </p>
                <p className="font-semibold text-lg">${cartTotal.toFixed(2)}</p>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Customer can scan with their mobile banking app or digital
                    wallet
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Receipt Options */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-800 mb-3">Receipt Options</h4>
            <div className="space-y-2">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={selectedReceiptOptions.includes("email")}
                  onChange={() => handleReceiptOptionToggle("email")}
                  className="rounded"
                />
                <Mail size={16} />
                <span className="text-sm">Email Receipt</span>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={selectedReceiptOptions.includes("sms")}
                  onChange={() => handleReceiptOptionToggle("sms")}
                  className="rounded"
                />
                <MessageSquare size={16} />
                <span className="text-sm">SMS Receipt</span>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={selectedReceiptOptions.includes("print")}
                  onChange={() => handleReceiptOptionToggle("print")}
                  className="rounded"
                />
                <Printer size={16} />
                <span className="text-sm">Print Receipt</span>
              </label>
            </div>
          </div>
        </div>

        {/* Complete Checkout Button */}
        <div className="mt-auto pt-4 border-t border-gray-100">
          <Button
            variant="primary"
            fullWidth
            disabled={!isPaymentValid() || saving}
            onClick={handleCompleteCheckout}
          >
            {saving
              ? "Processing..."
              : `Complete Payment - $${cartTotal.toFixed(2)}`}
          </Button>
        </div>
      </Card>
    );
  }

  // Original cart view
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
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
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
                    <h4 className="font-medium text-sm text-gray-800">
                      {item.name}
                    </h4>
                    <p className="text-xs text-gray-500">
                      ${item.price.toFixed(2)}
                    </p>
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
                    <span className="mx-1 w-8 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
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
              <p className="text-sm text-gray-400 mt-1">
                Add items from the product grid
              </p>
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
        <div className="flex items-center justify-between mb-6">
          <span className="text-gray-600">Discount</span>
          <span className="font-medium">$0.00</span>
        </div>
        <div className="flex items-center justify-between text-lg mb-6">
          <span className="font-medium">Total</span>
          <span className="font-semibold">${cartTotal.toFixed(2)}</span>
        </div>

        {/* Customer Information */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer Name
          </label>
          <input
            type="text"
            value={customerInfo.name}
            onChange={(e) =>
              setCustomerInfo({ ...customerInfo, name: e.target.value })
            }
            placeholder="Enter customer name"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring focus:border-blue-300"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer Email
          </label>
          <input
            type="email"
            value={customerInfo.email}
            onChange={(e) =>
              setCustomerInfo({ ...customerInfo, email: e.target.value })
            }
            placeholder="example@email.com"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring focus:border-blue-300"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer Phone Number
          </label>
          <input
            type="tel"
            value={customerInfo.phone}
            onChange={(e) =>
              setCustomerInfo({ ...customerInfo, phone: e.target.value })
            }
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
            onClick={handleProceedToCheckout}
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
