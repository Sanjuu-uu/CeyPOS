import React from "react";
import {
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
    <button
      type="button"
      title={isCollapsed ? label : undefined}
      className={`group flex w-full items-center rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors duration-150 ${
        isActive
          ? "bg-[#c5f542] text-gray-900"
          : "text-[#686868] hover:bg-gray-100 hover:text-gray-950"
      }`}
      onClick={onClick}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
      {!isCollapsed && <span className="ml-3 truncate font-medium">{label}</span>}
    </button>
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
      icon: <ShoppingCart size={20} />,
      label: "POS",
      module: "pos" as ModuleName,
    },
    {
      icon: <BarChart3 size={20} />,
      label: "Analytics",
      module: "analytics" as ModuleName,
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
      icon: <Briefcase size={20} />,
      label: "Loyalty",
      module: "business" as ModuleName,
    },
    {
      icon: <Upload size={20} />,
      label: "Flash Promo",
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
      {/* === 1) Mobile back-drop === */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* === 2) Sidebar container === */}
      <div
        className={`
          fixed top-0 left-0 z-50 flex h-full flex-col bg-white border-r border-[#e8e8e5]
          w-60 transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
          md:relative
          md:translate-x-0  
          ${effectiveCollapsed ? "md:w-16" : "md:w-60"}
        `}
      >
        {/* Sidebar Header */}
        <div className={`flex h-20 shrink-0 items-center border-b border-[#eeeeeb] ${effectiveCollapsed ? "justify-center px-2" : "justify-between px-4"}`}>
          {!effectiveCollapsed && (
            <div className="flex items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ecff76]">
                <span className="text-[11px] font-bold tracking-tight text-gray-950">POS</span>
              </div>
              <div className="ml-2.5 leading-tight">
                <p className="text-sm font-semibold tracking-[-0.01em] text-gray-950">CeyPOS</p>
                <p className="text-[10px] text-gray-400">Point of sale</p>
              </div>
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
            aria-label={effectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            {effectiveCollapsed ? (
              <PanelLeftOpen size={20} />
            ) : (
              <PanelLeftClose size={20} />
            )}
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 space-y-1 overflow-y-auto p-3">
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
