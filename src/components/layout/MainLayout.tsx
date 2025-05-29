import React from 'react';
import { Sidebar } from './SideBar';
import { TopBar } from './TopBar';
import { useApp } from '../../context/AppContext';
import { ModuleRouter } from '../modules/ModuleRouter';

export const MainLayout: React.FC = () => {
  const { isSidebarCollapsed } = useApp();
  
  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        isSidebarCollapsed ? 'ml-16' : 'ml-60'
      }`}>
        {/* Top Bar */}
        <TopBar />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <ModuleRouter />
        </main>
      </div>
    </div>
  );
};