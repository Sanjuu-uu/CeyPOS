import React from 'react';
import { Card } from './Card';
import { DatabasePreview } from './DatabasePreview';
import { ChatSidebar } from './ChatSidebar';
import { useApp } from '../../../context/AppContext';
import { db } from '../../../lib/db';

export const Analytics: React.FC = () => {
  const { currentShop } = useApp();
  const [isChatOpen, setIsChatOpen] = React.useState(true);

  // Basic KPI metrics stay local to give operators quick context
  const sales = currentShop ? db.sales.getByShopId(currentShop.id) : [];
  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalOrders = sales.length;
  const uniqueCustomers = new Set(
    sales.map((s) => s.customerInfo?.email || s.customerInfo?.phone).filter(Boolean)
  ).size;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const handleChatToggle = () => {
    setIsChatOpen(!isChatOpen);
  };

  return (
    <>
      {/* Chat Sidebar */}
      <ChatSidebar isOpen={isChatOpen} onToggle={handleChatToggle} />
      
      {/* Main Content */}
      <div className={`transition-all duration-300 ${isChatOpen ? 'mr-80' : 'mr-0'}`}>
        <div className="space-y-8 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card title="Total Revenue" subtitle={`$${totalRevenue.toFixed(2)}`} />
            <Card title="Total Orders" subtitle={`${totalOrders}`} />
            <Card title="Avg. Order Value" subtitle={`$${avgOrderValue.toFixed(2)}`} />
            <Card title="Unique Customers" subtitle={`${uniqueCustomers}`} />
          </div>

          <Card
            title="AI-driven visualizations"
            subtitle="Gemini crafts narratives while AntV renders hosted charts"
          >
            <p className="text-sm text-gray-600 leading-relaxed">
              Ask the assistant for trends, comparisons, or forecasts. When the AntV visualization
              service is configured, charts will appear directly inside the conversation as hosted
              images that stay up to date with your analytics query.
            </p>
          </Card>

          <DatabasePreview />
        </div>
      </div>
    </>
  );
};
