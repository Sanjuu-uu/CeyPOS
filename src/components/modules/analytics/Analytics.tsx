import React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApp } from '../../../context/AppContext';
import { db } from '../../../lib/db';
import type { Customer, Sale } from '../../../types';
import { Card } from './Card';
import { ChatSidebar } from './ChatSidebar';
import { DatabasePreview } from './DatabasePreview';
import analyticsBackground from '../../../assets/images.jpg';

export const Analytics: React.FC = () => {
  const { currentShop } = useApp();
  const [isChatOpen, setIsChatOpen] = React.useState(true);
  const [rangeDays, setRangeDays] = React.useState(30);
  const [sales, setSales] = React.useState<Sale[]>([]);
  const [, setCustomers] = React.useState<Customer[]>([]);

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
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [currentShop]);

  const now = new Date();
  const currentStart = new Date(now);
  currentStart.setHours(0, 0, 0, 0);
  currentStart.setDate(now.getDate() - (rangeDays - 1));
  const previousStart = new Date(currentStart);
  previousStart.setDate(currentStart.getDate() - rangeDays);

  const currentSales = sales.filter((sale) => new Date(sale.timestamp) >= currentStart);
  const previousSales = sales.filter((sale) => {
    const date = new Date(sale.timestamp);
    return date >= previousStart && date < currentStart;
  });
  const revenue = (items: Sale[]) => items.reduce((sum, sale) => sum + sale.total, 0);
  const customers = (items: Sale[]) =>
    new Set(
      items
        .map((sale) => sale.customerInfo?.email || sale.customerInfo?.phone || sale.customerInfo?.name)
        .filter(Boolean),
    ).size;
  const percentChange = (current: number, previous: number) =>
    previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;

  const currentRevenue = revenue(currentSales);
  const previousRevenue = revenue(previousSales);
  const currentAverage = currentSales.length ? currentRevenue / currentSales.length : 0;
  const previousAverage = previousSales.length ? previousRevenue / previousSales.length : 0;
  const currentCustomers = customers(currentSales);
  const previousCustomers = customers(previousSales);
  const metrics = [
    {
      label: 'Total revenue',
      value: `$${currentRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: percentChange(currentRevenue, previousRevenue),
    },
    {
      label: 'Total orders',
      value: currentSales.length.toLocaleString(),
      change: percentChange(currentSales.length, previousSales.length),
    },
    {
      label: 'Average order',
      value: `$${currentAverage.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: percentChange(currentAverage, previousAverage),
    },
    {
      label: 'Unique customers',
      value: currentCustomers.toLocaleString(),
      change: percentChange(currentCustomers, previousCustomers),
    },
  ];

  const bucketDays = rangeDays > 30 ? 7 : 1;
  const chartPoints = Math.ceil(rangeDays / bucketDays);
  const salesByPeriod = Array.from({ length: chartPoints }, (_, index) => {
    const date = new Date(currentStart);
    date.setDate(currentStart.getDate() + (index * bucketDays));
    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + bucketDays);
    return {
      day: date.toLocaleDateString(
        undefined,
        rangeDays <= 7 ? { weekday: 'short' } : { month: 'short', day: 'numeric' },
      ),
      revenue: currentSales
        .filter((sale) => {
          const timestamp = new Date(sale.timestamp);
          return timestamp >= date && timestamp < nextDate;
        })
        .reduce((sum, sale) => sum + sale.total, 0),
    };
  });

  return (
    <div className="-m-4 flex h-[calc(100vh-80px)] min-w-0 overflow-hidden bg-[#f9fafb] md:-m-6">
      <main
        className="min-w-0 flex-1 overflow-y-auto bg-[#f9fafb]"
        style={{
          backgroundImage: `url("${analyticsBackground}")`,
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '100% auto',
        }}
      >
        <div className="mx-auto max-w-[1500px] space-y-5 p-4 md:p-6">
          <div className="page-action-row">
            <p className="page-subheading">Track revenue, orders and customer activity</p>
            <label className="sr-only" htmlFor="analytics-range">Analytics date range</label>
            <select
              id="analytics-range"
              value={rangeDays}
              onChange={(event) => setRangeDays(Number(event.target.value))}
              className="page-action-control w-fit cursor-pointer rounded-full border border-[#dfdfda] bg-white px-6 text-sm font-medium text-[#555550] outline-none transition focus:border-[#b9c94b] focus:ring-2 focus:ring-[#ecff76]/50"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(({ label, value, change }) => {
              const positive = change >= 0;
              return (
                <Card key={label} className="min-h-[150px] !p-5">
                  <div className="flex items-start justify-end">
                    <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${change === 0 ? 'bg-gradient-to-r from-gray-100 to-gray-200 text-[#777773]' : positive ? 'bg-[#ecff76] text-[#313519]' : 'bg-rose-50 text-rose-700'}`}>
                      {change === 0 ? 'No change' : `${positive ? '+' : '-'}${Math.abs(change).toFixed(1)}%`}
                    </span>
                  </div>
                  <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.1em] text-[#858580]">{label}</p>
                  <p className="mt-1 text-[26px] font-semibold leading-none tracking-[-0.04em] text-[#111]">{value}</p>
                </Card>
              );
            })}
          </div>

          <Card title="Revenue performance" subtitle={`Sales recorded during the last ${rangeDays} days`}>
            <div className="relative h-[270px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesByPeriod} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#cfe63b" stopOpacity={0.32} />
                      <stop offset="100%" stopColor="#cfe63b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#ecece8" strokeDasharray="3 3" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#858580', fontSize: 11 }} dy={8} minTickGap={24} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#858580', fontSize: 11 }} tickFormatter={(value) => `$${value}`} />
                  <Tooltip
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                    contentStyle={{ borderRadius: 10, border: '1px solid #e1e1dc', boxShadow: '0 8px 24px rgba(0,0,0,.08)', fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#1b1b1a" strokeWidth={2} fill="url(#revenueFill)" activeDot={{ r: 4, fill: '#ecff76', stroke: '#171717', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
              {currentSales.length === 0 && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="rounded-xl border border-[#e6e6e1] bg-white/95 px-5 py-3 text-center shadow-sm">
                    <p className="text-sm font-medium text-[#333330]">No sales in this period</p>
                    <p className="mt-1 text-xs text-[#81817c]">Completed sales will appear here automatically.</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <DatabasePreview />
        </div>
      </main>

      <ChatSidebar isOpen={isChatOpen} onToggle={() => setIsChatOpen((open) => !open)} />
    </div>
  );
};
