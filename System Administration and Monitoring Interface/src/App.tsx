import React, { useState } from 'react';
import { Toaster } from 'sonner';
import { ThemeProvider } from './context/ThemeContext';
import Dashboard from './components/Dashboard';
export function App() {
  return <ThemeProvider>
      <div className="w-full min-h-screen">
        <Dashboard />
        <Toaster position="top-right" />
      </div>
    </ThemeProvider>;
}