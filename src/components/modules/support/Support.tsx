import React, { useEffect, useState } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { getSearchHash } from '../../../lib/navigationSearch';
import { useApp } from '../../../context/AppContext';
import { API_BASE, authFetch } from '../../../lib/api';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface Ticket {
  id: string;
  subject: string;
  status: 'open' | 'pending' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  lastUpdate: string;
}

export const Support: React.FC = () => {
  type SupportTab = 'help' | 'contact' | 'tickets' | 'chat' | 'resources';
  const [activeTab, setActiveTab] = useState<SupportTab>('help');
  const { activeShopId, currentShop, currentUser } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFAQ, setSelectedFAQ] = useState<string | null>(null);
  const [chatConversationId, setChatConversationId] = useState<string>(() => (
    typeof window === 'undefined' ? '' : localStorage.getItem('ceypos-support-conversation') || ''
  ));
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    sender_type: 'merchant' | 'admin' | 'system';
    sender_name?: string;
    sender_email?: string;
    message: string;
    created_at: string;
  }>>([]);
  const [chatSubject, setChatSubject] = useState('Support request');
  const [chatMessage, setChatMessage] = useState('');
  const [chatStatus, setChatStatus] = useState('');
  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: '',
    priority: 'medium',
    description: ''
  });

  useEffect(() => {
    const supportHashToTab: Record<string, SupportTab> = {
      faq: 'help',
      contact: 'contact',
      tickets: 'tickets',
      chat: 'chat',
      resources: 'resources',
    };
    const applySearchHash = () => {
      const hash = getSearchHash();
      const key = hash.startsWith('support:') ? hash.split(':')[1] : '';
      if (supportHashToTab[key]) setActiveTab(supportHashToTab[key]);
    };

    applySearchHash();
    window.addEventListener('hashchange', applySearchHash);
    return () => window.removeEventListener('hashchange', applySearchHash);
  }, []);

  const loadChat = async (conversationId = chatConversationId) => {
    if (!conversationId) return;
    try {
      const response = await authFetch(`${API_BASE}/api/admin/support/conversations/${encodeURIComponent(conversationId)}/merchant`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || `Chat unavailable (${response.status})`);
      setChatMessages(payload.messages || []);
      if (payload.conversation?.subject) setChatSubject(payload.conversation.subject);
      setChatStatus('');
    } catch (error) {
      setChatStatus(error instanceof Error ? error.message : 'Unable to load support chat');
    }
  };

  useEffect(() => {
    if (activeTab !== 'chat' || !chatConversationId) return;
    loadChat(chatConversationId);
    const timer = window.setInterval(() => loadChat(chatConversationId), 15000);
    return () => window.clearInterval(timer);
  }, [activeTab, chatConversationId]);

  // Sample FAQ data
  const faqs: FAQ[] = [
    {
      id: '1',
      question: 'How do I add a new product to inventory?',
      answer: 'Navigate to the Inventory module, click "Add Product", then enter the product name, category, selling price, cost price, stock quantity, reorder threshold, unit or pack size, barcode, SKU and supplier if needed.',
      category: 'Inventory'
    },
    {
      id: '2',
      question: 'How can I process a refund?',
      answer: 'Go to the Receipts module, find the transaction, click on it to view details, and select the "Process Refund" option. Enter the refund amount and reason.',
      category: 'Sales'
    },
    {
      id: '3',
      question: 'How do I generate sales reports?',
      answer: 'Visit the Reports module, select the date range and report type you need, then click "Generate Report". You can export the report as PDF or CSV.',
      category: 'Reports'
    },
    {
      id: '4',
      question: 'How do I set up payment methods?',
      answer: 'Go to the Payments module, click on "Payment Methods" tab, and toggle on/off the payment methods you want to accept. You can also configure fees and settings.',
      category: 'Payments'
    },
    {
      id: '5',
      question: 'How do I backup my data?',
      answer: 'Navigate to Settings > Backup & Data, then click "Export Data" to download a backup file. You can also enable automatic backups.',
      category: 'Data'
    }
  ];

  // Sample support tickets
  const tickets: Ticket[] = [
    {
      id: 'T001',
      subject: 'Unable to print receipts',
      status: 'open',
      priority: 'high',
      createdAt: '2024-03-15T10:30:00Z',
      lastUpdate: '2024-03-15T14:20:00Z'
    },
    {
      id: 'T002',
      subject: 'Inventory sync issues',
      status: 'pending',
      priority: 'medium',
      createdAt: '2024-03-14T09:15:00Z',
      lastUpdate: '2024-03-15T11:45:00Z'
    },
    {
      id: 'T003',
      subject: 'Payment gateway setup',
      status: 'resolved',
      priority: 'low',
      createdAt: '2024-03-13T16:20:00Z',
      lastUpdate: '2024-03-14T13:10:00Z'
    }
  ];

  // Filter FAQs based on search
  const filteredFAQs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting ticket:', newTicket);
    // Reset form
    setNewTicket({
      subject: '',
      category: '',
      priority: 'medium',
      description: ''
    });
  };

  const sendChatMessage = async () => {
    const message = chatMessage.trim();
    if (!message) return;
    setChatStatus('Sending...');
    try {
      const response = await authFetch(`${API_BASE}/api/admin/support/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: chatConversationId || null,
          shopId: activeShopId || currentShop?.id || currentUser?.shopId || null,
          userName: currentUser?.name || currentShop?.name || 'Merchant',
          subject: chatSubject || 'Support request',
          priority: 'medium',
          message,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || `Message failed (${response.status})`);
      if (payload.conversation?.id) {
        setChatConversationId(payload.conversation.id);
        localStorage.setItem('ceypos-support-conversation', payload.conversation.id);
      }
      setChatMessages(payload.messages || []);
      setChatMessage('');
      setChatStatus('Sent to CeyPOS support');
    } catch (error) {
      setChatStatus(error instanceof Error ? error.message : 'Unable to send message');
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-5">
      <div className="page-action-row">
        <p className="page-subheading">Find answers and manage support requests</p>
        <div className="page-actions">
          <Button variant="outline">
            Call Support
          </Button>
          <Button variant="primary" onClick={() => setActiveTab('chat')}>
            Live Chat
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="module-tabs">
        <nav className="flex gap-1">
          {[
            { id: 'help', label: 'Help Center' },
            { id: 'contact', label: 'Contact Us' },
            { id: 'tickets', label: 'My Tickets' },
            { id: 'chat', label: 'Live Chat' },
            { id: 'resources', label: 'Resources' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`module-tab ${
                activeTab === tab.id
                  ? 'module-tab-active'
                  : ''
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Help Center Tab */}
      {activeTab === 'help' && (
        <div className="space-y-6">
          {/* Search Bar */}
          <Card>
            <Input
              placeholder="Search for help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3">
                <div>
                  <h3 className="font-medium text-gray-900">Video Tutorials</h3>
                  <p className="text-sm text-gray-500">Watch step-by-step guides</p>
                </div>
              </div>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3">
                <div>
                  <h3 className="font-medium text-gray-900">User Guide</h3>
                  <p className="text-sm text-gray-500">Complete documentation</p>
                </div>
              </div>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3">
                <div>
                  <h3 className="font-medium text-gray-900">Community</h3>
                  <p className="text-sm text-gray-500">Ask the community</p>
                </div>
              </div>
            </Card>
          </div>

          {/* FAQ Section */}
          <Card title="Frequently Asked Questions">
            <div className="space-y-4">
              {filteredFAQs.map(faq => (
                <div key={faq.id} className="border-b border-gray-100 last:border-b-0 pb-4 last:pb-0">
                  <button
                    onClick={() => setSelectedFAQ(selectedFAQ === faq.id ? null : faq.id)}
                    className="w-full text-left flex items-center justify-between py-2"
                  >
                    <div>
                      <h3 className="font-medium text-gray-900">{faq.question}</h3>
                      <span className="inline-block mt-1 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        {faq.category}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-gray-500">
                      {selectedFAQ === faq.id ? 'Hide' : 'View'}
                    </span>
                  </button>
                  {selectedFAQ === faq.id && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-700">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Contact Us Tab */}
      {activeTab === 'contact' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact Information */}
          <Card title="Get in Touch">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div>
                  <p className="font-medium text-gray-900">Phone Support</p>
                  <p className="text-sm text-gray-500">+1 (555) 123-4567</p>
                  <p className="text-xs text-gray-400">Mon-Fri, 9AM-6PM EST</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div>
                  <p className="font-medium text-gray-900">Email Support</p>
                  <p className="text-sm text-gray-500">support@naturalpos.com</p>
                  <p className="text-xs text-gray-400">Response within 24 hours</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div>
                  <p className="font-medium text-gray-900">Live Chat</p>
                  <p className="text-sm text-gray-500">Available 24/7</p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => setActiveTab('chat')}>
                    Start Chat
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Contact Form */}
          <Card title="Send us a Message">
            <form onSubmit={handleTicketSubmit} className="space-y-4">
              <Input
                label="Subject"
                value={newTicket.subject}
                onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Brief description of your issue"
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={newTicket.category}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-verde-primary focus:border-verde-primary"
                  required
                >
                  <option value="">Select a category</option>
                  <option value="technical">Technical Issue</option>
                  <option value="billing">Billing Question</option>
                  <option value="feature">Feature Request</option>
                  <option value="general">General Inquiry</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-verde-primary focus:border-verde-primary"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newTicket.description}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-verde-primary focus:border-verde-primary"
                  placeholder="Please provide details about your issue..."
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
              >
                Send Message
              </Button>
            </form>
          </Card>
        </div>
      )}

      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
          <Card title="CeyPOS live support" subtitle="Connected to the admin service desk">
            <div className="space-y-4 text-sm text-gray-600">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Shop</p>
                <p className="mt-1 font-semibold text-gray-900">{currentShop?.name || activeShopId || 'Current shop'}</p>
                <p className="mt-1 text-xs text-gray-500">{currentUser?.email || 'Signed-in merchant'}</p>
              </div>
              <Input
                label="Subject"
                value={chatSubject}
                onChange={(event) => setChatSubject(event.target.value)}
                placeholder="What do you need help with?"
              />
              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="font-medium text-gray-900">What admins can see</p>
                <p className="mt-2">Your shop, account email, conversation history and service status. Payment secrets and customer card data are never sent through chat.</p>
              </div>
              {chatStatus && <p className="text-xs text-gray-500">{chatStatus}</p>}
            </div>
          </Card>

          <Card title="Conversation" subtitle="Messages refresh automatically while this tab is open">
            <div className="flex min-h-[460px] flex-col">
              <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-gray-200 bg-gray-50 p-4">
                {chatMessages.length === 0 ? (
                  <div className="flex h-full min-h-[260px] items-center justify-center text-center text-sm text-gray-500">
                    Send your first message and a CeyPOS admin will see it in the /admin service desk.
                  </div>
                ) : (
                  chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`max-w-[82%] rounded-2xl px-4 py-3 ${
                        message.sender_type === 'merchant'
                          ? 'ml-auto bg-black text-white'
                          : 'mr-auto border border-gray-200 bg-white text-gray-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 text-[11px] opacity-70">
                        <span>{message.sender_type === 'merchant' ? 'You' : 'CeyPOS Admin'}</span>
                        <span>{formatDate(message.created_at)}</span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{message.message}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <textarea
                  value={chatMessage}
                  onChange={(event) => setChatMessage(event.target.value)}
                  rows={3}
                  className="min-h-[76px] flex-1 rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:border-verde-primary focus:outline-none focus:ring-2 focus:ring-verde-primary"
                  placeholder="Type a message for CeyPOS support..."
                />
                <Button variant="primary" className="sm:self-end" onClick={sendChatMessage}>
                  Send
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* My Tickets Tab */}
      {activeTab === 'tickets' && (
        <Card title="Support Tickets">
          <div className="space-y-4">
            {tickets.map(ticket => (
              <div key={ticket.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-medium text-gray-900">{ticket.subject}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span>{ticket.id}</span>
                      <span>Created: {formatDate(ticket.createdAt)}</span>
                      <span>Updated: {formatDate(ticket.lastUpdate)}</span>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-gray-500">View</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Resources Tab */}
      {activeTab === 'resources' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <div className="text-center">
              <h3 className="font-medium text-gray-900 mb-2">User Manual</h3>
              <p className="text-sm text-gray-500 mb-3">Complete guide to using Natural POS</p>
              <Button size="sm" variant="outline">
                Download PDF
              </Button>
            </div>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <div className="text-center">
              <h3 className="font-medium text-gray-900 mb-2">Video Tutorials</h3>
              <p className="text-sm text-gray-500 mb-3">Step-by-step video guides</p>
              <Button size="sm" variant="outline">
                Watch Videos
              </Button>
            </div>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <div className="text-center">
              <h3 className="font-medium text-gray-900 mb-2">Community Forum</h3>
              <p className="text-sm text-gray-500 mb-3">Connect with other users</p>
              <Button size="sm" variant="outline">
                Join Forum
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
