import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface VisualizationData {
  type: 'kpi_card' | 'bar_chart' | 'line_chart' | 'pie_chart';
  title: string;
  value?: string;
  subtitle?: string;
  data?: Array<{ name: string; value: number }>;
  xAxisKey?: string;
  yAxisKey?: string;
}

interface ChatVisualizationProps {
  visualization: VisualizationData;
}

const COLORS = ['#c5f542', '#b39efc', '#ef94b5', '#7cb518', '#8e6ddf', '#d16ba5'];

export const ChatVisualization: React.FC<ChatVisualizationProps> = ({ visualization }) => {
  const renderKpiCard = () => (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <h4 className="text-sm font-semibold text-gray-800 mb-1">{visualization.title}</h4>
      <div className="text-2xl font-bold" style={{ color: '#c5f542' }}>{visualization.value}</div>
      {visualization.subtitle && (
        <p className="text-xs text-gray-500 mt-1">{visualization.subtitle}</p>
      )}
    </div>
  );

  const renderBarChart = () => (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <h4 className="text-sm font-semibold text-gray-800 mb-3">{visualization.title}</h4>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={visualization.data}
            margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
          >
            <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
            <XAxis
              dataKey={visualization.xAxisKey || 'name'}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#666', fontSize: 10 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#666', fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 6,
                background: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                fontSize: '12px'
              }}
            />
            <Bar
              dataKey={visualization.yAxisKey || 'value'}
              fill="#c5f542"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderLineChart = () => (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <h4 className="text-sm font-semibold text-gray-800 mb-3">{visualization.title}</h4>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={visualization.data}
            margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
          >
            <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#666', fontSize: 10 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#666', fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 6,
                background: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                fontSize: '12px'
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#b39efc"
              strokeWidth={2}
              dot={{ fill: '#b39efc', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderPieChart = () => (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <h4 className="text-sm font-semibold text-gray-800 mb-3">{visualization.title}</h4>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={visualization.data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={60}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {visualization.data?.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 6,
                background: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                fontSize: '12px'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  switch (visualization.type) {
    case 'kpi_card':
      return renderKpiCard();
    case 'bar_chart':
      return renderBarChart();
    case 'line_chart':
      return renderLineChart();
    case 'pie_chart':
      return renderPieChart();
    default:
      return <div className="text-red-500 text-sm">Unsupported visualization type</div>;
  }
};