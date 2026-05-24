import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { Search, Printer, Mail, Phone, Download, Receipt, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { db } from '../../../lib/db';
import { Sale } from '../../../types';
import { sendEmailReceipt } from '../../../lib/emailReceipt';
import { sendSmsReceipt } from '../../../lib/smsReceipt';
import { printReceipt } from '../../../lib/receiptPrinter';

interface SalesUpdatedPayload {
  shopId?: string;
  items?: Sale[];
}

interface SaleCreatedPayload {
  shopId?: string;
}

const isSalesUpdatedPayload = (payload: unknown): payload is SalesUpdatedPayload =>
  Boolean(
    payload &&
      typeof payload === 'object' &&
      typeof (payload as SalesUpdatedPayload).shopId === 'string'
  );

const isSaleCreatedPayload = (payload: unknown): payload is SaleCreatedPayload =>
  Boolean(
    payload &&
      typeof payload === 'object' &&
      typeof (payload as SaleCreatedPayload).shopId === 'string'
  );

type EmailSendState =
  | { status: 'idle' }
  | { status: 'sending' }
  | { status: 'sent'; url?: string }
  | { status: 'error'; message: string };

export const Receipts: React.FC = () => {
  const { currentShop, currentUser } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailState, setEmailState] = useState<EmailSendState>({ status: 'idle' });
  const [smsRecipient, setSmsRecipient] = useState('');
  const [smsState, setSmsState] = useState<EmailSendState>({ status: 'idle' });
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (!currentShop) {
      setSales([]);
      setSelectedSaleId(null);
      return;
    }

    const shopId = currentShop.id;

    const applySales = (nextSales: Sale[]) => {
      setSales(nextSales);
      if (!nextSales.length) {
        setSelectedSaleId(null);
        return;
      }
      setSelectedSaleId((prevId) => {
        if (!prevId) {
          return nextSales[0].id;
        }
        return nextSales.some((sale) => sale.id === prevId)
          ? prevId
          : nextSales[0].id;
      });
    };

    const bootstrap = () => {
      const currentSales = db.sales.getByShopId(shopId);
      applySales(currentSales);
    };

    const handleSalesUpdated = (payload: unknown) => {
      if (!isSalesUpdatedPayload(payload) || payload.shopId !== shopId) {
        return;
      }
      const items = Array.isArray(payload.items)
        ? payload.items
        : db.sales.getByShopId(shopId);
      applySales(items);
    };

    const handleSaleCreated = (payload: unknown) => {
      if (!isSaleCreatedPayload(payload) || payload.shopId !== shopId) {
        return;
      }
      bootstrap();
    };

    bootstrap();

    const unsubscribeUpdated = db.on('salesUpdated', handleSalesUpdated);
    const unsubscribeCreated = db.on('saleCreated', handleSaleCreated);

    return () => {
      if (typeof unsubscribeUpdated === 'function') {
        unsubscribeUpdated();
      } else {
        db.off('salesUpdated', handleSalesUpdated);
      }

      if (typeof unsubscribeCreated === 'function') {
        unsubscribeCreated();
      } else {
        db.off('saleCreated', handleSaleCreated);
      }
    };
  }, [currentShop]);

  const selectedReceipt = useMemo(
    () => (selectedSaleId ? sales.find((sale) => sale.id === selectedSaleId) ?? null : null),
    [selectedSaleId, sales]
  );

  useEffect(() => {
    setEmailRecipient(selectedReceipt?.customerInfo?.email ?? '');
    setSmsRecipient(selectedReceipt?.customerInfo?.phone ?? '');
    setEmailState({ status: 'idle' });
    setSmsState({ status: 'idle' });
  }, [selectedReceipt?.id]);

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const isValidPhone = (value: string) =>
    String(value || '').replace(/\D+/g, '').length >= 9;

  const handleSendEmail = async () => {
    if (!selectedReceipt || !currentShop) return;
    const recipient = emailRecipient.trim();
    if (!isValidEmail(recipient)) {
      setEmailState({ status: 'error', message: 'Enter a valid email address.' });
      return;
    }
    setEmailState({ status: 'sending' });
    const result = await sendEmailReceipt(
      currentShop.id,
      {
        id: selectedReceipt.id,
        transactionCode: selectedReceipt.id,
        customerInfo: {
          name: selectedReceipt.customerInfo?.name || '',
          email: recipient,
          phone: selectedReceipt.customerInfo?.phone || '',
        },
        shop: {
          name: currentShop.name,
          address: currentShop.address,
          contact: currentShop.contact,
        },
        items: selectedReceipt.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal: selectedReceipt.subtotal ?? selectedReceipt.total,
        tax: selectedReceipt.tax ?? 0,
        discount: selectedReceipt.discount ?? 0,
        total: selectedReceipt.total,
        paymentMethod: selectedReceipt.paymentMethod,
        currency: currentShop.currency ?? '$',
        timestamp: selectedReceipt.timestamp,
        receiptNumber: receiptNumber(selectedReceipt.id),
        pointsEarned: selectedReceipt.pointsEarned,
        pointsRedeemed: selectedReceipt.pointsRedeemed,
      },
      recipient,
    );
    if (result.ok) {
      setEmailState({ status: 'sent', url: result.url });
    } else {
      setEmailState({
        status: 'error',
        message: result.message || result.error || 'Failed to send email',
      });
    }
  };

  const handlePrint = async () => {
    if (!selectedReceipt || !currentShop || isPrinting) return;
    setIsPrinting(true);
    try {
      const saleForMint = {
        id: selectedReceipt.id,
        transactionCode: selectedReceipt.id,
        customerInfo: selectedReceipt.customerInfo,
        shop: {
          name: currentShop.name,
          address: currentShop.address,
          contact: currentShop.contact,
        },
        items: selectedReceipt.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal: selectedReceipt.subtotal ?? selectedReceipt.total,
        tax: selectedReceipt.tax ?? 0,
        discount: selectedReceipt.discount ?? 0,
        total: selectedReceipt.total,
        paymentMethod: selectedReceipt.paymentMethod,
        currency: currentShop.currency ?? '$',
        timestamp: selectedReceipt.timestamp,
        receiptNumber: selectedReceipt.id,
      };
      await printReceipt(
        {
          shop: {
            name: currentShop.name,
            address: currentShop.address,
            contact: currentShop.contact,
          },
          customer: selectedReceipt.customerInfo
            ? {
                name: selectedReceipt.customerInfo.name,
                email: selectedReceipt.customerInfo.email,
                phone: selectedReceipt.customerInfo.phone,
              }
            : null,
          items: selectedReceipt.items.map((item) => ({
            name: item.name,
            code: String(item.id || ''),
            quantity: item.quantity,
            price: item.price,
          })),
          subtotal: saleForMint.subtotal,
          tax: saleForMint.tax,
          discount: saleForMint.discount,
          total: saleForMint.total,
          paymentMethod: saleForMint.paymentMethod,
          currency: saleForMint.currency,
          timestamp: saleForMint.timestamp,
          receiptNumber: selectedReceipt.id,
          cashier: currentUser?.name || '',
          pointsEarned: selectedReceipt.pointsEarned,
          pointsRedeemed: selectedReceipt.pointsRedeemed,
        },
        {
          userId: currentUser?.id || 'default',
          shopId: currentShop.id,
          sale: saleForMint,
        },
      );
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSendSms = async () => {
    if (!selectedReceipt || !currentShop) return;
    const recipient = smsRecipient.trim();
    if (!isValidPhone(recipient)) {
      setSmsState({ status: 'error', message: 'Enter a valid phone number.' });
      return;
    }
    setSmsState({ status: 'sending' });
    const result = await sendSmsReceipt(
      currentShop.id,
      {
        id: selectedReceipt.id,
        transactionCode: selectedReceipt.id,
        customerInfo: {
          name: selectedReceipt.customerInfo?.name || '',
          email: selectedReceipt.customerInfo?.email || '',
          phone: recipient,
        },
        shop: {
          name: currentShop.name,
          address: currentShop.address,
          contact: currentShop.contact,
        },
        items: selectedReceipt.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal: selectedReceipt.subtotal ?? selectedReceipt.total,
        tax: selectedReceipt.tax ?? 0,
        discount: selectedReceipt.discount ?? 0,
        total: selectedReceipt.total,
        paymentMethod: selectedReceipt.paymentMethod,
        currency: currentShop.currency ?? '$',
        timestamp: selectedReceipt.timestamp,
        receiptNumber: receiptNumber(selectedReceipt.id),
        pointsEarned: selectedReceipt.pointsEarned,
        pointsRedeemed: selectedReceipt.pointsRedeemed,
      },
      recipient,
    );
    if (result.ok) {
      setSmsState({ status: 'sent', url: result.url });
    } else {
      setSmsState({
        status: 'error',
        message: result.message || result.error || 'Failed to send SMS',
      });
    }
  };

  // Canonical raw id (used for keys, lookups, anything programmatic).
  const receiptNumber = (saleId: string) => {
    const parts = saleId.split('_').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : saleId;
  };

  // Human-facing invoice label. Must match the server-side formatter in
  // server/src/services/receipt-snapshot.js so the receipts list, the
  // email's "Invoice No" row, and the SMS body all show identical text.
  const formatInvoiceLabel = (saleId: string) => {
    const raw = receiptNumber(saleId);
    if (/^INV-/i.test(raw)) return raw.toUpperCase();
    const cleaned = raw.replace(/[^a-zA-Z0-9]/g, '');
    if (!cleaned) return 'INV-00000000';
    return `INV-${cleaned.slice(-8).toUpperCase().padStart(8, '0')}`;
  };
  
  // Filter sales based on search term
  const filteredSales = searchTerm 
    ? sales.filter(sale => 
        sale.id.includes(searchTerm) || 
        sale.customerInfo?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.customerInfo?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : sales;
  
  // Sort sales by timestamp (most recent first)
  const sortedSales = [...filteredSales].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Side - Receipt List */}
      <div className="lg:col-span-1">
        <Card 
          title="Receipts" 
          className="border border-gray-100"
        >
          <div className="mb-4">
            <Input
              placeholder="Search receipts..."
              leftIcon={<Search size={18} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {sortedSales.length > 0 ? (
              sortedSales.map((sale) => (
                <div
                  key={sale.id}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedSaleId === sale.id
                      ? 'border-[#ECFF76] bg-[#ECFF76]/10'
                      : 'border-gray-100 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedSaleId(sale.id)}
                >
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-gray-800 font-mono text-xs">
                      {formatInvoiceLabel(sale.id)}
                    </span>
                    <span className="text-sm text-gray-500">
                      ${sale.total.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">
                      {sale.customerInfo?.name || 'Walk-in Customer'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(sale.timestamp)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No receipts found
              </div>
            )}
          </div>
        </Card>
      </div>
      
      {/* Right Side - Receipt Detail */}
      <div className="lg:col-span-2">
        {selectedReceipt ? (
          <Card 
            title="Receipt Details" 
            className="border border-gray-100"
            actions={
              <div className="flex space-x-2">
                <button
                  onClick={handlePrint}
                  disabled={isPrinting}
                  title="Print receipt"
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-wait"
                >
                  {isPrinting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Printer size={18} />
                  )}
                </button>
                <button
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                  title="Download (coming soon)"
                  disabled
                >
                  <Download size={18} />
                </button>
              </div>
            }
          >
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              {/* Receipt Header */}
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-800">
                  {currentShop?.name || 'Natural Foods Market'}
                </h3>
                <p className="text-gray-500 text-sm">
                  {currentShop?.address || '123 Green St, Eco City'}
                </p>
                <p className="text-gray-500 text-sm">
                  {currentShop?.contact || '+1 (555) 123-4567'}
                </p>
                <div className="border-b-2 border-dashed border-gray-200 my-4"></div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span className="font-mono">
                    {formatInvoiceLabel(selectedReceipt.id)}
                  </span>
                  <span>{formatDate(selectedReceipt.timestamp)}</span>
                </div>
              </div>
              
              {/* Items */}
              <div className="mb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-2 text-left text-gray-600">Item</th>
                      <th className="py-2 text-center text-gray-600">Qty</th>
                      <th className="py-2 text-right text-gray-600">Price</th>
                      <th className="py-2 text-right text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReceipt.items.map((item, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-3 text-gray-800">{item.name}</td>
                        <td className="py-3 text-center text-gray-600">{item.quantity}</td>
                        <td className="py-3 text-right text-gray-600">${item.price.toFixed(2)}</td>
                        <td className="py-3 text-right text-gray-800">${(item.price * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Totals */}
              <div className="space-y-2 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-800">${selectedReceipt.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span className="text-gray-800">$0.00</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-medium text-gray-800">Total</span>
                  <span className="font-semibold text-gray-800">${selectedReceipt.total.toFixed(2)}</span>
                </div>
              </div>
              
              {/* Payment Info */}
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="text-gray-800 capitalize">{selectedReceipt.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className="text-gray-800">${selectedReceipt.total.toFixed(2)}</span>
                </div>
              </div>
              
              {/* Thank You Message */}
              <div className="text-center mt-6">
                <p className="text-gray-600">Thank you for shopping with us!</p>
              </div>
            </div>
            
            {/* Send Receipt Actions */}
            <div className="mt-6 space-y-4">
              <h4 className="font-medium text-gray-700">Send Receipt</h4>
              <div className="flex space-x-3">
                <Input
                  placeholder="Email address"
                  leftIcon={<Mail size={16} />}
                  value={emailRecipient}
                  onChange={(e) => {
                    setEmailRecipient(e.target.value);
                    if (emailState.status !== 'idle') {
                      setEmailState({ status: 'idle' });
                    }
                  }}
                />
                <Button
                  variant="primary"
                  icon={
                    emailState.status === 'sending' ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Mail size={16} />
                    )
                  }
                  onClick={handleSendEmail}
                  disabled={
                    emailState.status === 'sending' ||
                    !isValidEmail(emailRecipient)
                  }
                >
                  {emailState.status === 'sending' ? 'Sending…' : 'Send'}
                </Button>
              </div>
              {emailState.status === 'sent' && (
                <div className="flex items-start gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
                  <div>
                    Receipt emailed to <strong>{emailRecipient}</strong>.
                    {emailState.url && (
                      <>
                        {' '}
                        <a
                          href={emailState.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline decoration-green-400 hover:decoration-green-700"
                        >
                          Open link
                        </a>
                      </>
                    )}
                  </div>
                </div>
              )}
              {emailState.status === 'error' && (
                <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                  <div>{emailState.message}</div>
                </div>
              )}
              <div className="flex space-x-3">
                <Input
                  placeholder="Phone number (e.g. 0771234567)"
                  leftIcon={<Phone size={16} />}
                  value={smsRecipient}
                  onChange={(e) => {
                    setSmsRecipient(e.target.value);
                    if (smsState.status !== 'idle') {
                      setSmsState({ status: 'idle' });
                    }
                  }}
                />
                <Button
                  variant="primary"
                  icon={
                    smsState.status === 'sending' ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Phone size={16} />
                    )
                  }
                  onClick={handleSendSms}
                  disabled={
                    smsState.status === 'sending' ||
                    !isValidPhone(smsRecipient)
                  }
                >
                  {smsState.status === 'sending' ? 'Sending…' : 'Send'}
                </Button>
              </div>
              {smsState.status === 'sent' && (
                <div className="flex items-start gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
                  <div>
                    SMS sent to <strong>{smsRecipient}</strong>.
                    {smsState.url && (
                      <>
                        {' '}
                        <a
                          href={smsState.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline decoration-green-400 hover:decoration-green-700"
                        >
                          Open link
                        </a>
                      </>
                    )}
                  </div>
                </div>
              )}
              {smsState.status === 'error' && (
                <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                  <div>{smsState.message}</div>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <Card className="h-full flex items-center justify-center border border-gray-100">
            <div className="text-center p-6">
              <div className="text-gray-300 mb-4">
                <Receipt size={48} />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">No Receipt Selected</h3>
              <p className="text-gray-500">
                Select a receipt from the list to view details
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};