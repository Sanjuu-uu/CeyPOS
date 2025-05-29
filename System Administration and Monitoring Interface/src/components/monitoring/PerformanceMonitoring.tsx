import React, { memo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ServerIcon, ClockIcon, CpuIcon } from 'lucide-react';
const performanceData = [{
  time: '12:00',
  cpu: 45,
  memory: 60,
  queries: 12,
  latency: 150
}, {
  time: '12:05',
  cpu: 52,
  memory: 63,
  queries: 18,
  latency: 140
}, {
  time: '12:10',
  cpu: 48,
  memory: 65,
  queries: 22,
  latency: 160
}, {
  time: '12:15',
  cpu: 70,
  memory: 72,
  queries: 29,
  latency: 200
}, {
  time: '12:20',
  cpu: 65,
  memory: 75,
  queries: 25,
  latency: 180
}, {
  time: '12:25',
  cpu: 60,
  memory: 70,
  queries: 20,
  latency: 170
}, {
  time: '12:30',
  cpu: 55,
  memory: 68,
  queries: 15,
  latency: 150
}, {
  time: '12:35',
  cpu: 50,
  memory: 65,
  queries: 18,
  latency: 140
}];
const connectionStatus = [{
  name: 'Primary DB',
  status: 'Connected',
  uptime: '5d 12h 36m',
  load: 'Normal'
}, {
  name: 'Replica DB',
  status: 'Connected',
  uptime: '3d 8h 12m',
  load: 'Low'
}, {
  name: 'Analytics DB',
  status: 'Connected',
  uptime: '7d 3h 45m',
  load: 'High'
}];
const PerformanceMonitoring: React.FC = () => {
  return <div className="h-full">
      <div className="bg-white dark:bg-gray-800 p-4 mb-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-2">Performance Monitoring</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Real-time database performance metrics and connection status.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {connectionStatus.map(conn => <div key={conn.name} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <ServerIcon className="mr-2 text-blue-500" size={20} />
                <h3 className="font-medium">{conn.name}</h3>
              </div>
              <div className="flex items-center bg-green-100 dark:bg-green-900 px-2 py-1 rounded-full">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                <span className="text-sm text-green-800 dark:text-green-300">
                  {conn.status}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">
                  Uptime:
                </span>
                <span className="ml-2">{conn.uptime}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Load:</span>
                <span className="ml-2">{conn.load}</span>
              </div>
            </div>
          </div>)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center mb-4">
            <CpuIcon className="mr-2 text-blue-500" size={20} />
            <h3 className="font-medium">Resource Usage</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="cpu" stroke="#3b82f6" name="CPU (%)" />
                <Line type="monotone" dataKey="memory" stroke="#10b981" name="Memory (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center mb-4">
            <ClockIcon className="mr-2 text-blue-500" size={20} />
            <h3 className="font-medium">Query Performance</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                <YAxis yAxisId="right" orientation="right" stroke="#ef4444" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="queries" fill="#3b82f6" name="Queries" />
                <Bar yAxisId="right" dataKey="latency" fill="#ef4444" name="Latency (ms)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="font-medium mb-4">Active Queries</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Query ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Statement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm">Q-10293</td>
                <td className="px-6 py-4 text-sm font-mono">
                  SELECT * FROM orders WHERE date &gt; '2023-01-01'
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">2.3s</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 rounded-full">
                    Running
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm">Q-10292</td>
                <td className="px-6 py-4 text-sm font-mono">
                  UPDATE products SET stock = stock - 1 WHERE id = 245
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">0.8s</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                    Completed
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm">Q-10291</td>
                <td className="px-6 py-4 text-sm font-mono">
                  INSERT INTO order_items (order_id, product_id, quantity)
                  VALUES (512, 24, 2)
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">0.5s</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                    Completed
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>;
};
export default PerformanceMonitoring;