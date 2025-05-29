import React from 'react';
import { useApp } from '../../context/AppContext';
import { LayoutDashboard, ShoppingCart, Package, BarChart3, CreditCard, Receipt, Wallet, FileText, Settings, LifeBuoy, Upload, PanelLeftClose, PanelLeftOpen, Wifi } from 'lucide-react';
import { ModuleName } from '../../types';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  module: ModuleName;
  isCollapsed: boolean;
  isActive: boolean;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  icon,
  label,
  isCollapsed,
  isActive,
  onClick
}) => {
  return (
    <div
      className={`flex items-center px-3 py-2 cursor-pointer rounded-lg transition-all duration-200 ${
        isActive 
          ? 'bg-[#c5f542] text-gray-900' 
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
      }`}
      onClick={onClick}
    >
      <div className={`${isActive ? 'text-gray-900' : ''}`}>
        {icon}
      </div>
      {!isCollapsed && <span className="ml-3 font-medium">{label}</span>}
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const { 
    currentModule, 
    setCurrentModule, 
    isSidebarCollapsed, 
    setIsSidebarCollapsed,
    currentShop
  } = useApp();
  
  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  
  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', module: 'dashboard' as ModuleName },
    { icon: <ShoppingCart size={20} />, label: 'POS', module: 'pos' as ModuleName },
    { icon: <Package size={20} />, label: 'Inventory', module: 'inventory' as ModuleName },
    { icon: <Wifi size={20} />, label: 'Sessions', module: 'sessions' as ModuleName },
    { icon: <Wallet size={20} />, label: 'Payments', module: 'payments' as ModuleName },
    { icon: <Receipt size={20} />, label: 'Receipts', module: 'receipts' as ModuleName },
    { icon: <CreditCard size={20} />, label: 'Checkout', module: 'checkout' as ModuleName },
    { icon: <BarChart3 size={20} />, label: 'Analytics', module: 'analytics' as ModuleName },
    { icon: <Upload size={20} />, label: 'Database', module: 'import' as ModuleName },
    { icon: <FileText size={20} />, label: 'Reports', module: 'reports' as ModuleName },
    { icon: <LifeBuoy size={20} />, label: 'Support', module: 'support' as ModuleName },
    { icon: <Settings size={20} />, label: 'Settings', module: 'settings' as ModuleName },
 
  ];
  
  return (
    <div
      className={`fixed inset-y-0 left-0 bg-white border-r border-gray-200 z-30 transition-all duration-300 ${
        isSidebarCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Sidebar Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
        {!isSidebarCollapsed && (
          <div className="flex items-center">
            <div className="bg-[#ECFF76] h-8 w-8 rounded-md flex items-center justify-center">
              <span className="font-bold text-gray-900">POS</span>
            </div>
            <span className="ml-2 font-semibold text-gray-900">
            CeyPOS
            </span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
        >
          {isSidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>
      
      {/* Navigation Menu */}
      <div className="p-3 space-y-1">
        {menuItems.map((item) => (
          <SidebarItem
            key={item.module}
            icon={item.icon}
            label={item.label}
            module={item.module}
            isCollapsed={isSidebarCollapsed}
            isActive={currentModule === item.module}
            onClick={() => setCurrentModule(item.module)}
          />
        ))}
      </div>
    </div>
  );
};