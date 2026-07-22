import React, { useRef, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Funnel,
  FunnelChart, LabelList, Legend, Line, LineChart, Pie, PieChart, PolarAngleAxis,
  PolarGrid, PolarRadiusAxis, Radar, RadarChart, RadialBar, RadialBarChart,
  ResponsiveContainer, Scatter, ScatterChart, Tooltip, Treemap, XAxis, YAxis,
} from 'recharts';
import { ChevronDown, ChevronUp, Download, Maximize2, Minimize2, X } from 'lucide-react';

export type NativeChartType = 'bar' | 'stacked_bar' | 'column' | 'stacked_column' |
  'line' | 'area' | 'stacked_area' | 'combo' | 'pie' | 'donut' | 'scatter' |
  'bubble' | 'radar' | 'funnel' | 'waterfall' | 'treemap' | 'gauge' | 'kpi' |
  'table' | 'heatmap';

export type VisualizationData =
  | { type: 'kpi_card'; title: string; value: string; subtitle?: string | null; target?: number | null }
  | { type: 'native_chart'; version?: number; chartType: NativeChartType; title: string; subtitle?: string | null; data: Record<string, unknown>[]; categoryKey: string; valueKeys: string[]; seriesKey?: string | null; valueFormat?: 'number' | 'currency' | 'percent' | 'compact'; currency?: string; xAxisLabel?: string | null; yAxisLabel?: string | null; showLegend?: boolean; showDataLabels?: boolean; target?: number | null }
  | { type: 'remote_chart'; provider?: string; chartType?: string; title?: string; status?: string; assetUrl?: string | null; requestId?: string | null; expiresAt?: string | null; message?: string | null }
  | { type: 'visualization_error'; provider?: string; chartType?: string; title?: string; status?: string; message?: string };

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#ea580c', '#db2777', '#0891b2', '#65a30d', '#dc2626'];
const label = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
const numeric = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;

function valueFormatter(format = 'number', currency = 'USD') {
  return (value: unknown) => {
    const number = numeric(value);
    if (format === 'currency') return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(number);
    if (format === 'percent') return `${number.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
    if (format === 'compact') return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(number);
    return number.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };
}

const AxisTick = { fontSize: 11, fill: '#64748b' };

function NativeChart({ visualization }: { visualization: Extract<VisualizationData, { type: 'native_chart' }> }) {
  const { chartType, data, categoryKey, valueKeys, showLegend = true, showDataLabels = true } = visualization;
  const format = valueFormatter(visualization.valueFormat, visualization.currency);
  const tooltip = <Tooltip formatter={(value) => format(value)} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,.08)', fontSize: 12 }} />;
  const legend = showLegend && valueKeys.length > 1 ? <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} /> : null;
  const commonAxes = <><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey={categoryKey} tick={AxisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" /><YAxis tick={AxisTick} axisLine={false} tickLine={false} tickFormatter={(v) => format(v)} width={58} /></>;

  if (chartType === 'kpi') {
    const value = numeric(data[0]?.[valueKeys[0]]);
    const target = visualization.target;
    return <div className="flex h-full min-h-48 flex-col justify-center rounded-xl bg-gradient-to-br from-blue-50 to-white p-6"><p className="text-4xl font-bold tracking-tight text-slate-950">{format(value)}</p>{target != null && <><p className="mt-2 text-xs text-slate-500">Target {format(target)}</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, Math.max(0, value / target * 100))}%` }} /></div></>}</div>;
  }
  if (chartType === 'table') {
    const columns = Array.from(new Set(data.flatMap(Object.keys))).slice(0, 10);
    return <div className="max-h-80 overflow-auto rounded-lg border border-slate-200"><table className="w-full text-xs"><thead className="sticky top-0 bg-slate-100 text-left text-slate-600"><tr>{columns.map((column) => <th key={column} className="px-3 py-2 font-semibold">{label(column)}</th>)}</tr></thead><tbody>{data.map((row, index) => <tr key={index} className="border-t border-slate-100 hover:bg-blue-50/40">{columns.map((column) => <td key={column} className="px-3 py-2 text-slate-700">{typeof row[column] === 'number' ? format(row[column]) : String(row[column] ?? '—')}</td>)}</tr>)}</tbody></table></div>;
  }
  if (chartType === 'heatmap') {
    const max = Math.max(1, ...data.flatMap((row) => valueKeys.map((key) => numeric(row[key]))));
    return <div className="overflow-auto"><div className="grid gap-1" style={{ gridTemplateColumns: `minmax(100px,auto) repeat(${valueKeys.length},minmax(54px,1fr))` }}><span />{valueKeys.map((key) => <span key={key} className="p-1 text-center text-[10px] font-medium text-slate-500">{label(key)}</span>)}{data.map((row, index) => <React.Fragment key={index}><span className="truncate p-2 text-xs text-slate-600">{String(row[categoryKey] ?? '')}</span>{valueKeys.map((key) => { const value = numeric(row[key]); const opacity = .12 + .88 * Math.abs(value) / max; return <span title={`${label(key)}: ${format(value)}`} key={key} className="rounded p-2 text-center text-xs font-semibold" style={{ backgroundColor: `rgba(37,99,235,${opacity})`, color: opacity > .55 ? 'white' : '#1e3a8a' }}>{format(value)}</span>; })}</React.Fragment>)}</div></div>;
  }
  if (chartType === 'gauge') {
    const value = numeric(data[0]?.[valueKeys[0]]); const target = visualization.target || Math.max(value, 100); const percent = Math.min(100, value / target * 100);
    return <ResponsiveContainer width="100%" height={260}><RadialBarChart innerRadius="72%" outerRadius="100%" data={[{ name: label(valueKeys[0]), value: percent, fill: COLORS[0] }]} startAngle={210} endAngle={-30}><PolarAngleAxis type="number" domain={[0, 100]} tick={false} /><RadialBar dataKey="value" background cornerRadius={12} /><text x="50%" y="48%" textAnchor="middle" className="fill-slate-950 text-2xl font-bold">{format(value)}</text><text x="50%" y="59%" textAnchor="middle" className="fill-slate-500 text-xs">of {format(target)}</text></RadialBarChart></ResponsiveContainer>;
  }
  if (chartType === 'pie' || chartType === 'donut') return <ResponsiveContainer width="100%" height={300}><PieChart>{tooltip}<Legend wrapperStyle={{ fontSize: 11 }} /><Pie data={data} dataKey={valueKeys[0]} nameKey={categoryKey} cx="50%" cy="47%" innerRadius={chartType === 'donut' ? 65 : 0} outerRadius={100} paddingAngle={chartType === 'donut' ? 2 : 0} label={showDataLabels ? ({ percent }) => `${(Number(percent || 0) * 100).toFixed(0)}%` : false}>{data.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Pie></PieChart></ResponsiveContainer>;
  if (chartType === 'radar') return <ResponsiveContainer width="100%" height={300}><RadarChart data={data}><PolarGrid stroke="#e2e8f0" /><PolarAngleAxis dataKey={categoryKey} tick={AxisTick} /><PolarRadiusAxis tick={AxisTick} />{valueKeys.map((key, index) => <Radar key={key} name={label(key)} dataKey={key} stroke={COLORS[index]} fill={COLORS[index]} fillOpacity={.16} />)}{tooltip}{legend}</RadarChart></ResponsiveContainer>;
  if (chartType === 'treemap') return <ResponsiveContainer width="100%" height={300}><Treemap data={data.map((row) => ({ name: String(row[categoryKey]), size: numeric(row[valueKeys[0]]) }))} dataKey="size" nameKey="name" stroke="#fff" fill={COLORS[0]}>{tooltip}</Treemap></ResponsiveContainer>;
  if (chartType === 'funnel') return <ResponsiveContainer width="100%" height={300}><FunnelChart>{tooltip}<Funnel dataKey={valueKeys[0]} data={data} isAnimationActive><LabelList position="right" fill="#334155" stroke="none" dataKey={categoryKey} />{data.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Funnel></FunnelChart></ResponsiveContainer>;
  if (chartType === 'scatter' || chartType === 'bubble') return <ResponsiveContainer width="100%" height={300}><ScatterChart margin={{ top: 12, right: 18, bottom: 12, left: 4 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" dataKey={valueKeys[0]} name={label(valueKeys[0])} tick={AxisTick} /><YAxis type="number" dataKey={valueKeys[1] || valueKeys[0]} name={label(valueKeys[1] || valueKeys[0])} tick={AxisTick} /><Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value) => format(value)} /><Scatter name={visualization.title} data={data} fill={COLORS[0]}>{chartType === 'bubble' && data.map((row, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Scatter></ScatterChart></ResponsiveContainer>;
  if (chartType === 'line') return <ResponsiveContainer width="100%" height={300}><LineChart data={data} margin={{ top: 12, right: 18, bottom: 8, left: 4 }}>{commonAxes}{tooltip}{legend}{valueKeys.map((key, index) => <Line key={key} type="monotone" dataKey={key} name={label(key)} stroke={COLORS[index]} strokeWidth={2.5} dot={data.length < 16 ? { r: 3 } : false} />)}</LineChart></ResponsiveContainer>;
  if (chartType === 'area' || chartType === 'stacked_area') return <ResponsiveContainer width="100%" height={300}><AreaChart data={data} margin={{ top: 12, right: 18, bottom: 8, left: 4 }}>{commonAxes}{tooltip}{legend}{valueKeys.map((key, index) => <Area key={key} type="monotone" dataKey={key} name={label(key)} stackId={chartType === 'stacked_area' ? 'stack' : undefined} stroke={COLORS[index]} fill={COLORS[index]} fillOpacity={.18} />)}</AreaChart></ResponsiveContainer>;
  if (chartType === 'combo') return <ResponsiveContainer width="100%" height={300}><ComposedChart data={data} margin={{ top: 12, right: 18, bottom: 8, left: 4 }}>{commonAxes}{tooltip}{legend}{valueKeys.slice(0, -1).map((key, index) => <Bar key={key} dataKey={key} name={label(key)} fill={COLORS[index]} radius={[4,4,0,0]} />)}<Line dataKey={valueKeys[valueKeys.length - 1]} name={label(valueKeys[valueKeys.length - 1])} stroke={COLORS[4]} strokeWidth={2.5} /></ComposedChart></ResponsiveContainer>;

  const horizontal = chartType === 'bar' || chartType === 'stacked_bar';
  const stacked = chartType === 'stacked_bar' || chartType === 'stacked_column';
  return <ResponsiveContainer width="100%" height={Math.max(280, horizontal ? data.length * 34 : 280)}><BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 12, right: 18, bottom: 8, left: horizontal ? 20 : 4 }}><CartesianGrid strokeDasharray="3 3" horizontal={!horizontal} vertical={horizontal} stroke="#e2e8f0" />{horizontal ? <><XAxis type="number" tick={AxisTick} tickFormatter={(v) => format(v)} /><YAxis type="category" dataKey={categoryKey} tick={AxisTick} width={90} /></> : <><XAxis dataKey={categoryKey} tick={AxisTick} axisLine={false} tickLine={false} /><YAxis tick={AxisTick} tickFormatter={(v) => format(v)} width={58} /></>}{tooltip}{legend}{valueKeys.map((key, index) => <Bar key={key} dataKey={key} name={label(key)} stackId={stacked ? 'stack' : undefined} fill={chartType === 'waterfall' ? (index % 2 ? COLORS[3] : COLORS[0]) : COLORS[index]} radius={stacked ? undefined : horizontal ? [0,4,4,0] : [4,4,0,0]}>{showDataLabels && data.length <= 12 ? <LabelList dataKey={key} position={horizontal ? 'right' : 'top'} formatter={(v: unknown) => format(v)} style={{ fontSize: 10, fill: '#64748b' }} /> : null}</Bar>)}</BarChart></ResponsiveContainer>;
}

export const ChatVisualization: React.FC<{ visualization: VisualizationData }> = ({ visualization }) => {
  const [collapsed, setCollapsed] = useState(false); const [expanded, setExpanded] = useState(false); const containerRef = useRef<HTMLDivElement>(null);
  const title = visualization.title || ('chartType' in visualization ? label(visualization.chartType || 'Chart') : 'Visualization');
  const download = () => {
    const svg = containerRef.current?.querySelector('svg');
    let blob: Blob; let extension: string;
    if (svg) { const source = new XMLSerializer().serializeToString(svg); blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' }); extension = 'svg'; }
    else { const rows = visualization.type === 'native_chart' ? visualization.data : []; const columns = Array.from(new Set(rows.flatMap(Object.keys))); const csv = [columns.join(','), ...rows.map((row) => columns.map((key) => JSON.stringify(row[key] ?? '')).join(','))].join('\n'); blob = new Blob([csv], { type: 'text/csv' }); extension = 'csv'; }
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'visualization'}.${extension}`; anchor.click(); URL.revokeObjectURL(url);
  };
  const content = visualization.type === 'native_chart' ? <NativeChart visualization={visualization} /> : visualization.type === 'kpi_card' ? <div className="py-5"><p className="text-4xl font-bold tracking-tight text-slate-950">{visualization.value}</p>{visualization.subtitle && <p className="mt-2 text-sm text-slate-500">{visualization.subtitle}</p>}</div> : visualization.type === 'remote_chart' && visualization.assetUrl ? <img src={visualization.assetUrl} alt={title} className="w-full rounded-lg" /> : <p className={`rounded-lg p-4 text-sm ${visualization.type === 'visualization_error' ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-600'}`}>{visualization.message || 'This visualization is not available.'}</p>;
  const frame = <div ref={containerRef} className={`rounded-xl border border-slate-200 bg-white shadow-sm ${expanded ? 'flex h-full flex-col' : ''}`}><div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3"><div className="min-w-0"><h4 className="truncate text-sm font-semibold text-slate-950">{title}</h4>{'subtitle' in visualization && visualization.subtitle && <p className="mt-0.5 truncate text-xs text-slate-500">{visualization.subtitle}</p>}<p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-blue-600">{visualization.type === 'native_chart' ? label(visualization.chartType) : label(visualization.type)}</p></div><div className="flex shrink-0 items-center gap-1"><button onClick={() => setCollapsed((v) => !v)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" title={collapsed ? 'Restore chart' : 'Minimize chart'}>{collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}</button><button onClick={() => setExpanded((v) => !v)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" title={expanded ? 'Exit full screen' : 'Maximize chart'}>{expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button><button onClick={download} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" title="Download visualization"><Download size={16} /></button>{expanded && <button onClick={() => setExpanded(false)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" title="Close"><X size={16} /></button>}</div></div>{!collapsed && <div className={`p-4 ${expanded ? 'min-h-0 flex-1' : ''}`}>{content}</div>}</div>;
  return expanded ? <div className="fixed inset-0 z-[100] bg-slate-950/50 p-3 backdrop-blur-sm md:p-8"><div className="mx-auto h-full max-w-6xl">{frame}</div></div> : frame;
};
