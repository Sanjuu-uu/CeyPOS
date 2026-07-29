import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import {
  Download,
  DollarSign,
  Package,
  Users,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Boxes,
  Receipt,
  AlertTriangle,
  Repeat,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useApp } from '../../../context/AppContext';
import { db } from '../../../lib/db';
import { getSearchHash } from '../../../lib/navigationSearch';

/* ------------------------------------------------------------------ */
/*  Theme                                                              */
/* ------------------------------------------------------------------ */
const ACCENT = '#c5f542';
const COLOR_CURRENT = '#2563eb';
const COLOR_PREVIOUS = '#10b981';
const PALETTE = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

type Granularity = 'day' | 'week' | 'month';

const formatCurrency = (amount: number) =>
  `$${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatCompact = (amount: number) =>
  amount >= 1000 ? `$${(amount / 1000).toFixed(1)}k` : `$${Math.round(amount)}`;

const pctChange = (curr: number, prev: number) =>
  prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;

/* ------------------------------------------------------------------ */
/*  Bucketing helpers (real data → time buckets)                      */
/* ------------------------------------------------------------------ */
interface Bucket {
  key: string;
  label: string;
  rangeStart: Date;
  rangeEnd: Date;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

const buildBuckets = (start: Date, end: Date, gran: Granularity): Bucket[] => {
  const buckets: Bucket[] = [];
  if (gran === 'day') {
    for (let d = startOfDay(start); d <= end; d.setDate(d.getDate() + 1)) {
      const s = new Date(d);
      buckets.push({
        key: s.toISOString().split('T')[0],
        label: s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        rangeStart: startOfDay(s),
        rangeEnd: endOfDay(s),
      });
    }
  } else if (gran === 'week') {
    for (let d = startOfDay(start); d <= end; d.setDate(d.getDate() + 7)) {
      const s = new Date(d);
      const e = new Date(d);
      e.setDate(e.getDate() + 6);
      buckets.push({
        key: s.toISOString().split('T')[0],
        label: s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        rangeStart: startOfDay(s),
        rangeEnd: endOfDay(e),
      });
    }
  } else {
    for (let d = new Date(start.getFullYear(), start.getMonth(), 1); d <= end; d.setMonth(d.getMonth() + 1)) {
      const s = new Date(d);
      const e = new Date(s.getFullYear(), s.getMonth() + 1, 0);
      buckets.push({
        key: `${s.getFullYear()}-${s.getMonth()}`,
        label: s.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        rangeStart: startOfDay(s),
        rangeEnd: endOfDay(e),
      });
    }
  }
  return buckets;
};

const sumInto = (buckets: Bucket[], sales: any[]) => {
  const totals = buckets.map(() => 0);
  sales.forEach((sale) => {
    const t = new Date(sale.timestamp).getTime();
    const idx = buckets.findIndex((b) => t >= b.rangeStart.getTime() && t <= b.rangeEnd.getTime());
    if (idx >= 0) totals[idx] += sale.total || 0;
  });
  return totals;
};

/* ------------------------------------------------------------------ */
/*  Small reusable visuals                                            */
/* ------------------------------------------------------------------ */
const Sparkline: React.FC<{ data: { v: number }[]; color: string; id: string }> = ({ data, color, id }) => (
  <ResponsiveContainer width="100%" height={44}>
    <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#spark-${id})`} dot={false} />
    </AreaChart>
  </ResponsiveContainer>
);

const KpiCard: React.FC<{
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  trend?: number;
  accent?: boolean;
  spark?: { v: number }[];
  sparkId?: string;
}> = ({ label, value, sub, icon, trend, accent, spark, sparkId }) => (
  <div
    className={`rounded-2xl p-5 shadow-sm border ${accent ? 'border-transparent' : 'border-gray-100 bg-white'}`}
    style={accent ? { backgroundColor: ACCENT } : undefined}
  >
    <div className="flex items-center justify-between">
      <p className={`text-xs font-semibold uppercase tracking-wide ${accent ? 'text-gray-800/70' : 'text-gray-400'}`}>
        {label}
      </p>
      <div className={`p-1.5 rounded-lg ${accent ? 'bg-black/10 text-gray-900' : 'bg-gray-100 text-gray-600'}`}>
        {icon}
      </div>
    </div>

    <div className="mt-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <p className={`text-2xl font-bold leading-tight ${accent ? 'text-gray-900' : 'text-gray-800'}`}>{value}</p>
        <div className="flex items-center gap-2 mt-1">
          {typeof trend === 'number' && (
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                accent
                  ? trend >= 0
                    ? 'text-green-800'
                    : 'text-red-700'
                  : trend >= 0
                  ? 'text-green-600'
                  : 'text-red-500'
              }`}
            >
              {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          {sub && <span className={`text-xs ${accent ? 'text-gray-800/60' : 'text-gray-400'}`}>{sub}</span>}
        </div>
      </div>
      {spark && spark.length > 1 && (
        <div className="w-24 flex-shrink-0">
          <Sparkline data={spark} color={accent ? '#1f2937' : COLOR_CURRENT} id={sparkId || label} />
        </div>
      )}
    </div>
  </div>
);

const CompareTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-3 text-xs min-w-[160px]">
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}</span>
          <span className="ml-auto font-semibold text-gray-800">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const BarTooltip =
  (formatter: (v: number) => string) =>
  ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-100 px-3 py-2 text-xs">
        <p className="font-medium text-gray-800">{payload[0].payload.label}</p>
        <p className="text-gray-500">{formatter(payload[0].value)}</p>
        {payload[0].payload.sub && <p className="text-gray-400 mt-0.5">{payload[0].payload.sub}</p>}
      </div>
    );
  };

const Donut: React.FC<{
  data: { label: string; value: number }[];
  centerValue: string;
  centerLabel: string;
}> = ({ data, centerValue, centerLabel }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <EmptyState label="No data to display" />;
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="relative w-[180px] h-[180px] flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={58}
              outerRadius={84}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: any, n: any) => [formatCurrency(Number(v)), n]}
              contentStyle={{ borderRadius: 10, border: '1px solid #f1f5f9', fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-gray-800">{centerValue}</span>
          <span className="text-xs text-gray-400">{centerLabel}</span>
        </div>
      </div>
      <div className="space-y-2 w-full">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
              <span className="text-gray-600 capitalize truncate">{d.label}</span>
            </div>
            <span className="font-medium text-gray-800 ml-2 whitespace-nowrap">
              {Math.round((d.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
};

const Gauge: React.FC<{ value: number; label: string; color?: string }> = ({ value, label, color = ACCENT }) => {
  const target = Math.max(0, Math.min(100, value));
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let raf = 0;
    const duration = 900;
    const startTime = performance.now();
    const from = 0;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      setPct(from + (target - from) * ease(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const f = pct / 100;
  const cx = 110;
  const cy = 116;
  const r = 88;
  const sw = 16;
  const gradId = `gauge-${color.replace('#', '')}`;

  const start = polar(cx, cy, r, 180);
  const end = polar(cx, cy, r, 0);
  const cur = polar(cx, cy, r, 180 - 180 * f);

  const track = `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`;
  const progress = `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${cur.x} ${cur.y}`;

  return (
    <div className="relative w-full max-w-[300px] mx-auto">
      <svg viewBox="0 0 220 132" className="w-full">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={1} />
          </linearGradient>
        </defs>
        <path d={track} fill="none" stroke="#eef2f6" strokeWidth={sw} strokeLinecap="round" />
        {f > 0 && (
          <>
            <path d={progress} fill="none" stroke={`url(#${gradId})`} strokeWidth={sw} strokeLinecap="round" />
            <circle cx={cur.x} cy={cur.y} r={11} fill="white" stroke={color} strokeWidth={4} />
          </>
        )}
      </svg>
      <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: '46%' }}>
        <span className="text-4xl font-bold text-gray-800 leading-none">{pct.toFixed(0)}%</span>
        <span className="text-xs text-gray-400 mt-2">{label}</span>
      </div>
    </div>
  );
};

const HorizontalBarChart: React.FC<{
  data: { label: string; value: number; sub?: string }[];
  formatter?: (v: number) => string;
}> = ({ data, formatter = (v) => String(v) }) => {
  if (data.length === 0) return <EmptyState label="No data to display" />;
  const height = Math.max(220, data.length * 38 + 24);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 20, bottom: 4, left: 0 }} barCategoryGap="22%">
        <CartesianGrid horizontal={false} stroke="#f1f5f9" />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => formatCompact(v)}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 11, fill: '#475569' }}
          axisLine={false}
          tickLine={false}
          width={130}
          tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 18)}…` : v)}
        />
        <Tooltip cursor={{ fill: '#f8fafc' }} content={BarTooltip(formatter)} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

const ColorBarChart: React.FC<{
  data: { label: string; value: number; sub?: string }[];
  formatter?: (v: number) => string;
  height?: number;
}> = ({ data, formatter = (v) => String(v), height = 260 }) => {
  if (data.length === 0) return <EmptyState label="No data to display" />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 0 }} barCategoryGap="25%">
        <CartesianGrid vertical={false} stroke="#f1f5f9" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          interval={0}
          tickFormatter={(v: string) => (v.length > 10 ? `${v.slice(0, 10)}…` : v)}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => formatCompact(v)}
          width={44}
        />
        <Tooltip cursor={{ fill: '#f8fafc' }} content={BarTooltip(formatter)} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

const EmptyState: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
    <Boxes size={32} className="mb-2 opacity-50" />
    <p className="text-sm">{label}</p>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */
export const Reports: React.FC = () => {
  const { currentShop } = useApp();
  type ReportTab = 'sales' | 'inventory' | 'customers';
  const [selectedReport, setSelectedReport] = useState<ReportTab>('sales');
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [showAllCustomers, setShowAllCustomers] = useState(false);
  const CUSTOMER_LIMIT = 5;
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const tabs: ReportTab[] = ['sales', 'inventory', 'customers'];
    const applySearchHash = () => {
      const hash = getSearchHash();
      const tab = hash.startsWith('reports:') ? hash.split(':')[1] : '';
      if (tabs.includes(tab as ReportTab)) setSelectedReport(tab as ReportTab);
    };

    applySearchHash();
    window.addEventListener('hashchange', applySearchHash);
    return () => window.removeEventListener('hashchange', applySearchHash);
  }, []);

  useEffect(() => {
    if (!currentShop) {
      setSales([]);
      setProducts([]);
      return;
    }
    const shopId = currentShop.id;
    setSales(db.sales.getByShopId(shopId));
    setProducts(db.products.getByShopId(shopId));
    const unsubSales = (db as any).on('saleCreated', () => setSales(db.sales.getByShopId(shopId)));
    const unsubInv = (db as any).on('inventoryUpdated', () => setProducts(db.products.getByShopId(shopId)));
    return () => {
      unsubSales();
      unsubInv();
    };
  }, [currentShop]);

  const applyPreset = (days: number) => {
    setDateRange({
      start: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
    });
  };
  const presets = [
    { label: '7D', days: 7 },
    { label: '30D', days: 30 },
    { label: '90D', days: 90 },
  ];

  /* ---- current + previous period sales ---- */
  const { filteredSales, prevSales, startD, endD, prevStartD, prevEndD } = useMemo(() => {
    const s = startOfDay(new Date(dateRange.start));
    const e = endOfDay(new Date(dateRange.end));
    const span = e.getTime() - s.getTime() || 24 * 60 * 60 * 1000;
    const ps = new Date(s.getTime() - span - 1);
    const pe = new Date(s.getTime() - 1);
    const inRange = (sale: any, a: Date, b: Date) => {
      const t = new Date(sale.timestamp).getTime();
      return t >= a.getTime() && t <= b.getTime();
    };
    return {
      startD: s,
      endD: e,
      prevStartD: ps,
      prevEndD: pe,
      filteredSales: sales.filter((x) => inRange(x, s, e)),
      prevSales: sales.filter((x) => inRange(x, ps, pe)),
    };
  }, [sales, dateRange]);

  /* ---- comparison time series (this period vs previous) ---- */
  const trendData = useMemo(() => {
    const curBuckets = buildBuckets(startD, endD, granularity);
    const prevBuckets = buildBuckets(prevStartD, prevEndD, granularity);
    const curTotals = sumInto(curBuckets, filteredSales);
    const prevTotals = sumInto(prevBuckets, prevSales);
    return curBuckets.map((b, i) => ({
      label: b.label,
      current: curTotals[i] || 0,
      previous: prevTotals[i] ?? 0,
    }));
  }, [startD, endD, prevStartD, prevEndD, granularity, filteredSales, prevSales]);

  /* ---- daily series for sparklines ---- */
  const dailyStats = useMemo(() => {
    const buckets = buildBuckets(startD, endD, 'day');
    return buckets.map((b) => {
      const inBucket = filteredSales.filter((s) => {
        const t = new Date(s.timestamp).getTime();
        return t >= b.rangeStart.getTime() && t <= b.rangeEnd.getTime();
      });
      const revenue = inBucket.reduce((sum, s) => sum + (s.total || 0), 0);
      const items = inBucket.reduce(
        (sum, s) => sum + (s.items?.reduce((a: number, i: any) => a + (i.quantity || 0), 0) || 0),
        0
      );
      return { revenue, count: inBucket.length, items, aov: inBucket.length ? revenue / inBucket.length : 0 };
    });
  }, [startD, endD, filteredSales]);

  /* ---- sales report ---- */
  const salesReport = useMemo(() => {
    const totalRevenue = filteredSales.reduce((s, x) => s + (x.total || 0), 0);
    const totalTransactions = filteredSales.length;
    const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const itemsSold = filteredSales.reduce(
      (s, x) => s + (x.items?.reduce((a: number, i: any) => a + (i.quantity || 0), 0) || 0),
      0
    );

    const paymentMethods = filteredSales.reduce((acc, sale) => {
      acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + (sale.total || 0);
      return acc;
    }, {} as Record<string, number>);

    const productMap: Record<string, { qty: number; revenue: number }> = {};
    filteredSales.forEach((sale) =>
      sale.items?.forEach((item: any) => {
        if (!productMap[item.name]) productMap[item.name] = { qty: 0, revenue: 0 };
        productMap[item.name].qty += item.quantity || 0;
        productMap[item.name].revenue += (item.price || 0) * (item.quantity || 0);
      })
    );
    const topProducts = Object.entries(productMap)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 6)
      .map(([name, d]) => ({ label: name, value: d.revenue, sub: `${d.qty} units sold` }));

    const recent = [...filteredSales]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 6);

    return { totalRevenue, totalTransactions, averageOrderValue, itemsSold, paymentMethods, topProducts, recent };
  }, [filteredSales]);

  const prevRevenue = prevSales.reduce((s, x) => s + (x.total || 0), 0);
  const prevItems = prevSales.reduce(
    (s, x) => s + (x.items?.reduce((a: number, i: any) => a + (i.quantity || 0), 0) || 0),
    0
  );
  const prevAov = prevSales.length ? prevRevenue / prevSales.length : 0;

  /* ---- inventory report ---- */
  const inventoryReport = useMemo(() => {
    const totalProducts = products.length;
    const totalValue = products.reduce((s, p) => s + (p.price || 0) * (p.stock || 0), 0);
    const totalUnits = products.reduce((s, p) => s + (p.stock || 0), 0);
    const lowStockItems = products
      .filter((p) => (p.stock || 0) < 10)
      .sort((a, b) => (a.stock || 0) - (b.stock || 0));
    const outOfStock = products.filter((p) => (p.stock || 0) === 0).length;
    const inStock = products.filter((p) => (p.stock || 0) >= 10).length;

    const catMap: Record<string, { count: number; value: number }> = {};
    products.forEach((p) => {
      const c = p.category || 'Uncategorized';
      if (!catMap[c]) catMap[c] = { count: 0, value: 0 };
      catMap[c].count++;
      catMap[c].value += (p.price || 0) * (p.stock || 0);
    });
    const sortedCats = Object.entries(catMap)
      .map(([label, d]) => ({ label, value: d.value, count: d.count }))
      .sort((a, b) => b.value - a.value);
    const TOP_CATS = 10;
    let topCats = sortedCats;
    if (sortedCats.length > TOP_CATS) {
      const rest = sortedCats.slice(TOP_CATS);
      topCats = [
        ...sortedCats.slice(0, TOP_CATS),
        {
          label: 'Other',
          value: rest.reduce((s, c) => s + c.value, 0),
          count: rest.reduce((s, c) => s + c.count, 0),
        },
      ];
    }
    const categoryBars = topCats.map((c) => ({ label: c.label, value: c.value, sub: `${c.count} products` }));

    const stockHealth = [
      { label: 'Healthy (10+)', value: inStock },
      { label: 'Low (1-9)', value: products.filter((p) => (p.stock || 0) > 0 && (p.stock || 0) < 10).length },
      { label: 'Out of stock', value: outOfStock },
    ].filter((s) => s.value > 0);

    const availability = totalProducts ? ((totalProducts - outOfStock) / totalProducts) * 100 : 0;

    return { totalProducts, totalValue, totalUnits, lowStockItems, outOfStock, categoryBars, stockHealth, availability };
  }, [products]);

  /* ---- customer report ---- */
  const customerReport = useMemo(() => {
    const purchases: Record<string, { name?: string; total: number; count: number; last: string }> = {};
    filteredSales.forEach((sale) => {
      const email = sale.customerInfo?.email;
      if (!email) return;
      if (!purchases[email]) purchases[email] = { name: sale.customerInfo?.name, total: 0, count: 0, last: sale.timestamp };
      purchases[email].total += sale.total || 0;
      purchases[email].count++;
      if (new Date(sale.timestamp) > new Date(purchases[email].last)) purchases[email].last = sale.timestamp;
    });
    const entries = Object.entries(purchases);
    const totalCustomers = entries.length;
    const repeatCustomers = entries.filter(([, p]) => p.count > 1).length;
    const guestSales = filteredSales.filter((s) => !s.customerInfo?.email).length;
    const retention = totalCustomers ? (repeatCustomers / totalCustomers) * 100 : 0;

    const allRows = entries.sort(([, a], [, b]) => b.total - a.total);
    const topBars = allRows
      .slice(0, 5)
      .map(([email, d]) => ({ label: d.name || email.split('@')[0], value: d.total, sub: `${d.count} orders` }));

    const mix = [
      { label: 'Registered', value: filteredSales.length - guestSales },
      { label: 'Guest', value: guestSales },
    ].filter((m) => m.value > 0);

    return { totalCustomers, repeatCustomers, guestSales, retention, allRows, topBars, mix };
  }, [filteredSales]);

  /* ---- tabs ---- */
  const reportTypes = [
    { id: 'sales' as const, name: 'Sales', icon: <DollarSign size={18} /> },
    { id: 'inventory' as const, name: 'Inventory', icon: <Package size={18} /> },
    { id: 'customers' as const, name: 'Customers', icon: <Users size={18} /> },
  ];

  /* ---- CSV export ---- */
  const downloadReport = () => {
    let rows: (string | number)[][] = [];
    if (selectedReport === 'sales') {
      rows = [
        ['Metric', 'Value'],
        ['Total Revenue', salesReport.totalRevenue.toFixed(2)],
        ['Transactions', salesReport.totalTransactions],
        ['Average Order Value', salesReport.averageOrderValue.toFixed(2)],
        ['Items Sold', salesReport.itemsSold],
        [],
        ['Period', 'This period', 'Previous period'],
        ...trendData.map((d) => [d.label, d.current.toFixed(2), d.previous.toFixed(2)]),
      ];
    } else if (selectedReport === 'inventory') {
      rows = [
        ['Metric', 'Value'],
        ['Total Products', inventoryReport.totalProducts],
        ['Inventory Value', inventoryReport.totalValue.toFixed(2)],
        ['Units in Stock', inventoryReport.totalUnits],
        ['Out of Stock', inventoryReport.outOfStock],
        [],
        ['Category', 'Value', 'Products'],
        ...inventoryReport.categoryBars.map((c) => [c.label, c.value.toFixed(2), c.sub || '']),
      ];
    } else {
      rows = [
        ['Metric', 'Value'],
        ['Total Customers', customerReport.totalCustomers],
        ['Repeat Customers', customerReport.repeatCustomers],
        ['Retention Rate', `${customerReport.retention.toFixed(1)}%`],
        [],
        ['Customer', 'Orders', 'Total Spent'],
        ...customerReport.allRows.map(([email, d]) => [d.name || email, d.count, d.total.toFixed(2)]),
      ];
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedReport}-report-${dateRange.start}-to-${dateRange.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ------------------------------------------------------------------ */
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-action-row">
        <div>
          <p className="page-subheading">Review business insights and performance trends</p>
        </div>
        <Button variant="dark" icon={<Download size={16} />} onClick={downloadReport}>
          Export CSV
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        <div className="inline-flex bg-gray-100 rounded-full p-1 w-fit">
          {reportTypes.map((report) => (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedReport === report.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {report.icon}
              {report.name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex gap-1">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.days)}
                className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} />
            <span className="text-gray-400">–</span>
            <Input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} />
          </div>
        </div>
      </div>

      {/* ============================== SALES ============================== */}
      {selectedReport === 'sales' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Total Revenue"
              value={formatCurrency(salesReport.totalRevenue)}
              icon={<DollarSign size={18} />}
              trend={pctChange(salesReport.totalRevenue, prevRevenue)}
              accent
              spark={dailyStats.map((d) => ({ v: d.revenue }))}
              sparkId="rev"
            />
            <KpiCard
              label="Transactions"
              value={String(salesReport.totalTransactions)}
              icon={<Receipt size={18} />}
              trend={pctChange(salesReport.totalTransactions, prevSales.length)}
              spark={dailyStats.map((d) => ({ v: d.count }))}
              sparkId="txn"
            />
            <KpiCard
              label="Avg Order"
              value={formatCurrency(salesReport.averageOrderValue)}
              icon={<ShoppingCart size={18} />}
              trend={pctChange(salesReport.averageOrderValue, prevAov)}
              spark={dailyStats.map((d) => ({ v: d.aov }))}
              sparkId="aov"
            />
            <KpiCard
              label="Items Sold"
              value={String(salesReport.itemsSold)}
              icon={<Boxes size={18} />}
              trend={pctChange(salesReport.itemsSold, prevItems)}
              spark={dailyStats.map((d) => ({ v: d.items }))}
              sparkId="items"
            />
          </div>

          {/* Comparison chart */}
          <Card className="border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
              <div className="flex items-center gap-5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: COLOR_CURRENT }} />
                  <span className="text-gray-600">This period</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: COLOR_PREVIOUS }} />
                  <span className="text-gray-600">Previous period</span>
                </div>
              </div>
              <div className="inline-flex bg-gray-100 rounded-lg p-1">
                {(['day', 'week', 'month'] as Granularity[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGranularity(g)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
                      granularity === g ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {filteredSales.length === 0 && prevSales.length === 0 ? (
              <EmptyState label="No sales in this period" />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={trendData} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="cur" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLOR_CURRENT} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={COLOR_CURRENT} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="prev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLOR_PREVIOUS} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={COLOR_PREVIOUS} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} minTickGap={20} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    tickFormatter={(v: number) => formatCompact(v)}
                  />
                  <Tooltip content={<CompareTooltip />} />
                  <Area
                    type="monotone"
                    name="Previous period"
                    dataKey="previous"
                    stroke={COLOR_PREVIOUS}
                    strokeWidth={2}
                    fill="url(#prev)"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    name="This period"
                    dataKey="current"
                    stroke={COLOR_CURRENT}
                    strokeWidth={2.5}
                    fill="url(#cur)"
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Payment Methods" className="border border-gray-100">
              <Donut
                data={Object.entries(salesReport.paymentMethods).map(([label, value]) => ({ label, value: value as number }))}
                centerValue={formatCompact(salesReport.totalRevenue)}
                centerLabel="total"
              />
            </Card>
            <Card title="Top Products" subtitle="By revenue" className="border border-gray-100">
              <ColorBarChart data={salesReport.topProducts} formatter={formatCurrency} />
            </Card>
          </div>

          <Card title="Recent Transactions" className="border border-gray-100">
            {salesReport.recent.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-100">
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Customer</th>
                      <th className="pb-3 font-medium">Items</th>
                      <th className="pb-3 font-medium capitalize">Method</th>
                      <th className="pb-3 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesReport.recent.map((sale) => (
                      <tr key={sale.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-3 text-gray-600">{new Date(sale.timestamp).toLocaleDateString()}</td>
                        <td className="py-3 text-gray-800">{sale.customerInfo?.name || 'Guest'}</td>
                        <td className="py-3 text-gray-600">
                          {sale.items?.reduce((a: number, i: any) => a + (i.quantity || 0), 0) || 0}
                        </td>
                        <td className="py-3 capitalize text-gray-600">{sale.paymentMethod}</td>
                        <td className="py-3 text-right font-semibold text-gray-900">{formatCurrency(sale.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState label="No transactions in this period" />
            )}
          </Card>
        </div>
      )}

      {/* ============================ INVENTORY ============================ */}
      {selectedReport === 'inventory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Inventory Value" value={formatCurrency(inventoryReport.totalValue)} icon={<DollarSign size={18} />} accent />
            <KpiCard label="Total Products" value={String(inventoryReport.totalProducts)} icon={<Package size={18} />} />
            <KpiCard label="Units in Stock" value={inventoryReport.totalUnits.toLocaleString()} icon={<Boxes size={18} />} />
            <KpiCard label="Out of Stock" value={String(inventoryReport.outOfStock)} icon={<AlertTriangle size={18} />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title="Value by Category" subtitle="Top categories by stock value" className="border border-gray-100 lg:col-span-2">
              <HorizontalBarChart data={inventoryReport.categoryBars} formatter={formatCurrency} />
            </Card>
            <Card title="Availability" subtitle="Products in stock" className="border border-gray-100 self-start">
              <Gauge value={inventoryReport.availability} label="of products in stock" color={COLOR_PREVIOUS} />
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title="Stock Health" className="border border-gray-100">
              <Donut data={inventoryReport.stockHealth} centerValue={String(inventoryReport.totalProducts)} centerLabel="products" />
            </Card>
            <Card title="Low Stock Alert" subtitle="Fewer than 10 units" className="border border-gray-100 lg:col-span-2">
              {inventoryReport.lowStockItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto">
                  {inventoryReport.lowStockItems.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.category || 'Uncategorized'}</p>
                      </div>
                      <span
                        className={`text-sm font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ml-2 ${
                          (product.stock || 0) === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {product.stock || 0} left
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">All products are well stocked! 🎉</p>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ============================ CUSTOMERS ============================ */}
      {selectedReport === 'customers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Customers" value={String(customerReport.totalCustomers)} icon={<Users size={18} />} accent />
            <KpiCard label="Repeat Customers" value={String(customerReport.repeatCustomers)} icon={<Repeat size={18} />} />
            <KpiCard label="Retention" value={`${customerReport.retention.toFixed(0)}%`} icon={<TrendingUp size={18} />} />
            <KpiCard label="Guest Sales" value={String(customerReport.guestSales)} icon={<ShoppingCart size={18} />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title="Top Customers" subtitle="By total spend" className="border border-gray-100 lg:col-span-2">
              <ColorBarChart data={customerReport.topBars} formatter={formatCurrency} />
            </Card>
            <Card title="Retention Rate" subtitle="Repeat vs total" className="border border-gray-100 self-start">
              <Gauge value={customerReport.retention} label="customers return" />
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title="Customer Mix" className="border border-gray-100">
              <Donut data={customerReport.mix} centerValue={String(filteredSales.length)} centerLabel="orders" />
            </Card>
            <Card title="Top Customers" className="border border-gray-100 lg:col-span-2">
              {customerReport.allRows.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-400 border-b border-gray-100">
                          <th className="pb-3 font-medium">#</th>
                          <th className="pb-3 font-medium">Customer</th>
                          <th className="pb-3 font-medium">Orders</th>
                          <th className="pb-3 font-medium text-right">Total Spent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(showAllCustomers
                          ? customerReport.allRows
                          : customerReport.allRows.slice(0, CUSTOMER_LIMIT)
                        ).map(([email, d], i) => (
                          <tr key={email} className="border-b border-gray-50 last:border-0">
                            <td className="py-3 text-gray-400">{i + 1}</td>
                            <td className="py-3">
                              <p className="text-gray-800 font-medium">{d.name || email.split('@')[0]}</p>
                              <p className="text-xs text-gray-400">{email}</p>
                            </td>
                            <td className="py-3 text-gray-600">{d.count}</td>
                            <td className="py-3 text-right font-semibold text-gray-900">{formatCurrency(d.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {customerReport.allRows.length > CUSTOMER_LIMIT && (
                    <button
                      onClick={() => setShowAllCustomers((v) => !v)}
                      className="mt-4 w-full py-2.5 text-sm font-medium text-gray-700 rounded-lg border border-gray-200 hover:border-gray-900 hover:text-gray-900 transition-colors"
                    >
                      {showAllCustomers
                        ? 'Show less'
                        : `View all ${customerReport.allRows.length} customers`}
                    </button>
                  )}
                </>
              ) : (
                <EmptyState label="No customer data in this period" />
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
