import React, { useState } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { 
  Download, 
  DollarSign,
  Package,
  Users
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { db } from '../../../lib/db';

export const Reports: React.FC = () => {
  const { currentShop } = useApp();
  const [selectedReport, setSelectedReport] = useState('sales');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end: new Date().toISOString().split('T')[0] // today
  });

  // Get sales data for the current shop
  const sales = currentShop ? db.sales.getByShopId(currentShop.id) : [];
  const products = currentShop ? db.products.getByShopId(currentShop.id) : [];

  // Filter sales by date range
  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.timestamp).toISOString().split('T')[0];
    return saleDate >= dateRange.start && saleDate <= dateRange.end;
  });

  // Calculate report data
  const calculateSalesReport = () => {
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalTransactions = filteredSales.length;
    const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Sales by payment method
    const paymentMethods = filteredSales.reduce((acc, sale) => {
      acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + sale.total;
      return acc;
    }, {} as Record<string, number>);

    // Daily sales
    const dailySales = filteredSales.reduce((acc, sale) => {
      const date = new Date(sale.timestamp).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + sale.total;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRevenue,
      totalTransactions,
      averageOrderValue,
      paymentMethods,
      dailySales
    };
  };

  const calculateInventoryReport = () => {
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, product) => sum + (product.price * product.stock), 0);
    const lowStockItems = products.filter(product => product.stock < 10);
    
    // Category breakdown
    const categoryBreakdown = products.reduce((acc, product) => {
      if (!acc[product.category]) {
        acc[product.category] = { count: 0, value: 0 };
      }
      acc[product.category].count++;
      acc[product.category].value += product.price * product.stock;
      return acc;
    }, {} as Record<string, { count: number; value: number }>);

    return {
      totalProducts,
      totalValue,
      lowStockItems,
      categoryBreakdown
    };
  };

  const calculateCustomerReport = () => {
    const uniqueCustomers = new Set();
    const customerPurchases: Record<string, { total: number; count: number }> = {};

    filteredSales.forEach(sale => {
      if (sale.customerInfo?.email) {
        uniqueCustomers.add(sale.customerInfo.email);
        
        if (!customerPurchases[sale.customerInfo.email]) {
          customerPurchases[sale.customerInfo.email] = { total: 0, count: 0 };
        }
        customerPurchases[sale.customerInfo.email].total += sale.total;
        customerPurchases[sale.customerInfo.email].count++;
      }
    });

    const topCustomers = Object.entries(customerPurchases)
      .sort(([,a], [,b]) => b.total - a.total)
      .slice(0, 10);

    return {
      totalCustomers: uniqueCustomers.size,
      repeatCustomers: Object.values(customerPurchases).filter(p => p.count > 1).length,
      topCustomers
    };
  };

  const salesReport = calculateSalesReport();
  const inventoryReport = calculateInventoryReport();
  const customerReport = calculateCustomerReport();

  const reportTypes = [
    { id: 'sales', name: 'Sales Report', icon: <DollarSign size={18} /> },
    { id: 'inventory', name: 'Inventory Report', icon: <Package size={18} /> },
    { id: 'customers', name: 'Customer Report', icon: <Users size={18} /> },
  ];

  const downloadReport = (type: string) => {
    // In a real app, this would generate and download a PDF/Excel file
    alert(`Downloading ${type} report...`);
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
          <p className="text-gray-600">Generate detailed business reports</p>
        </div>
        <Button
          variant="primary"
          icon={<Download size={16} />}
          onClick={() => downloadReport(selectedReport)}
        >
          Download Report
        </Button>
      </div>

      {/* Date Range Filter */}
      <Card title="Date Range" className="border border-gray-100">
        <div className="flex space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>
        </div>
      </Card>

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reportTypes.map((report) => (
          <div
            key={report.id}
            className={`cursor-pointer transition-colors border-2 rounded-xl ${
              selectedReport === report.id
                ? 'border-[#ECFF76] bg-[#ECFF76]/10'
                : 'border-gray-100 hover:bg-gray-50'
            }`}
            onClick={() => setSelectedReport(report.id)}
          >
            <Card>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  {report.icon}
                </div>
                <span className="font-medium">{report.name}</span>
              </div>
            </Card>
          </div>
        ))}
      </div>

      {/* Report Content */}
      {selectedReport === 'sales' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Overview */}
          <Card title="Sales Overview" className="border border-gray-100">
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Revenue</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(salesReport.totalRevenue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Transactions</span>
                <span className="font-semibold">{salesReport.totalTransactions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Average Order Value</span>
                <span className="font-semibold">
                  {formatCurrency(salesReport.averageOrderValue)}
                </span>
              </div>
            </div>
          </Card>

          {/* Payment Methods */}
          <Card title="Payment Methods" className="border border-gray-100">
            <div className="space-y-3">
              {Object.entries(salesReport.paymentMethods).map(([method, amount]) => (
                <div key={method} className="flex justify-between">
                  <span className="text-gray-600 capitalize">{method}</span>
                  <span className="font-medium">{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Daily Sales */}
          <Card title="Daily Sales" className="lg:col-span-2 border border-gray-100">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Object.entries(salesReport.dailySales)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([date, amount]) => (
                  <div key={date} className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">{new Date(date).toLocaleDateString()}</span>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      )}

      {selectedReport === 'inventory' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inventory Overview */}
          <Card title="Inventory Overview" className="border border-gray-100">
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Products</span>
                <span className="font-semibold">{inventoryReport.totalProducts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Inventory Value</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(inventoryReport.totalValue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Low Stock Items</span>
                <span className="font-semibold text-red-600">
                  {inventoryReport.lowStockItems.length}
                </span>
              </div>
            </div>
          </Card>

          {/* Category Breakdown */}
          <Card title="Category Breakdown" className="border border-gray-100">
            <div className="space-y-3">
              {Object.entries(inventoryReport.categoryBreakdown).map(([category, data]) => (
                <div key={category} className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{category}</span>
                    <span className="font-medium">{data.count} items</span>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    {formatCurrency(data.value)}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Low Stock Alert */}
          <Card title="Low Stock Alert" className="lg:col-span-2 border border-gray-100">
            {inventoryReport.lowStockItems.length > 0 ? (
              <div className="space-y-2">
                {inventoryReport.lowStockItems.map((product) => (
                  <div key={product.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <div>
                      <span className="font-medium">{product.name}</span>
                      <span className="text-sm text-gray-500 ml-2">({product.category})</span>
                    </div>
                    <span className="text-red-600 font-medium">{product.stock} remaining</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">All products are well stocked!</p>
            )}
          </Card>
        </div>
      )}

      {selectedReport === 'customers' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Overview */}
          <Card title="Customer Overview" className="border border-gray-100">
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Customers</span>
                <span className="font-semibold">{customerReport.totalCustomers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Repeat Customers</span>
                <span className="font-semibold text-green-600">
                  {customerReport.repeatCustomers}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Retention Rate</span>
                <span className="font-semibold">
                  {customerReport.totalCustomers > 0 
                    ? Math.round((customerReport.repeatCustomers / customerReport.totalCustomers) * 100)
                    : 0}%
                </span>
              </div>
            </div>
          </Card>

          {/* Top Customers */}
          <Card title="Top Customers" className="border border-gray-100">
            <div className="space-y-3">
              {customerReport.topCustomers.slice(0, 5).map(([email, data], index) => (
                <div key={email} className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">#{index + 1}</div>
                    <div className="text-sm text-gray-500">{email}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(data.total)}</div>
                    <div className="text-sm text-gray-500">{data.count} orders</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};