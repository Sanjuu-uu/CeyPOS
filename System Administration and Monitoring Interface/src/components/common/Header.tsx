import React from 'react';
import { DatabaseIcon, AlertCircleIcon } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
const Header: React.FC = () => {
  return <header className="bg-white dark:bg-gray-800 shadow-sm px-6 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <DatabaseIcon className="text-blue-600 dark:text-blue-400" />
        <h1 className="text-xl font-semibold">EmpowerPOS Admin</h1>
        <div className="flex items-center bg-green-100 dark:bg-green-900 px-3 py-1 rounded-full text-sm">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
          <span className="text-green-800 dark:text-green-300">Connected</span>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
          <AlertCircleIcon size={16} />
          <span>System healthy</span>
        </div>
        <ThemeToggle />
      </div>
    </header>;
};
export default Header;