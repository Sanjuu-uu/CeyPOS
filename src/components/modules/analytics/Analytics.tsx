import React from 'react';
import { Card } from './Card';
import { DatabasePreview } from './DatabasePreview';
import { ChatSidebar } from './ChatSidebar';
import { useApp } from '../../../context/AppContext';
import { db } from '../../../lib/db';
import type { Customer, Sale } from '../../../types';

export const Analytics: React.FC = () => {
  const { currentShop } = useApp();
  const [isChatOpen, setIsChatOpen] = React.useState(true);
  const [sales, setSales] = React.useState<Sale[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);

  React.useEffect(() => {
    if (!currentShop) {
      setSales([]);
      setCustomers([]);
      return;
    }

    const refresh = (payload?: unknown) => {
      const eventShopId = (payload as { shopId?: string } | undefined)?.shopId;
      if (eventShopId && eventShopId !== currentShop.id) return;
      setSales(db.sales.getByShopId(currentShop.id));
      setCustomers(db.customers.getByShopId(currentShop.id));
    };

    refresh();

    const unsubscribers = [
      db.on('salesUpdated', refresh),
      db.on('saleCreated', refresh),
      db.on('customersUpdated', refresh),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [currentShop]);

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalOrders = sales.length;
  const uniqueCustomers = new Set(
    customers
      .map((customer) => customer.email || customer.phone || customer.id)
      .filter(Boolean),
  ).size;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <div className="-m-6 flex h-[calc(100vh-64px)] min-w-0 overflow-hidden bg-gray-50">
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card title="Total Revenue" subtitle={`$${totalRevenue.toFixed(2)}`} className="border border-gray-200" />
            <Card title="Total Orders" subtitle={`${totalOrders}`} className="border border-gray-200" />
            <Card title="Avg. Order Value" subtitle={`$${avgOrderValue.toFixed(2)}`} className="border border-gray-200" />
            <Card title="Unique Customers" subtitle={`${uniqueCustomers}`} className="border border-gray-200" />
          </div>

          <Card
            title="AI-driven visualizations"
            subtitle="Gemini crafts narratives while AntV renders hosted charts"
            className="border border-gray-200"
          >
            <p className="text-sm leading-relaxed text-gray-600">
              Ask the assistant for trends, comparisons, or forecasts. When the AntV visualization
              service is configured, charts will appear directly inside the conversation as hosted
              images that stay up to date with your analytics query.
            </p>
          </Card>

          <DatabasePreview />
        </div>
      </main>

      <ChatSidebar isOpen={isChatOpen} onToggle={() => setIsChatOpen((open) => !open)} />
    </div>
  );
};
