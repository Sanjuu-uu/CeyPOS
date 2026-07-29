import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { useApp } from '../../../context/AppContext';
import { db } from '../../../lib/db';
import { getSearchHash } from '../../../lib/navigationSearch';
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
  type PaymentTab = 'overview' | 'methods' | 'transactions' | 'settings';
  const [activeTab, setActiveTab] = useState<PaymentTab>('overview');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [enabledMethods, setEnabledMethods] = useState<PaymentMethodId[]>(DEFAULT_ENABLED_METHODS);
  const [methodsLoading, setMethodsLoading] = useState(false);
  const [methodsError, setMethodsError] = useState<string | null>(null);
  const [pendingMethodId, setPendingMethodId] = useState<PaymentMethodId | null>(null);

  useEffect(() => {
    const tabs: PaymentTab[] = ['overview', 'methods', 'transactions', 'settings'];
    const applySearchHash = () => {
      const hash = getSearchHash();
      const tab = hash.startsWith('payments:') ? hash.split(':')[1] : '';
      if (tabs.includes(tab as PaymentTab)) setActiveTab(tab as PaymentTab);
    };

    applySearchHash();
    window.addEventListener('hashchange', applySearchHash);
    return () => window.removeEventListener('hashchange', applySearchHash);
  }, []);

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

  const tabs: Array<{ id: typeof activeTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'methods', label: 'Payment Methods' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'settings', label: 'Settings' },
  ];

  const metrics = [
    {
      label: 'Total revenue',
      value: formatCurrency(stats.totalAmount),
      badge: stats.totalAmount > 0 ? 'Live data' : 'No change',
    },
    {
      label: 'Transactions',
      value: stats.totalTransactions.toLocaleString(),
      badge: stats.totalTransactions > 0 ? 'Live data' : 'No change',
    },
    {
      label: 'Average payment',
      value: formatCurrency(stats.avgTransaction),
      badge: stats.avgTransaction > 0 ? 'Live data' : 'No change',
    },
    {
      label: 'Success rate',
      value: transactions.length > 0 ? '100%' : '0%',
      badge: transactions.length > 0 ? 'Live data' : 'No change',
    },
  ];

  return (
    <div className="space-y-5">
      <div className="page-action-row">
        <p className="page-subheading">Manage payments and transaction preferences</p>
        <Button
          variant="primary"
          onClick={() => setActiveTab('methods')}
        >
          Add Payment Method
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="module-tabs">
        <nav className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <Card key={metric.label} className="min-h-[150px] !p-5">
                <div className="flex items-start justify-end">
                  <span className="flex items-center rounded-full bg-gradient-to-r from-gray-100 to-gray-200 px-2 py-1 text-[10px] font-semibold text-[#777773]">
                    {metric.badge}
                  </span>
                </div>
                <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.1em] text-[#858580]">
                  {metric.label}
                </p>
                <p className="mt-1 text-[26px] font-semibold leading-none tracking-[-0.04em] text-[#111]">
                  {metric.value}
                </p>
              </Card>
            ))}
          </div>

          {/* Payment Method Breakdown */}
          <Card title="Payment method breakdown" subtitle="Sales grouped by tender type">
            <div className="space-y-3">
              {Object.entries(stats.methodBreakdown).length > 0 ? (
                Object.entries(stats.methodBreakdown).map(([method, amount]) => {
                  const percentage = stats.totalAmount > 0 ? (amount / stats.totalAmount) * 100 : 0;
                  return (
                    <div key={method} className="flex items-center justify-between rounded-xl border border-[#eeeeeb] bg-white px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold capitalize text-[#181818]">{method}</p>
                        <p className="mt-1 text-xs text-[#777773]">{percentage.toFixed(1)}% of payment volume</p>
                      </div>
                      <p className="text-sm font-semibold text-[#181818]">{formatCurrency(amount)}</p>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-[#eeeeeb] bg-white px-5 py-6 text-center">
                  <p className="text-sm font-medium text-[#333330]">No payments recorded</p>
                  <p className="mt-1 text-xs text-[#81817c]">Completed sales will appear here automatically.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Payment Methods Tab */}
      {activeTab === 'methods' && (
        <div className="space-y-5">
          {methodsError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {methodsError}
            </div>
          )}
          {methodsLoading && (
            <div className="rounded-xl border border-[#eeeeeb] bg-white px-4 py-3 text-sm text-[#777773]">
              Loading payment methods...
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {PAYMENT_METHOD_ORDER.map((methodId) => {
              const definition = PAYMENT_METHOD_DEFINITIONS[methodId];
              const enabled = enabledMethods.includes(methodId);
              return (
                <Card key={methodId} className="!p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-[#181818]">{definition.name}</h3>
                      <p className="mt-1 text-xs text-[#777773]">{definition.description}</p>
                      <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.1em] text-[#858580]">Fee {definition.fee}%</p>
                    </div>
                    <button
                      onClick={() => togglePaymentMethod(methodId)}
                      disabled={methodsLoading || pendingMethodId === methodId}
                      className={`relative h-7 w-12 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        enabled ? 'bg-[#c5f542]' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`block h-6 w-6 rounded-full bg-white shadow transition-transform ${
                        enabled ? 'translate-x-5' : 'translate-x-0.5'
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
        <Card title="Recent transactions" subtitle="Latest completed payment activity">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#f3f4f6]">
                <tr>
                  <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-[0.1em] text-[#666661]">
                    Transaction
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-[0.1em] text-[#666661]">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-[0.1em] text-[#666661]">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-[0.1em] text-[#666661]">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-[0.1em] text-[#666661]">
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
        <div className="space-y-5">
          <Card title="Payment settings" subtitle="Default tender and receipt preferences">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Payment Method
                </label>
                <select className="block w-full rounded-lg border border-[#dfdfda] bg-white px-3 py-2 text-sm text-[#333330] shadow-sm outline-none focus:border-black focus:ring-2 focus:ring-black">
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
