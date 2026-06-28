import React from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Wifi,
  Wallet,
  Receipt,
  CreditCard,
  BarChart3,
  Upload,
  FileText,
  LifeBuoy,
  Settings,
  Briefcase, // Added icon
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { ModuleName } from "../../types";

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
  onClick,
}) => {
  return (
    <div
      className={`flex items-center px-3 py-2 cursor-pointer rounded-lg transition-colors duration-200 ${
        isActive
          ? "bg-[#ecff76] text-gray-900"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
      }`}
      onClick={onClick}
    >
      <div className={`${isActive ? "text-gray-900" : ""}`}>{icon}</div>
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
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    canAccessModule,
  } = useApp();

  const effectiveCollapsed = isMobileMenuOpen ? false : isSidebarCollapsed;

  const menuItems = [
    {
      icon: <LayoutDashboard size={20} />,
      label: "Dashboard",
      module: "dashboard" as ModuleName,
    },
    {
      icon: <ShoppingCart size={20} />,
      label: "POS",
      module: "pos" as ModuleName,
    },
    {
      icon: <Package size={20} />,
      label: "Inventory",
      module: "inventory" as ModuleName,
    },
    {
      icon: <Wifi size={20} />,
      label: "Sessions",
      module: "sessions" as ModuleName,
    },
    {
      icon: <Briefcase size={20} />, // New Icon
      label: "Business",             // New Label
      module: "business" as ModuleName,
    },
    {
      icon: <Wallet size={20} />,
      label: "Payments",
      module: "payments" as ModuleName,
    },
    {
      icon: <Receipt size={20} />,
      label: "Receipts",
      module: "receipts" as ModuleName,
    },
    {
      icon: <BarChart3 size={20} />,
      label: "Analytics",
      module: "analytics" as ModuleName,
    },
    {
      icon: <Upload size={20} />,
      label: "Flash-Promo",
      module: "import" as ModuleName,
    },
    {
      icon: <FileText size={20} />,
      label: "Reports",
      module: "reports" as ModuleName,
    },
    {
      icon: <CreditCard size={20} />,
      label: "Subscription",
      module: "Subscription" as ModuleName,
    },
    {
      icon: <LifeBuoy size={20} />,
      label: "Support",
      module: "support" as ModuleName,
    },
    {
      icon: <Settings size={20} />,
      label: "Settings",
      module: "settings" as ModuleName,
    },
  ];

  return (
    <>
      {/* === 1) Mobile back‐drop === */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* === 2) Sidebar container === */}
      <div
        className={`
          fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50
          w-60 transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
          md:relative
          md:translate-x-0  
          ${effectiveCollapsed ? "md:w-16" : "md:w-60"}
        `}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          {!effectiveCollapsed && (
            <div className="flex items-center">
              <div className="bg-[#ecff76] h-8 w-8 rounded-md flex items-center justify-center">
                <span className="font-bold text-gray-900">POS</span>
              </div>
              <span className="ml-2 font-semibold text-gray-900">CeyPOS</span>
            </div>
          )}
          <button
            onClick={() => {
              if (isMobileMenuOpen) {
                setIsMobileMenuOpen(false);
              } else {
                setIsSidebarCollapsed(!isSidebarCollapsed);
              }
            }}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
          >
            {effectiveCollapsed ? (
              <PanelLeftOpen size={20} />
            ) : (
              <PanelLeftClose size={20} />
            )}
          </button>
        </div>

        {/* Menu Items */}
        <div className="p-3 space-y-1 overflow-y-auto flex-1">
          {menuItems
            .filter((item) => canAccessModule(item.module))
            .map((item) => (
            <SidebarItem
              key={item.module}
              icon={item.icon}
              label={item.label}
              module={item.module}
              isCollapsed={effectiveCollapsed}
              isActive={currentModule === item.module}
              onClick={() => {
                setCurrentModule(item.module);
                if (isMobileMenuOpen) setIsMobileMenuOpen(false);
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
};