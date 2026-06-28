// src/components/layout/MainLayout.tsx
import React from 'react';
import { Sidebar } from '../layout/SideBar';
import { TopBar } from '../layout/TopBar';
import { useApp } from '../../context/AppContext';
import { ModuleRouter } from '../modules/ModuleRouter';
import { PairingModal } from '../modules/team/PairingModal';

export const MainLayout: React.FC = () => {
  const { isSidebarCollapsed } = useApp();

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Sidebar Drawer (sliding on mobile, docked on desktop) */}
      <Sidebar />

      {/* Main Content */}
      <div
        className={`
          flex-1 flex flex-col overflow-hidden transition-all duration-300
          /* No left margin on mobile so the drawer can slide over */
          ml-0
          /* On desktop, push right by 64px if collapsed, 240px if expanded */
          md:${isSidebarCollapsed ? 'ml-16' : 'ml-60'}
        `}
      >
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <ModuleRouter />
        </main>
        <PairingModal />
      </div>
    </div>
  );
};
