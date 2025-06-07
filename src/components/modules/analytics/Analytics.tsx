import React from 'react';
import { Card } from '../../../components/modules/analytics/Card';
import { useApp } from '../../../context/AppContext';
import { db } from '../../../lib/db';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Input } from '../../ui/Input';
import { Send } from 'lucide-react';

export const Analytics: React.FC = () => {
  const { currentShop } = useApp();
  const [chatInput, setChatInput] = React.useState('');
  const [chatMessages, setChatMessages] = React.useState([
    { sender: 'ai', message: 'Hello! I can help you analyze your sales data. What would you like to know?' }
  ]);

  // === Fetch & compute data ===
  const sales = currentShop ? db.sales.getByShopId(currentShop.id) : [];

  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalOrders = sales.length;
  const uniqueCustomers = new Set(sales.map(s => s.customerId)).size;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const prepareSalesByDay = () => {
    const now = Date.now();
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const data = days.map(name => ({ name, orders: 0, revenue: 0 }));
    sales.forEach(sale => {
      const t = new Date(sale.timestamp).getTime();
      if (now - t < 7 * 24 * 60 * 60 * 1000) {
        const idx = new Date(t).getDay();
        data[idx].orders++;
        data[idx].revenue += sale.total;
      }
    });
    return data;
  };

  const salesByDay = prepareSalesByDay();

  const categoryMap: Record<string, number> = {};
  sales.forEach(sale =>
    sale.items.forEach(item => {
      const rev = item.price * item.quantity;
      categoryMap[item.category] = (categoryMap[item.category] || 0) + rev;
    })
  );
  const categoryData = Object.entries(categoryMap).map(
    ([name, sales]) => ({ name, sales })
  );

  const prepareTopProducts = () => {
    const pMap: Record<string, number> = {};
    sales.forEach(sale =>
      sale.items.forEach(item => {
        const rev = item.price * item.quantity;
        pMap[item.name] = (pMap[item.name] || 0) + rev;
      })
    );
    return Object.entries(pMap)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };
  const topProducts = prepareTopProducts();

  // === Chat handler ===
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { sender: 'user', message: chatInput }]);
    setTimeout(() => {
      let resp = "I'm analyzing your data. ";
      const m = chatInput.toLowerCase();
      if (m.includes('best selling')) {
        resp += "Your best selling category is Produce with 35% of total sales.";
      } else if (m.includes('revenue')) {
        resp += `Total revenue this week is $${totalRevenue.toFixed(2)}.`;
      } else if (m.includes('customer')) {
        resp += `You've had ${uniqueCustomers} unique customers, avg order $${avgOrderValue.toFixed(2)}.`;
      } else {
        resp += "I recommend stocking more Organic Apples and Whole Grain Bread.";
      }
      setChatMessages(prev => [...prev, { sender: 'ai', message: resp }]);
    }, 800);
    setChatInput('');
  };

  return (
    <div className="space-y-8">
      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Total Revenue" subtitle={`$${totalRevenue.toFixed(2)}`} />
        <Card title="Total Orders" subtitle={`${totalOrders}`} />
        <Card title="Avg. Order Value" subtitle={`$${avgOrderValue.toFixed(2)}`} />
        <Card title="Unique Customers" subtitle={`${uniqueCustomers}`} />
      </div>

      {/* LINE & PIE CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Orders & Revenue by Day" subtitle="Last 7 days">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesByDay} margin={{ top:20, right:20, bottom:20, left:0 }}>
                <CartesianGrid stroke="#EEE" strokeDasharray="4 4" />
                <XAxis dataKey="name" axisLine={{ stroke:'#CCC' }} tickLine={false} tick={{ fill:'#666', fontSize:12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill:'#666', fontSize:12 }} />
                <Tooltip contentStyle={{ borderRadius:8, background:'#FFF', boxShadow:'0 2px 8px rgba(0,0,0,0.1)' }} />
                <Legend verticalAlign="top" height={36} />
                <Line type="monotone" dataKey="orders" stroke="#8884d8" name="Orders" />
                <Line type="monotone" dataKey="revenue" stroke="#82ca9d" name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Sales by Category" subtitle="Revenue share">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="sales"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {categoryData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={['#0088FE','#00C49F','#FFBB28','#FF8042','#AA336A'][i % 5]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* GRADIENT BAR CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Top 5 Products" subtitle="By revenue this week">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topProducts}
                margin={{ top:20, right:20, bottom:20, left:0 }}
                barCategoryGap="20%"
              >
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4facfe" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#00f2fe" stopOpacity={0.3}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#EEE" strokeDasharray="4 4" />
                <XAxis dataKey="name" axisLine={{ stroke:'#CCC' }} tickLine={false} tick={{ fill:'#666', fontSize:12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill:'#666', fontSize:12 }} />
                <Tooltip contentStyle={{ borderRadius:8, background:'#FFF', boxShadow:'0 2px 8px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="revenue" fill="url(#revGrad)" radius={[8,8,0,0]} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Orders by Day" subtitle="Last 7 days">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={salesByDay}
                margin={{ top:20, right:20, bottom:20, left:0 }}
                barSize={40}
              >
                <defs>
                  <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF9A8B" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#FF6A88" stopOpacity={0.3}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#EEE" strokeDasharray="4 4" />
                <XAxis dataKey="name" axisLine={{ stroke:'#CCC' }} tickLine={false} tick={{ fill:'#666', fontSize:12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill:'#666', fontSize:12 }} />
                <Tooltip contentStyle={{ borderRadius:8, background:'#FFF', boxShadow:'0 2px 8px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="orders" fill="url(#ordGrad)" radius={[8,8,0,0]} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* WhatsApp-style Chat */}
      <Card title="AI Analytics Assistant" subtitle="Ask questions about your sales data">
        <div className="px-4 py-2 space-y-4 h-64 overflow-y-auto">
          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`message flex ${
                msg.sender === 'user' ? 'justify-end user' : 'justify-start ai'
              }`}
            >
              <div
                className={
                  `bubble relative px-4 py-2 max-w-[70%] ` +
                  (msg.sender === 'user'
                    ? 'bg-green-500 text-white rounded-xl rounded-bl-none'
                    : 'bg-gray-100 text-gray-800 rounded-xl rounded-br-none')
                }
              >
                {msg.message}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center px-4 py-2 border-t border-gray-200">
          <Input
            placeholder="Type a message..."
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
            className="flex-1"
          />
          <button
            onClick={handleSendMessage}
            className="ml-2 p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </Card>
    </div>
  );
};
