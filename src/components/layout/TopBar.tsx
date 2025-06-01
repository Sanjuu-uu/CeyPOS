// src/components/TopBar.tsx
import React from 'react';
import {
  Bell,
  Search,
  User,
  Menu as MenuIcon,
  X as CloseIcon,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const TopBar: React.FC = () => {
  const {
    currentModule,
    currentUser,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
  } = useApp();

  // Capitalize first letter of module name
  const formatModuleName = (name: string) =>
    name.charAt(0).toUpperCase() + name.slice(1);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6">
      {/* ─── Hamburger Menu Button (mobile only) ─── */}
      <button
        className="block md:hidden p-2 rounded-md hover:bg-gray-100 text-gray-500"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
      </button>

      {/* ─── Page Title ─── */}
      <div className="flex-shrink-0 ml-2 md:ml-0">
        <h1 className="text-lg md:text-xl font-semibold text-gray-800 truncate">
          {formatModuleName(currentModule)}
        </h1>
      </div>

      {/* ─── Right Section: Search / Notifications / Profile ─── */}
      <div className="flex items-center space-x-2 md:space-x-4">
        {/* Mobile: Search-icon button */}
        <button className="md:hidden p-2 rounded-md hover:bg-gray-100 text-gray-500">
          <Search size={20} />
        </button>

        {/* Desktop (md+): Full search input */}
        <div className="relative hidden md:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search..."
            className="
              w-48 lg:w-64
              bg-gray-50 border border-gray-300 rounded-lg
              pl-10 pr-4 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-[#ECFF76]/30 focus:border-[#ECFF76]
            "
          />
        </div>

        {/* Notifications Icon */}
        <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 relative">
          <Bell size={20} />
          <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500" />
        </button>

        {/* Profile Avatar + (Name/Role hidden on mobile) */}
        <div className="flex items-center space-x-2 md:space-x-3">
          {/* Always show avatar */}
          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 overflow-hidden">
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <User size={16} />
            )}
          </div>

          {/* Name & role only on md+ */}
          <div className="hidden md:flex flex-col leading-tight overflow-hidden">
            <p className="font-medium text-gray-800 text-sm md:text-base truncate">
              {currentUser?.name || 'Guest'}
            </p>
            <p className="text-xs text-gray-500 capitalize truncate">
              {currentUser?.role || 'Visitor'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
