import React, { useEffect } from 'react';
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
  
  // For demo purposes, show wizard first, then main app
  // In a real app, you'd check if the user has already set up their shop
  if (!isCompleted) {
    return <ShopWizard />;
  }
  
  return <MainLayout />;
}

export default App;