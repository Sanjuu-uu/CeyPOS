import React from 'react';
import { Bell, Search, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const TopBar: React.FC = () => {
  const { currentModule, currentUser } = useApp();
  
  // Format module name for display
  const formatModuleName = (name: string) => {
    return name.charAt(0).toUpperCase() + name.slice(1);
  };
  
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Left: Page Title */}
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          {formatModuleName(currentModule)}
        </h1>
      </div>
      
      {/* Right: Search, Notifications, and Profile */}
      <div className="flex items-center space-x-4">
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search..."
            className="w-64 bg-gray-50 border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ECFF76]/30 focus:border-[#ECFF76]"
          />
        </div>
        
        {/* Notifications */}
        <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 relative">
          <Bell size={20} />
          <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
        </button>
        
        {/* Profile */}
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 mr-2">
            {currentUser?.avatarUrl ? (
              <img 
                src={currentUser.avatarUrl} 
                alt={currentUser.name} 
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <User size={16} />
            )}
          </div>
          <div className="text-sm">
            <p className="font-medium text-gray-800">{currentUser?.name || 'Guest'}</p>
            <p className="text-xs text-gray-500 capitalize">{currentUser?.role || 'Visitor'}</p>
          </div>
        </div>
      </div>
    </header>
  );
};