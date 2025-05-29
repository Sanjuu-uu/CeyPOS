import React from 'react';
import { Card } from '../../ui/Card';
import { useApp } from '../../../context/AppContext';
import { db } from '../../../lib/db';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Input } from '../../ui/Input';
import { Send } from 'lucide-react';

export const Analytics: React.FC = () => {
  const { currentShop } = useApp();
  const [chatInput, setChatInput] = React.useState('');
  const [chatMessages, setChatMessages] = React.useState([
    { sender: 'ai', message: 'Hello! I can help you analyze your sales data. What would you like to know?' }
  ]);
  
  // Get all sales for the current shop
  const sales = currentShop ? db.sales.getByShopId(currentShop.id) : [];
  
  // Create data for charts
  const prepareSalesByDay = () => {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Initialize data for each day with 0 sales
    const salesByDay = days.map(day => ({ name: day, sales: 0 }));
    
    // Count sales for each day from the past week
    sales.forEach(sale => {
      const saleDate = new Date(sale.timestamp);
      // Only count sales from the past week
      if ((now.getTime() - saleDate.getTime()) < 7 * 24 * 60 * 60 * 1000) {
        const dayIndex = saleDate.getDay();
        salesByDay[dayIndex].sales += sale.total;
      }
    });
    
    return salesByDay;
  };
  
  const prepareSalesByCategory = () => {
    const salesByCategory: { [key: string]: number } = {};
    
    // Calculate total sales for each product category
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (!salesByCategory[item.category]) {
          salesByCategory[item.category] = 0;
        }
        salesByCategory[item.category] += item.price * item.quantity;
      });
    });
    
    // Convert to array format for chart
    return Object.keys(salesByCategory).map(category => ({
      name: category,
      sales: salesByCategory[category]
    }));
  };
  
  const salesByDay = prepareSalesByDay();
  const salesByCategory = prepareSalesByCategory();
  
  // AI Chat functionality
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    
    // Add user message to chat
    setChatMessages(prev => [...prev, { sender: 'user', message: chatInput }]);
    
    // Simulate AI response (in a real app, this would call an AI service)
    setTimeout(() => {
      let aiResponse = "I'm analyzing your data. ";
      
      if (chatInput.toLowerCase().includes('best selling')) {
        aiResponse += "Your best selling category is Produce with 35% of total sales.";
      } else if (chatInput.toLowerCase().includes('revenue')) {
        aiResponse += `Your total revenue this week is $${sales.reduce((sum, sale) => sum + sale.total, 0).toFixed(2)}.`;
      } else if (chatInput.toLowerCase().includes('customer')) {
        aiResponse += "You've had 12 unique customers this week, with an average purchase value of $24.50.";
      } else {
        aiResponse += "Based on your sales data, I recommend stocking more Organic Apples and Whole Grain Bread as they're trending upward.";
      }
      
      setChatMessages(prev => [...prev, { sender: 'ai', message: aiResponse }]);
    }, 1000);
    
    // Clear input
    setChatInput('');
  };
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Day Chart */}
        <Card 
          title="Sales by Day" 
          subtitle="Last 7 days"
          className="border border-gray-100"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sales" fill="#ECFF76" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        
        {/* Sales by Category Chart */}
        <Card 
          title="Sales by Category" 
          subtitle="Product categories"
          className="border border-gray-100"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByCategory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sales" fill="#ECFF76" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      
      {/* AI Analytics Assistant */}
      <Card 
        title="AI Analytics Assistant" 
        subtitle="Ask questions about your sales data"
        className="border border-gray-100"
      >
        <div className="h-64 overflow-y-auto mb-4 space-y-3">
          {chatMessages.map((msg, index) => (
            <div 
              key={index}
              className={`p-3 rounded-lg ${
                msg.sender === 'ai' 
                  ? 'bg-gray-100 text-gray-800' 
                  : 'bg-[#ECFF76]/20 text-gray-800 ml-auto'
              } max-w-3/4 inline-block`}
            >
              {msg.message}
            </div>
          ))}
        </div>
        
        <div className="flex space-x-2">
          <Input
            placeholder="Ask about your sales data..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            fullWidth
          />
          <button
            onClick={handleSendMessage}
            className="p-2 bg-[#ECFF76] rounded-lg text-gray-800 hover:bg-[#D6E85C] transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </Card>
    </div>
  );
};