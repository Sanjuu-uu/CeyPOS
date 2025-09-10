// src/components/TopBar.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Search,
  User,
  Menu as MenuIcon,
  X as CloseIcon,
  LogOut,
  Settings,
  UserCircle,
  ChevronDown,
} from 'lucide-react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useApp } from '../../context/AppContext';

export const TopBar: React.FC = () => {
  const { currentModule, isMobileMenuOpen, setIsMobileMenuOpen } = useApp();
  const { user, isLoaded } = useUser();
  const { signOut, openUserProfile } = useClerk();
  
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Capitalize first letter of module name
  const formatModuleName = (name: string) =>
    name.charAt(0).toUpperCase() + name.slice(1);

  const handleSignOut = () => {
    signOut();
    setIsProfileDropdownOpen(false);
  };

  const handleOpenProfile = () => {
    openUserProfile();
    setIsProfileDropdownOpen(false);
  };

  // Get user display name
  const getDisplayName = () => {
    if (!user) return 'Guest';
    return user.fullName || user.firstName || user.emailAddresses[0]?.emailAddress || 'User';
  };

  // Get user role/email for subtitle
  const getUserSubtitle = () => {
    if (!user) return 'Visitor';
    return user.primaryEmailAddress?.emailAddress || 'User';
  };

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

        {/* Profile Avatar + Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            className="flex items-center space-x-2 md:space-x-3 p-1 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {/* Avatar */}
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 overflow-hidden">
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={getDisplayName()}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User size={16} />
              )}
            </div>

            {/* Name & email only on md+ */}
            <div className="hidden md:flex flex-col leading-tight overflow-hidden">
              <p className="font-medium text-gray-800 text-sm md:text-base truncate">
                {isLoaded ? getDisplayName() : 'Loading...'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {isLoaded ? getUserSubtitle() : '...'}
              </p>
            </div>

            {/* Dropdown chevron (hidden on mobile) */}
            <ChevronDown 
              size={16} 
              className={`hidden md:block text-gray-400 transition-transform ${
                isProfileDropdownOpen ? 'rotate-180' : ''
              }`} 
            />
          </button>

          {/* Profile Dropdown Menu */}
          {isProfileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              {/* User Info Header */}
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="font-medium text-gray-900 truncate">
                  {getDisplayName()}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {getUserSubtitle()}
                </p>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                <button
                  onClick={handleOpenProfile}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                >
                  <UserCircle size={16} className="mr-3" />
                  View Profile
                </button>
                
                <button
                  onClick={() => setIsProfileDropdownOpen(false)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                >
                  <Settings size={16} className="mr-3" />
                  Settings
                </button>
                
                <div className="border-t border-gray-100 my-1"></div>
                
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                >
                  <LogOut size={16} className="mr-3" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};