import React from 'react';
import { DatabaseIcon, CodeIcon, BarChart2Icon, SaveIcon, FileTextIcon } from 'lucide-react';
type TabType = 'schema' | 'query' | 'monitoring' | 'backup' | 'logs';
interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}
const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab
}) => {
  const navItems = [{
    id: 'schema',
    label: 'Schema',
    icon: <DatabaseIcon size={20} />
  }, {
    id: 'query',
    label: 'Query Builder',
    icon: <CodeIcon size={20} />
  }, {
    id: 'monitoring',
    label: 'Monitoring',
    icon: <BarChart2Icon size={20} />
  }, {
    id: 'backup',
    label: 'Backup & Restore',
    icon: <SaveIcon size={20} />
  }, {
    id: 'logs',
    label: 'Logs',
    icon: <FileTextIcon size={20} />
  }];
  return <aside className="w-64 bg-gray-800 dark:bg-gray-950 text-white">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold">Database Admin</h2>
      </div>
      <nav className="mt-6">
        <ul>
          {navItems.map(item => <li key={item.id}>
              <button onClick={() => setActiveTab(item.id as TabType)} className={`w-full flex items-center px-6 py-3 text-left ${activeTab === item.id ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                <span className="mr-3">{item.icon}</span>
                {item.label}
              </button>
            </li>)}
        </ul>
      </nav>
    </aside>;
};
export default Sidebar;