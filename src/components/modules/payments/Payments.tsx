import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { 
  CreditCard, 
  Wallet, 
  Smartphone, 
  DollarSign, 
  Plus, 
  Settings, 
  Check, 
  X,
  Shield,
  TrendingUp
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { db } from '../../../lib/db';
import { Sale } from '../../../types';

type PaymentMethodId = 'card' | 'digital_wallet' | 'mobile' | 'cash';

type SalesUpdatedPayload = {
  shopId?: string;
  items?: Sale[];
};

type SaleCreatedPayload = {
  shopId?: string;
  sale?: Sale;
};

type PaymentMethodsUpdatedPayload = {
  shopId?: string;
  methods?: string[];
};

const isSalesUpdatedPayload = (payload: unknown): payload is SalesUpdatedPayload => {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const candidate = payload as Record<string, unknown>;
  const items = candidate.items;
  const validItems =
    items === undefined ||
    (Array.isArray(items) && items.every((item) => typeof item === 'object' && item !== null));
  const shopId = candidate.shopId;
  const validShopId = shopId === undefined || typeof shopId === 'string';
  return validShopId && validItems;
};

const isSaleCreatedPayload = (payload: unknown): payload is SaleCreatedPayload => {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const candidate = payload as Record<string, unknown>;
  const shopId = candidate.shopId;
  const sale = candidate.sale;
  const validShopId = shopId === undefined || typeof shopId === 'string';
  const validSale = sale === undefined || (typeof sale === 'object' && sale !== null);
  return validShopId && validSale;
};

const isPaymentMethodsUpdatedPayload = (
  payload: unknown,
): payload is PaymentMethodsUpdatedPayload => {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const candidate = payload as Record<string, unknown>;
  const shopId = candidate.shopId;
  const methods = candidate.methods;
  const validShopId = shopId === undefined || typeof shopId === 'string';
  const validMethods =
    methods === undefined ||
    (Array.isArray(methods) && methods.every((method) => typeof method === 'string'));
  return validShopId && validMethods;
};

interface PaymentMethodDefinition {
  id: PaymentMethodId;
  name: string;
  type: 'card' | 'digital' | 'cash';
  fee: number;
  description: string;
}

const PAYMENT_METHOD_ORDER: PaymentMethodId[] = ['card', 'digital_wallet', 'mobile', 'cash'];

const PAYMENT_METHOD_DEFINITIONS: Record<PaymentMethodId, PaymentMethodDefinition> = {
  card: {
    id: 'card',
    name: 'Credit/Debit Cards',
    type: 'card',
    fee: 2.9,
    description: 'Accept Visa, Mastercard, American Express',
  },
  digital_wallet: {
    id: 'digital_wallet',
    name: 'Digital Wallet',
    type: 'digital',
    fee: 1.5,
    description: 'Apple Pay, Google Pay, Samsung Pay',
  },
  mobile: {
    id: 'mobile',
    name: 'Mobile Payment',
    type: 'digital',
    fee: 1.0,
    description: 'QR code and mobile app payments',
  },
  cash: {
    id: 'cash',
    name: 'Cash',
    type: 'cash',
    fee: 0,
    description: 'Traditional cash payments',
  },
};

const DEFAULT_ENABLED_METHODS: PaymentMethodId[] = ['card', 'digital_wallet', 'cash'];

function coerceMethodIds(methods: string[] | undefined | null): PaymentMethodId[] {
  if (!methods) return DEFAULT_ENABLED_METHODS.slice();
  const set = new Set<PaymentMethodId>();
  for (const method of methods) {
    if (PAYMENT_METHOD_ORDER.includes(method as PaymentMethodId)) {
      set.add(method as PaymentMethodId);
    }
  }
  return set.size ? Array.from(set) : DEFAULT_ENABLED_METHODS.slice();
}

interface Transaction {
  id: string;
  amount: number;
  method: string;
  status: 'completed' | 'pending' | 'failed';
  timestamp: string;
  reference: string;
}

export const Payments: React.FC = () => {
  const { currentShop } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'methods' | 'transactions' | 'settings'>('overview');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [enabledMethods, setEnabledMethods] = useState<PaymentMethodId[]>(DEFAULT_ENABLED_METHODS);
  const [methodsLoading, setMethodsLoading] = useState(false);
  const [methodsError, setMethodsError] = useState<string | null>(null);
  const [pendingMethodId, setPendingMethodId] = useState<PaymentMethodId | null>(null);

  const mapSalesToTransactions = (sales: Sale[]): Transaction[] =>
    sales.map((sale) => ({
      id: sale.id,
      amount: sale.total,
      method: sale.paymentMethod,
      status: 'completed' as const,
      timestamp: sale.timestamp,
      reference: `TXN-${(sale.id || '').slice(-8).toUpperCase()}`,
    }));

  useEffect(() => {
    if (!currentShop) {
      setTransactions([]);
      return;
    }

    const shopId = currentShop.id;

    const applyTransactions = (sales: Sale[]) => {
      const mapped = mapSalesToTransactions(sales);
      setTransactions(mapped.slice(0, 50));
    };

    const bootstrap = () => {
      const sales = db.sales.getByShopId(shopId);
      applyTransactions(sales);
    };

    const handleSalesUpdated = (payload: unknown) => {
      if (!isSalesUpdatedPayload(payload)) {
        return;
      }
      if (!payload.shopId || payload.shopId !== shopId) {
        return;
      }
      const items: Sale[] = payload.items || db.sales.getByShopId(shopId);
      applyTransactions(items);
    };

    const handleSaleCreated = (payload: unknown) => {
      if (!isSaleCreatedPayload(payload)) {
        return;
      }
      if (!payload.shopId || payload.shopId !== shopId) {
        return;
      }
      bootstrap();
    };

    bootstrap();

    const unsubscribeUpdated = db.on('salesUpdated', handleSalesUpdated);
    const unsubscribeCreated = db.on('saleCreated', handleSaleCreated);

    return () => {
      if (typeof unsubscribeUpdated === 'function') {
        unsubscribeUpdated();
      } else {
        db.off('salesUpdated', handleSalesUpdated);
      }

      if (typeof unsubscribeCreated === 'function') {
        unsubscribeCreated();
      } else {
        db.off('saleCreated', handleSaleCreated);
      }
    };
  }, [currentShop]);

  useEffect(() => {
    if (!currentShop) {
      setEnabledMethods(DEFAULT_ENABLED_METHODS);
      return;
    }

    let cancelled = false;
    const shopId = currentShop.id;
    const cached = db.paymentMethods.getByShopId(shopId);
    if (cached.length) {
      setEnabledMethods(coerceMethodIds(cached));
    }

    const handler = (payload: unknown) => {
      if (cancelled) return;
      if (!isPaymentMethodsUpdatedPayload(payload)) {
        return;
      }
      if (!payload.shopId || payload.shopId !== currentShop.id) {
        return;
      }
      setEnabledMethods(coerceMethodIds(payload.methods));
    };

    const unsubscribe = db.on('paymentMethodsUpdated', handler);

    setMethodsLoading(true);
    setMethodsError(null);
    db.paymentMethods
      .refresh(shopId)
      .then((methods) => {
        if (!cancelled) {
          setEnabledMethods(coerceMethodIds(methods));
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setMethodsError(
            error instanceof Error ? error.message : 'Failed to load payment methods.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setMethodsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      } else {
        db.off('paymentMethodsUpdated', handler);
      }
    };
  }, [currentShop]);

  // Calculate payment statistics
  const stats = useMemo(() => {
    const totalTransactions = transactions.length;
    const totalAmount = transactions.reduce((sum, txn) => sum + txn.amount, 0);
    const avgTransaction = totalTransactions > 0 ? totalAmount / totalTransactions : 0;

    const methodBreakdown = transactions.reduce((acc, txn) => {
      acc[txn.method] = (acc[txn.method] || 0) + txn.amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalTransactions,
      totalAmount,
      avgTransaction,
      methodBreakdown,
    };
  }, [transactions]);

  const togglePaymentMethod = async (id: PaymentMethodId) => {
    if (!currentShop) return;
    setMethodsError(null);
    setPendingMethodId(id);
    try {
      const nextEnabled = enabledMethods.includes(id)
        ? enabledMethods.filter((method) => method !== id)
        : [...enabledMethods, id];
      const updated = await db.paymentMethods.setEnabled(currentShop.id, nextEnabled);
      setEnabledMethods(coerceMethodIds(updated));
    } catch (error) {
      setMethodsError(error instanceof Error ? error.message : 'Failed to update payment methods.');
    } finally {
      setPendingMethodId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  const tabs: Array<{ id: typeof activeTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp size={16} /> },
    { id: 'methods', label: 'Payment Methods', icon: <CreditCard size={16} /> },
    { id: 'transactions', label: 'Transactions', icon: <Wallet size={16} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="heading-h2">Payment Management</h1>
        <Button
          variant="primary"
          icon={<Plus size={16} />}
          onClick={() => setActiveTab('methods')}
        >
          Add Payment Method
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-verde-primary text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border border-gray-100">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalAmount)}</p>
                </div>
              </div>
            </Card>

            <Card className="border border-gray-100">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Transactions</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalTransactions}</p>
                </div>
              </div>
            </Card>

            <Card className="border border-gray-100">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-purple-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Avg Transaction</p>
                  <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.avgTransaction)}</p>
                </div>
              </div>
            </Card>

            <Card className="border border-gray-100">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-4 h-4 text-orange-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Success Rate</p>
                  <p className="text-2xl font-semibold text-gray-900">99.8%</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Payment Method Breakdown */}
          <Card title="Payment Method Breakdown" className="border border-gray-100">
            <div className="space-y-4">
              {Object.entries(stats.methodBreakdown).map(([method, amount]) => {
                const percentage = stats.totalAmount > 0 ? (amount / stats.totalAmount) * 100 : 0;
                return (
                  <div key={method} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        {method === 'card' && <CreditCard size={16} />}
                        {method === 'cash' && <DollarSign size={16} />}
                        {method === 'mobile' && <Smartphone size={16} />}
                      </div>
                      <span className="font-medium text-gray-900 capitalize">{method}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(amount)}</p>
                      <p className="text-sm text-gray-500">{percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Payment Methods Tab */}
      {activeTab === 'methods' && (
        <div className="space-y-6">
          {methodsError && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {methodsError}
            </div>
          )}
          {methodsLoading && (
            <div className="rounded border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-600">
              Loading payment methods...
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PAYMENT_METHOD_ORDER.map((methodId) => {
              const definition = PAYMENT_METHOD_DEFINITIONS[methodId];
              const enabled = enabledMethods.includes(methodId);
              return (
                <Card key={methodId} className="border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      enabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {methodId === 'card' && <CreditCard size={20} />}
                      {methodId === 'digital_wallet' && <Wallet size={20} />}
                      {methodId === 'mobile' && <Smartphone size={20} />}
                      {methodId === 'cash' && <DollarSign size={20} />}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{definition.name}</h3>
                      <p className="text-sm text-gray-500">{definition.description}</p>
                      <p className="text-xs text-gray-400">Fee: {definition.fee}%</p>
                    </div>
                  </div>
                  <button
                    onClick={() => togglePaymentMethod(methodId)}
                    disabled={methodsLoading || pendingMethodId === methodId}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      enabled ? 'bg-verde-primary' : 'bg-gray-200'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      enabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <Card title="Recent Transactions" className="border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map(transaction => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{transaction.reference}</div>
                        <div className="text-sm text-gray-500">ID: {transaction.id}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{formatCurrency(transaction.amount)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                        {transaction.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : transaction.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.status === 'completed' && <Check size={12} className="mr-1" />}
                        {transaction.status === 'failed' && <X size={12} className="mr-1" />}
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(transaction.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <Card title="Payment Settings" className="border border-gray-100">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Payment Method
                </label>
                <select className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-verde-primary focus:border-verde-primary">
                  <option>Credit/Debit Cards</option>
                  <option>Cash</option>
                  <option>Digital Wallet</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auto-settlement
                </label>
                <div className="flex items-center">
                  <input type="checkbox" className="h-4 w-4 text-verde-primary focus:ring-verde-primary border-gray-300 rounded" />
                  <span className="ml-2 text-sm text-gray-700">Enable automatic daily settlement</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Receipt Options
                </label>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input type="checkbox" className="h-4 w-4 text-verde-primary focus:ring-verde-primary border-gray-300 rounded" defaultChecked />
                    <span className="ml-2 text-sm text-gray-700">Print receipt automatically</span>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" className="h-4 w-4 text-verde-primary focus:ring-verde-primary border-gray-300 rounded" />
                    <span className="ml-2 text-sm text-gray-700">Email receipt to customer</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};