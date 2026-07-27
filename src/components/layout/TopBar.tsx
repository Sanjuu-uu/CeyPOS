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
  CheckCheck,
  Inbox,
} from 'lucide-react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useApp } from '../../context/AppContext';
import { db, type AppNotification } from '../../lib/db';
import { searchNavigation, setSearchHash, type NavigationSearchItem } from '../../lib/navigationSearch';
import type { ModuleName } from '../../types';

const moduleSubheadings: Record<ModuleName, string> = {
  pos: 'Process sales and manage customer orders',
  inventory: 'Manage products, stock and catalog data',
  analytics: 'Track revenue, orders and customer activity',
  Subscription: 'Manage subscription billing and plan preferences',
  receipts: 'Review and manage customer receipts',
  payments: 'Manage payments and transaction preferences',
  reports: 'Review business insights and performance trends',
  settings: 'Customize workspace and account preferences',
  support: 'Find answers and manage support requests',
  import: 'Create and manage promotional campaigns',
  sessions: 'Connect and manage different devices with your CeyPoS shop',
  business: 'Manage loyalty rules and reward settings',
  components: 'Browse reusable interface components',
};

export const TopBar: React.FC = () => {
  const { currentModule, setCurrentModule, isMobileMenuOpen, setIsMobileMenuOpen, activeShopId, currentUser } = useApp();
  const { user, isLoaded } = useUser();
  const { signOut, openUserProfile } = useClerk();
  
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const searchResults = searchNavigation(searchQuery, 9);

  const loadNotifications = React.useCallback(async () => {
    if (!activeShopId || !currentUser?.email) return;
    setNotificationsLoading(true);
    try {
      const result = await db.notifications.list(activeShopId, currentUser.email);
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
    } catch (error) {
      console.warn('Failed to load notifications', error);
    } finally {
      setNotificationsLoading(false);
    }
  }, [activeShopId, currentUser?.email]);

  useEffect(() => {
    void loadNotifications();
    return db.on('notificationsUpdated', () => void loadNotifications());
  }, [loadNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openNotification = async (item: AppNotification) => {
    if (!activeShopId || !currentUser?.email) return;
    if (!item.readAt) {
      setNotifications((items) => items.map((entry) => entry.notificationId === item.notificationId ? { ...entry, readAt: new Date().toISOString() } : entry));
      setUnreadCount((count) => Math.max(0, count - 1));
      await db.notifications.markRead(activeShopId, currentUser.email, item.notificationId).catch(() => void loadNotifications());
    }
    const moduleName = item.linkPath?.replace(/^\//, '');
    if (moduleName) setCurrentModule(moduleName as Parameters<typeof setCurrentModule>[0]);
    setIsNotificationsOpen(false);
  };

  const markAllRead = async () => {
    if (!activeShopId || !currentUser?.email || !unreadCount) return;
    const readAt = new Date().toISOString();
    setNotifications((items) => items.map((item) => ({ ...item, readAt: item.readAt || readAt })));
    setUnreadCount(0);
    await db.notifications.markAllRead(activeShopId, currentUser.email).catch(() => void loadNotifications());
  };

  // Capitalize first letter of module name
  const formatModuleName = (name: string) =>
    name === 'business'
      ? 'Loyalty'
      : name === 'import'
        ? 'Flash Promo'
        : name.charAt(0).toUpperCase() + name.slice(1);

  const handleSignOut = () => {
    signOut();
    setIsProfileDropdownOpen(false);
  };

  const handleOpenProfile = () => {
    openUserProfile();
    setIsProfileDropdownOpen(false);
  };

  const openSearchItem = (item: NavigationSearchItem) => {
    setCurrentModule(item.module);
    setSearchHash(item.hash);
    setSearchQuery('');
    setIsSearchOpen(false);
    setIsMobileMenuOpen(false);
  };

  const openMobileSearch = () => {
    setIsSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 0);
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
    <header className="min-h-20 bg-white border-b border-gray-200 flex items-center justify-between px-4 py-3 md:px-6">
      {/* ─── Hamburger Menu Button (mobile only) ─── */}
      <button
        className="block md:hidden p-2 rounded-md hover:bg-gray-100 text-gray-500"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
      </button>

      {/* ─── Page Title ─── */}
      <div className="ml-2 min-w-0 flex-1 md:ml-0">
        <h1 className="truncate text-xl font-semibold leading-tight tracking-[-0.03em] text-gray-900 md:text-2xl">
          {formatModuleName(currentModule)}
        </h1>
        <p className="topbar-subheading">
          {moduleSubheadings[currentModule]}
        </p>
      </div>

      {/* ─── Right Section: Search / Notifications / Profile ─── */}
      <div className="flex items-center space-x-2 md:space-x-4">
        {/* Mobile: Search-icon button */}
        <button className="md:hidden p-2 rounded-md hover:bg-gray-100 text-gray-500" onClick={openMobileSearch}>
          <Search size={20} />
        </button>

        {/* Desktop (md+): Full search input */}
        <div className="relative hidden md:block" ref={searchRef}>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
            <Search size={16} />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && searchResults[0]) {
                event.preventDefault();
                openSearchItem(searchResults[0]);
              }
              if (event.key === 'Escape') {
                setIsSearchOpen(false);
                searchInputRef.current?.blur();
              }
            }}
            placeholder="Search pages or settings..."
            className="
              w-56 lg:w-72
              bg-gray-50 border border-gray-300 rounded-lg
              pl-10 pr-4 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-[#ECFF76]/30 focus:border-[#ECFF76]
            "
          />
          {isSearchOpen && (
            <div className="topbar-panel w-[min(24rem,calc(100vw-2rem))]">
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">Search CeyPOS</p>
              </div>
              <div className="max-h-[28rem] overflow-y-auto p-2">
                {searchResults.length ? (
                  searchResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openSearchItem(item)}
                      className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-gray-50"
                    >
                      <span className="mt-0.5 rounded-md bg-gray-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-gray-500">
                        {item.kind}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-gray-900">{item.title}</span>
                        <span className="mt-0.5 block line-clamp-2 text-xs text-gray-500">{item.description}</span>
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-6 text-center text-sm text-gray-500">No matching pages or settings</p>
                )}
              </div>
            </div>
          )}
        </div>

        {isSearchOpen && (
          <div className="fixed inset-x-3 top-3 z-[70] md:hidden" ref={searchRef}>
            <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-xl">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && searchResults[0]) {
                      event.preventDefault();
                      openSearchItem(searchResults[0]);
                    }
                    if (event.key === 'Escape') setIsSearchOpen(false);
                  }}
                  placeholder="Search pages or settings..."
                  className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-10 text-sm outline-none focus:border-[#ECFF76]"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:bg-gray-100"
                  onClick={() => setIsSearchOpen(false)}
                >
                  <CloseIcon size={16} />
                </button>
              </div>
              <div className="mt-2 max-h-[70vh] overflow-y-auto">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openSearchItem(item)}
                    className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-gray-50"
                  >
                    <span className="block text-sm font-semibold text-gray-900">{item.title}</span>
                    <span className="mt-0.5 block text-xs text-gray-500">{item.kind} - {item.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Notifications Icon */}
        <div className="relative" ref={notificationRef}>
          <button aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} onClick={() => { setIsNotificationsOpen((open) => !open); setIsProfileDropdownOpen(false); }} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 relative">
            <Bell size={20} />
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>
          {isNotificationsOpen && (
            <div className="topbar-panel w-[min(24rem,calc(100vw-2rem))]">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div><p className="font-semibold text-gray-900">Notifications</p><p className="text-xs text-gray-500">{unreadCount ? `${unreadCount} unread` : 'You are all caught up'}</p></div>
                {unreadCount > 0 && <button onClick={markAllRead} className="text-xs font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1"><CheckCheck size={15} /> Mark all read</button>}
              </div>
              <div className="max-h-[28rem] overflow-y-auto">
                {notificationsLoading && !notifications.length ? <p className="p-6 text-sm text-center text-gray-500">Loading notifications…</p> : notifications.length === 0 ? <div className="p-8 text-center text-gray-500"><Inbox size={28} className="mx-auto mb-2 text-gray-300" /><p className="text-sm">No notifications yet</p></div> : notifications.map((item) => (
                  <button key={item.notificationId} onClick={() => void openNotification(item)} className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 ${item.readAt ? 'bg-white' : 'bg-lime-50/60'}`}>
                    <div className="flex gap-3"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.severity === 'critical' ? 'bg-red-500' : item.severity === 'warning' ? 'bg-amber-500' : item.severity === 'success' ? 'bg-green-500' : 'bg-blue-500'}`} /><div className="min-w-0"><div className="flex items-start justify-between gap-2"><p className={`text-sm text-gray-900 ${item.readAt ? 'font-medium' : 'font-semibold'}`}>{item.title}</p><span className="text-[10px] uppercase tracking-wide text-gray-400">{item.category}</span></div><p className="mt-1 text-sm text-gray-600 line-clamp-2">{item.body}</p><p className="mt-1 text-xs text-gray-400">{new Date(item.createdAt).toLocaleString()}</p></div></div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

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
            <div className="topbar-panel w-[min(18rem,calc(100vw-2rem))]">
              {/* User Info Header */}
              <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-gray-700">
                  {user?.imageUrl ? (
                    <img src={user.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User size={17} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {getDisplayName()}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {getUserSubtitle()}
                  </p>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-2">
                <button
                  onClick={handleOpenProfile}
                  className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <UserCircle size={16} className="mr-3" />
                  View Profile
                </button>
                
                <button
                  onClick={() => {
                    setCurrentModule('settings');
                    setIsProfileDropdownOpen(false);
                  }}
                  className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <Settings size={16} className="mr-3" />
                  Settings
                </button>
                
                <div className="my-2 border-t border-gray-100"></div>
                
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
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
