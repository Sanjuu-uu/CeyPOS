import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, X, Send, ChevronLeft, ChevronRight, AlertTriangle, Loader2, RefreshCcw } from 'lucide-react';
import { ChatVisualization, type VisualizationData } from './ChatVisualization';
import { useApp } from '../../../context/AppContext';

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

interface VisualizationConfig {
  provider: string;
  configured: boolean;
  baseUrl: string | null;
  serviceId: string | null;
}

type AnalyticsResponse = {
  answer?: string;
  visualizations?: VisualizationData[];
  visualizationConfig?: VisualizationConfig;
  error?: string;
};

const STORAGE_PREFIX = 'ceypos.analytics.chat.history';

const DEFAULT_MESSAGES: Message[] = [
  {
    sender: 'ai',
    message: 'Hello! I can help you analyze your sales data. What would you like to know?',
    timestamp: new Date(),
    visualizations: [],
  },
];

const serializeMessages = (messages: Message[]) =>
  messages.map((message) => ({
    ...message,
    timestamp: message.timestamp.toISOString(),
  }));

const deserializeMessages = (raw: unknown): Message[] | null => {
  if (!Array.isArray(raw)) return null;
  try {
    return raw
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const sender = item.sender === 'user' ? 'user' : 'ai';
        const message = typeof item.message === 'string' ? item.message : '';
        const timestamp = item.timestamp ? new Date(item.timestamp) : new Date();
        const visualizations = Array.isArray(item.visualizations) ? item.visualizations : [];
        if (!message.trim()) return null;
        return { sender, message, timestamp, visualizations } as Message;
      })
      .filter((value): value is Message => Boolean(value));
  } catch (error) {
    console.warn('Failed to parse stored analytics chat history', error);
    return null;
  }
};

const storageKeyForShop = (shopId: string | null) =>
  `${STORAGE_PREFIX}.${shopId && shopId.trim() ? shopId : 'global'}`;

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onToggle }) => {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Message[]>(DEFAULT_MESSAGES);
  const [config, setConfig] = useState<VisualizationConfig | null>(null);
  const [isConfigNoticeDismissed, setIsConfigNoticeDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { activeShopId } = useApp();
  const appendMessage = useCallback((message: Message) => {
    setChatMessages((prev) => [...prev, message]);
  }, []);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const normalizedShopId = useMemo(() => {
    if (!activeShopId) return null;
    return String(activeShopId).replace(/^shop_/, '').replace(/\.db$/i, '');
  }, [activeShopId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = storageKeyForShop(normalizedShopId);
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const restored = deserializeMessages(parsed);
        if (restored && restored.length) {
          setChatMessages(restored);
          return;
        }
      }
    } catch (error) {
      console.warn('Analytics chat history load failed', error);
    }
    setChatMessages(DEFAULT_MESSAGES.map((message) => ({ ...message, timestamp: new Date() })));
  }, [normalizedShopId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = storageKeyForShop(normalizedShopId);
    try {
      localStorage.setItem(key, JSON.stringify(serializeMessages(chatMessages)));
    } catch (error) {
      console.warn('Analytics chat history persist failed', error);
    }
  }, [chatMessages, normalizedShopId]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const maxHeight = 120;
    textarea.style.height = `${Math.min(maxHeight, textarea.scrollHeight)}px`;
  }, [chatInput]);

  const handleSendMessage = async () => {
    const question = chatInput.trim();
    if (!question) return;
    setIsLoading(true);
    setChatInput('');
    const userMessage: Message = {
      sender: 'user',
      message: question,
      timestamp: new Date()
    };
    appendMessage(userMessage);

    if (!normalizedShopId) {
      const aiMessage: Message = {
        sender: 'ai',
        message: 'Analytics chat requires an active shop. Please finish onboarding or refresh after selecting your shop.',
        timestamp: new Date(),
        visualizations: []
      };
      appendMessage(aiMessage);
      setIsLoading(false);
      return;
    }
    
    // Call AI API
    try {
      const response = await fetch('/api/analytics/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          shopId: normalizedShopId,
        })
      });
      let data: AnalyticsResponse | null = null;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse analytics response', parseError);
      }

      if (!response.ok) {
        const errorMessage = data?.error ?? `Request failed with status ${response.status}`;
        appendMessage({
          sender: 'ai',
          message: `Error: ${errorMessage}`,
          timestamp: new Date(),
          visualizations: [],
        });
        setIsLoading(false);
        return;
      }

      if (!data) {
        appendMessage({
          sender: 'ai',
          message: 'Sorry, I could not generate a response.',
          timestamp: new Date(),
          visualizations: [],
        });
        setIsLoading(false);
        return;
      }

      if (
        data.visualizationConfig &&
        Array.isArray(data.visualizations) &&
        data.visualizations.length > 0
      ) {
        setConfig({
          provider: data.visualizationConfig.provider,
          configured: Boolean(data.visualizationConfig.configured),
          baseUrl: data.visualizationConfig.baseUrl ?? null,
          serviceId: data.visualizationConfig.serviceId ?? null,
        });
        setIsConfigNoticeDismissed(false);
      } else {
        setConfig(null);
      }

      const aiMessage: Message = {
        sender: 'ai',
        message: data.answer || 'Sorry, I could not generate a response.',
        timestamp: new Date(),
        visualizations: Array.isArray(data.visualizations) ? data.visualizations : []
      };
      appendMessage(aiMessage);
    } catch (error) {
      console.error('Analytics chat request failed', error);
      appendMessage({
        sender: 'ai',
        message: 'Error: Could not connect to AI service.',
        timestamp: new Date(),
        visualizations: [],
      });
    }
    
    setIsLoading(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleStartNewChat = () => {
    const freshMessages = DEFAULT_MESSAGES.map((message) => ({ ...message, timestamp: new Date() }));
    setChatMessages(freshMessages);
    setChatInput('');
    setConfig(null);
    setIsConfigNoticeDismissed(false);
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
        } flex flex-col`}
        style={{ width: '320px', top: '64px', height: 'calc(100vh - 64px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-50">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-800">AI Analytics Assistant</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStartNewChat}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
              title="Start a new chat"
            >
              <RefreshCcw className="w-4 h-4" />
              <span>New chat</span>
            </button>
            
          <button
            onClick={onToggle}
            className="p-1 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
          </div>
        </div>

        {config && !config.configured && !isConfigNoticeDismissed && (
          <div className="flex items-start gap-3 px-4 py-3 text-xs text-amber-700 bg-amber-50 border-b border-amber-100">
            <AlertTriangle className="w-4 h-4 mt-0.5" />
            <div>
              Remote chart generation is not fully configured. Ask your administrator to set the
              visualization service variables so the assistant can embed hosted charts.
            </div>
            <button
              type="button"
              className="ml-auto text-amber-700 hover:text-amber-900"
              onClick={() => setIsConfigNoticeDismissed(true)}
              aria-label="Dismiss visualization notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto">
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
            <div ref={scrollRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <textarea
              ref={inputRef}
              placeholder="Ask about your data..."
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              rows={1}
              className="flex-1 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ECFF76]/20 focus:border-[#ECFF76] resize-none px-3 py-2 text-gray-900 placeholder-gray-400 disabled:bg-gray-100"
            />
            <button
              onClick={handleSendMessage}
              disabled={!chatInput.trim() || !normalizedShopId || isLoading}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};