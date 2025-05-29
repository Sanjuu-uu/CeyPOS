import React from 'react';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { Search, Printer, Mail, Phone, Download, Receipt } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { db } from '../../../lib/db';
import { Sale } from '../../../types';

export const Receipts: React.FC = () => {
  const { currentShop } = useApp();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedReceipt, setSelectedReceipt] = React.useState<Sale | null>(null);
  
  // Get all sales for the current shop
  const sales = currentShop ? db.sales.getByShopId(currentShop.id) : [];
  
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
                    selectedReceipt?.id === sale.id
                      ? 'border-[#ECFF76] bg-[#ECFF76]/10'
                      : 'border-gray-100 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedReceipt(sale)}
                >
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-gray-800">
                      #{sale.id.split('_')[1]}
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
                <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700">
                  <Printer size={18} />
                </button>
                <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700">
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
                  <span>Receipt #: {selectedReceipt.id.split('_')[1]}</span>
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
                  defaultValue={selectedReceipt.customerInfo?.email || ''}
                />
                <Button
                  variant="primary"
                  icon={<Mail size={16} />}
                >
                  Send
                </Button>
              </div>
              <div className="flex space-x-3">
                <Input
                  placeholder="Phone number"
                  leftIcon={<Phone size={16} />}
                  defaultValue={selectedReceipt.customerInfo?.phone || ''}
                />
                <Button
                  variant="primary"
                  icon={<Phone size={16} />}
                >
                  Send
                </Button>
              </div>
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