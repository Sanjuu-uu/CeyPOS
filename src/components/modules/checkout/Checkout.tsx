import React, { useState } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { CreditCard, DollarSign, QrCode, Mail, Phone, Check } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { db } from '../../../lib/db';
import { Input } from '../../ui/Input';

type PaymentMethod = 'card' | 'cash' | 'mobile';

export const Checkout: React.FC = () => {
  const { cart, cartTotal, clearCart, setCurrentModule, currentShop } = useApp();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [lastTotal, setLastTotal] = useState(0);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [emailReceipt, setEmailReceipt] = useState(false);
  const [smsReceipt, setSmsReceipt] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const handlePayment = async () => {
    if (cart.length === 0 || !currentShop || isProcessing) return;

    const saleItems = cart.map((item) => ({ ...item }));
    const saleTotal = cartTotal;
    const trimmedEmail = customerEmail.trim();
    const trimmedPhone = customerPhone.trim();
    const hasContactInfo = Boolean(trimmedEmail || trimmedPhone);
    const customerInfo = hasContactInfo
      ? {
          name: 'Customer',
          email: trimmedEmail || '',
          phone: trimmedPhone || '',
        }
      : undefined;

    setErrorMessage(null);
    setIsProcessing(true);

    try {
      await db.sales.create({
        shopId: currentShop.id,
        customerInfo,
        items: saleItems,
        total: saleTotal,
        paymentMethod,
        timestamp: new Date().toISOString(),
      });

      setLastTotal(saleTotal);
      setIsComplete(true);

      if (emailReceipt && trimmedEmail) {
        console.log(`Receipt sent to email: ${trimmedEmail}`);
      }

      if (smsReceipt && trimmedPhone) {
        console.log(`Receipt sent to phone: ${trimmedPhone}`);
      }

      clearCart();
      setTimeout(() => {
        setCurrentModule('dashboard');
      }, 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process payment. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsProcessing(false);
    }
  };
  
  if (cart.length === 0 && !isComplete) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-md mx-auto text-center p-8 border border-gray-100">
          <div className="text-gray-400 mb-4">
            <CreditCard size={48} className="mx-auto" />
          </div>
          <h2 className="text-xl font-medium text-gray-800 mb-2">No Items to Checkout</h2>
          <p className="text-gray-500 mb-6">Your cart is empty. Add items before proceeding to checkout.</p>
          <Button 
            variant="primary" 
            onClick={() => setCurrentModule('pos')}
          >
            Go to POS
          </Button>
        </Card>
      </div>
    );
  }
  
  if (isComplete) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-md mx-auto text-center p-8 border border-gray-100">
          <div className="text-green-500 mb-4">
            <Check size={48} className="mx-auto" />
          </div>
          <h2 className="text-xl font-medium text-gray-800 mb-2">Payment Successful!</h2>
          <p className="text-gray-500 mb-6">
            Total Amount: ${lastTotal.toFixed(2)}
            {(emailReceipt || smsReceipt) && (
              <span className="block mt-2 text-sm">
                Receipt {emailReceipt && smsReceipt ? 'emails and texts' : emailReceipt ? 'emails' : 'texts'} have been sent.
              </span>
            )}
          </p>
          <Button 
            variant="primary" 
            onClick={() => {
              setIsComplete(false);
              setCurrentModule('pos');
            }}
          >
            Start New Sale
          </Button>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Payment Options */}
      <div>
        <Card 
          title="Payment Method" 
          className="mb-6 border border-gray-100"
        >
          <div className="grid grid-cols-3 gap-4 mb-6">
            <button
              className={`p-4 rounded-lg border-2 flex flex-col items-center transition-colors ${
                paymentMethod === 'card'
                  ? 'border-[#ECFF76] bg-[#ECFF76]/10'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
              type="button"
              onClick={() => setPaymentMethod('card')}
              disabled={isProcessing}
            >
              <CreditCard className={`${paymentMethod === 'card' ? 'text-gray-800' : 'text-gray-400'} mb-2`} size={24} />
              <span className={`text-sm font-medium ${paymentMethod === 'card' ? 'text-gray-800' : 'text-gray-500'}`}>
                Card
              </span>
            </button>
            
            <button
              className={`p-4 rounded-lg border-2 flex flex-col items-center transition-colors ${
                paymentMethod === 'cash'
                  ? 'border-[#ECFF76] bg-[#ECFF76]/10'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
              type="button"
              onClick={() => setPaymentMethod('cash')}
              disabled={isProcessing}
            >
              <DollarSign className={`${paymentMethod === 'cash' ? 'text-gray-800' : 'text-gray-400'} mb-2`} size={24} />
              <span className={`text-sm font-medium ${paymentMethod === 'cash' ? 'text-gray-800' : 'text-gray-500'}`}>
                Cash
              </span>
            </button>
            
            <button
              className={`p-4 rounded-lg border-2 flex flex-col items-center transition-colors ${
                paymentMethod === 'mobile'
                  ? 'border-[#ECFF76] bg-[#ECFF76]/10'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
              type="button"
              onClick={() => setPaymentMethod('mobile')}
              disabled={isProcessing}
            >
              <QrCode className={`${paymentMethod === 'mobile' ? 'text-gray-800' : 'text-gray-400'} mb-2`} size={24} />
              <span className={`text-sm font-medium ${paymentMethod === 'mobile' ? 'text-gray-800' : 'text-gray-500'}`}>
                Mobile
              </span>
            </button>
          </div>
          
          {paymentMethod === 'card' && (
            <div className="space-y-4">
              <Input
                label="Card Number"
                placeholder="•••• •••• •••• ••••"
                disabled={isProcessing}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Expiry Date"
                  placeholder="MM/YY"
                  disabled={isProcessing}
                />
                <Input
                  label="CVC"
                  placeholder="•••"
                  disabled={isProcessing}
                />
              </div>
            </div>
          )}
          
          {paymentMethod === 'cash' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Amount Due:</span>
                <span className="font-medium text-gray-800">${cartTotal.toFixed(2)}</span>
              </div>
              <Input
                label="Amount Received"
                type="number"
                min={cartTotal}
                step="0.01"
                defaultValue={cartTotal.toFixed(2)}
                disabled={isProcessing}
              />
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Change:</span>
                <span className="font-medium text-gray-800">$0.00</span>
              </div>
            </div>
          )}
          
          {paymentMethod === 'mobile' && (
            <div className="text-center p-4">
              <div className="bg-white p-2 rounded-lg inline-block mb-4">
                <div className="w-48 h-48 bg-gray-100 rounded flex items-center justify-center">
                  <QrCode size={120} className="text-gray-700" />
                </div>
              </div>
              <p className="text-gray-600 mb-2">Scan this QR code with a mobile payment app</p>
              <p className="text-sm text-gray-500">Amount: ${cartTotal.toFixed(2)}</p>
            </div>
          )}
        </Card>
        
        <Card 
          title="Receipt Options" 
          className="border border-gray-100"
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="emailReceipt"
                checked={emailReceipt}
                onChange={() => setEmailReceipt(!emailReceipt)}
                className="h-4 w-4 text-[#ECFF76] focus:ring-[#ECFF76]/50 border-gray-300 rounded"
                disabled={isProcessing}
              />
              <label htmlFor="emailReceipt" className="text-sm text-gray-700 font-medium">
                Email Receipt
              </label>
            </div>
            
            {emailReceipt && (
              <Input
                leftIcon={<Mail size={16} />}
                placeholder="customer@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                disabled={isProcessing}
              />
            )}
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="smsReceipt"
                checked={smsReceipt}
                onChange={() => setSmsReceipt(!smsReceipt)}
                className="h-4 w-4 text-[#ECFF76] focus:ring-[#ECFF76]/50 border-gray-300 rounded"
                disabled={isProcessing}
              />
              <label htmlFor="smsReceipt" className="text-sm text-gray-700 font-medium">
                SMS Receipt
              </label>
            </div>
            
            {smsReceipt && (
              <Input
                leftIcon={<Phone size={16} />}
                placeholder="(123) 456-7890"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                disabled={isProcessing}
              />
            )}
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="printReceipt"
                defaultChecked
                className="h-4 w-4 text-[#ECFF76] focus:ring-[#ECFF76]/50 border-gray-300 rounded"
                disabled={isProcessing}
              />
              <label htmlFor="printReceipt" className="text-sm text-gray-700 font-medium">
                Print Receipt
              </label>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Order Summary */}
      <div>
        <Card 
          title="Order Summary" 
          className="border border-gray-100"
        >
          <div className="space-y-4">
            {/* Items list */}
            <div className="max-h-80 overflow-y-auto space-y-3">
              {cart.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 text-sm text-gray-700">
                <span className="w-1/2 truncate">{item.name}</span>
                <span className="w-1/4 text-center">${item.price.toFixed(2)} × {item.quantity}</span>
                <span className="w-1/4 text-right font-medium">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}

            </div>
            
            {/* Totals */}
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">${cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span className="font-medium">$0.00</span>
              </div>
              <div className="flex justify-between text-lg pt-2 border-t border-gray-100">
                <span className="font-medium">Total</span>
                <span className="font-semibold">${cartTotal.toFixed(2)}</span>
              </div>
            </div>
            
            {errorMessage && (
              <div className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {errorMessage}
              </div>
            )}

            {/* Payment Button */}
            <Button
              variant="primary"
              fullWidth
              size="lg"
              disabled={isProcessing || cart.length === 0}
              onClick={handlePayment}
              className="mt-4"
              icon={isProcessing ? undefined : <CreditCard size={18} />}
            >
              {isProcessing ? 'Processing...' : `Pay $${cartTotal.toFixed(2)}`}
            </Button>
            
            <Button
              variant="outline"
              fullWidth
              onClick={() => setCurrentModule('pos')}
              disabled={isProcessing}
            >
              Back to POS
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};