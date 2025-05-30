import React, { useEffect, useState } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { AppProvider } from './context/AppContext';
import { ShopWizardProvider, useShopWizard } from './context/ShopWizardContext';
import { ShopWizard } from './components/modules/ShopWizard';

function App() {
  // Set page title
  useEffect(() => {
    document.title = 'CeyPOS - Point of Sale System';
    
    // Find and update the favicon
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (favicon) {
      favicon.href = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🏪</text></svg>';
    }
  }, []);

  return (
    <AppProvider>
      <ShopWizardProvider>
        <AppContent />
      </ShopWizardProvider>
    </AppProvider>
  );
}

function AppContent() {
  const { isCompleted } = useShopWizard();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  
  // Listen for route changes
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Route logic
  if (currentPath === '/shop-wizard') {
    return <ShopWizard />;
  }
  
  if (currentPath.startsWith('/dashboard')) {
    return <MainLayout />;
  }
  
  // Home route logic
  if (currentPath === '/') {
    // If shop setup is not completed, redirect to shop wizard
    if (!isCompleted) {
      // Check localStorage for existing completion
      const shopCompleted = localStorage.getItem('ceypos-shop-completed') === 'true';
      if (!shopCompleted) {
        window.history.replaceState(null, '', '/shop-wizard');
        setCurrentPath('/shop-wizard');
        return <ShopWizard />;
      }
    }
    return <MainLayout />;
  }
  
  // Default fallback
  return <MainLayout />;
}

export default App;