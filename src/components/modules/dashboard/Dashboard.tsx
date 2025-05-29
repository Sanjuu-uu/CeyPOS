import React from 'react';
import { Card } from '../../ui/Card';
import { DollarSign, ShoppingBag, TrendingUp, Users, Package, FileText } from 'lucide-react';
import { db } from '../../../lib/db';
import { useApp } from '../../../context/AppContext';
import { Sale } from '../../../types';

export const Dashboard: React.FC = () => {
  const { currentShop } = useApp();
  
  // Calculate dashboard statistics
  const calculateStats = () => {
    if (!currentShop) return {
      totalSales: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      customerCount: 0
    };
    
    const sales = db.sales.getByShopId(currentShop.id);
    
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    
    // Count unique customers
    const uniqueCustomers = new Set();
    sales.forEach(sale => {
      if (sale.customerInfo?.email) {
        uniqueCustomers.add(sale.customerInfo.email);
      }
    });
    
    return {
      totalSales,
      totalRevenue,
      averageOrderValue,
      customerCount: uniqueCustomers.size
    };
  };
  
  const getRecentSales = (): Sale[] => {
    if (!currentShop) return [];
    const sales = db.sales.getByShopId(currentShop.id);
    // Sort by timestamp, most recent first
    return [...sales]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  };
  
  const stats = calculateStats();
  const recentSales = getRecentSales();
  
  const statCards = [
    {
      title: 'Total Sales',
      value: stats.totalSales.toString(),
      icon: <ShoppingBag size={20} />,
      color: 'bg-blue-50 text-blue-600'
    },
    {
      title: 'Total Revenue',
      value: `$${stats.totalRevenue.toFixed(2)}`,
      icon: <DollarSign size={20} />,
      color: 'bg-green-50 text-green-600'
    },
    {
      title: 'Avg. Order Value',
      value: `$${stats.averageOrderValue.toFixed(2)}`,
      icon: <TrendingUp size={20} />,
      color: 'bg-amber-50 text-amber-600'
    },
    {
      title: 'Customers',
      value: stats.customerCount.toString(),
      icon: <Users size={20} />,
      color: 'bg-purple-50 text-purple-600'
    }
  ];
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <Card key={index} className="border border-gray-100">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${card.color}`}>
                {card.icon}
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{card.title}</p>
                <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card
          title="Recent Sales"
          className="lg:col-span-2 border border-gray-100"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentSales.length > 0 ? (
                  recentSales.map((sale) => (
                    <tr key={sale.id}>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sale.customerInfo?.name || 'Walk-in Customer'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sale.items.length} {sale.items.length === 1 ? 'item' : 'items'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${sale.total.toFixed(2)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(sale.timestamp)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-sm text-center text-gray-500">
                      No recent sales
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
        
        {/* Quick Actions */}
        <Card
          title="Quick Actions"
          className="border border-gray-100"
        >
          <div className="space-y-4">
            <button 
              className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              onClick={() => {}}
            >
              <div className="flex items-center">
                <ShoppingBag className="text-gray-500 mr-3" size={18} />
                <span className="font-medium">New Sale</span>
              </div>
              <span className="text-[#ECFF76]">→</span>
            </button>
            
            <button 
              className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              onClick={() => {}}
            >
              <div className="flex items-center">
                <Package className="text-gray-500 mr-3" size={18} />
                <span className="font-medium">Add Product</span>
              </div>
              <span className="text-[#ECFF76]">→</span>
            </button>
            
            <button 
              className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              onClick={() => {}}
            >
              <div className="flex items-center">
                <FileText className="text-gray-500 mr-3" size={18} />
                <span className="font-medium">Sales Report</span>
              </div>
              <span className="text-[#ECFF76]">→</span>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};