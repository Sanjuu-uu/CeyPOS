import React, { useMemo, useState } from 'react';
import { MessageCircle, X, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '../../ui/Input';
import { ChatVisualization } from './ChatVisualization';
import { useApp } from '../../../context/AppContext';

interface VisualizationData {
  type: 'kpi_card' | 'bar_chart' | 'line_chart' | 'pie_chart';
  title: string;
  value?: string;
  subtitle?: string;
  data?: Array<{ name: string; value: number }>;
  xAxisKey?: string;
  yAxisKey?: string;
}

interface Message {
  sender: 'user' | 'ai';
  message: string;
  timestamp: Date;
  visualizations?: VisualizationData[];
}

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onToggle }) => {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Message[]>([
    { 
      sender: 'ai', 
      message: 'Hello! I can help you analyze your sales data. What would you like to know?',
      timestamp: new Date(),
      visualizations: []
    }
  ]);
  const { activeShopId, currentShop } = useApp();
  const normalizedShopId = useMemo(() => {
    if (!activeShopId) return null;
    return String(activeShopId).replace(/^shop_/, '').replace(/\.db$/i, '');
  }, [activeShopId]);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage: Message = {
      sender: 'user',
      message: chatInput,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);

    if (!normalizedShopId) {
      const aiMessage: Message = {
        sender: 'ai',
        message: 'Analytics chat requires an active shop. Please finish onboarding or refresh after selecting your shop.',
        timestamp: new Date(),
        visualizations: []
      };
      setChatMessages(prev => [...prev, aiMessage]);
      setChatInput('');
      return;
    }
    
    // Call AI API
    try {
      const response = await fetch('/api/analytics/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: chatInput,
          shopId: normalizedShopId,
          shopLabel: currentShop?.name,
        })
      });
      const data = await response.json();
      const aiMessage: Message = {
        sender: 'ai',
        message: data.answer || 'Sorry, I could not generate a response.',
        timestamp: new Date(),
        visualizations: data.visualizations || []
      };
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const aiMessage: Message = {
        sender: 'ai',
        message: 'Error: Could not connect to AI service.',
        timestamp: new Date(),
        visualizations: []
      };
      setChatMessages(prev => [...prev, aiMessage]);
    }
    
    setChatInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Toggle Button - Always visible */}
      <button
        onClick={onToggle}
        className={`fixed z-50 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-l-lg shadow-lg transition-all duration-300 ${
          isOpen ? 'right-80' : 'right-0'
        }`}
        style={{ top: 'calc(64px + 50vh)', transform: 'translateY(-50%)' }}
        title={isOpen ? 'Close Chat' : 'Open Chat'}
      >
        {isOpen ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
      </button>

      {/* Chat Sidebar */}
      <div
        className={`fixed right-0 bg-white shadow-xl z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: '320px', top: '64px', height: 'calc(100vh - 64px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-50">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-800">AI Analytics Assistant</h3>
          </div>
          <button
            onClick={onToggle}
            className="p-1 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto" style={{ height: 'calc(100vh - 204px)' }}>
          <div className="space-y-4">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                } mb-4`}
              >
                <div className="max-w-[90%]">
                  <div
                    className={`px-3 py-2 rounded-lg ${
                      msg.sender === 'user'
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-gray-100 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm">{msg.message}</p>
                    <p className={`text-xs mt-1 ${
                      msg.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {msg.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                  
                  {/* Render visualizations */}
                  {msg.visualizations && msg.visualizations.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {msg.visualizations.map((viz, vizIdx) => (
                        <ChatVisualization key={vizIdx} visualization={viz} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Ask about your data..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 text-sm"
            />
            <button
              onClick={handleSendMessage}
              disabled={!chatInput.trim() || !normalizedShopId}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};