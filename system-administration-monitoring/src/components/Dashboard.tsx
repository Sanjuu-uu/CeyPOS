import React, { useState } from 'react';
import Header from './common/Header';
import Sidebar from './common/Sidebar';
import SchemaVisualization from './schema/SchemaVisualization';
import QueryBuilder from './query/QueryBuilder';
import PerformanceMonitoring from './monitoring/PerformanceMonitoring';
import BackupRestore from './backup/BackupRestore';
import LogViewer from './logs/LogViewer';
type TabType = 'schema' | 'query' | 'monitoring' | 'backup' | 'logs';
const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('schema');
  const renderContent = () => {
    switch (activeTab) {
      case 'schema':
        return <SchemaVisualization />;
      case 'query':
        return <QueryBuilder />;
      case 'monitoring':
        return <PerformanceMonitoring />;
      case 'backup':
        return <BackupRestore />;
      case 'logs':
        return <LogViewer />;
      default:
        return <SchemaVisualization />;
    }
  };
  return <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4">{renderContent()}</main>
      </div>
    </div>;
};
export default Dashboard;