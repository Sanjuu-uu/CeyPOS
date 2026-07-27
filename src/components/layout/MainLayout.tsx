// src/components/layout/MainLayout.tsx
import React from 'react';
import { Sidebar } from '../layout/SideBar';
import { TopBar } from '../layout/TopBar';
import { ModuleRouter } from '../modules/ModuleRouter';
import { PairingModal } from '../modules/team/PairingModal';
import shellBackground from '../../assets/images.jpg';

export const MainLayout: React.FC = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f7f5]">
      {/* Sidebar Drawer (sliding on mobile, docked on desktop) */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar />
        <main
          className="flex-1 overflow-y-auto bg-[#f9fafb] bg-top bg-no-repeat p-4 md:p-6"
          style={{
            backgroundImage: `url("${shellBackground}")`,
            backgroundPosition: 'top center',
            backgroundSize: '100% auto',
          }}
        >
          <ModuleRouter />
        </main>
        <PairingModal />
      </div>
    </div>
  );
};
