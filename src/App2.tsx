import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider, useAuth, useUser } from '@clerk/clerk-react';
import { MainLayout } from './components/layout/MainLayout';
import { AppProvider } from './context/AppContext';
import { ShopWizardProvider, useShopWizard } from './context/ShopWizardContext';
import { ShopWizard } from './components/modules/ShopWizard';
import Home from './pages/home/home';
import Login from './pages/login/Login';
import Register from './pages/register/Register';
import AboutUs from './pages/aboutUs/AboutUs';

// Get Clerk publishable key from environment
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error("Missing Clerk Publishable Key");
}

// Pre-Authentication App (Marketing/Landing pages)
function PreAuthApp() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/home" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/about" element={<AboutUs />} />
      <Route path="/features" element={<div>Features Page - Coming Soon</div>} />
      <Route path="/pricing" element={<div>Pricing Page - Coming Soon</div>} />
      <Route path="/support" element={<div>Support Page - Coming Soon</div>} />
      <Route path="/contact" element={<div>Contact Page - Coming Soon</div>} />
      {/* Redirect any authenticated routes back to home */}
      <Route path="/dashboard/*" element={<Navigate to="/" replace />} />
      <Route path="/shop-wizard" element={<Navigate to="/" replace />} />
      {/* Catch-all route for 404 */}
      <Route path="*" element={<div>Page Not Found - 404</div>} />
    </Routes>
  );
}

// Post-Authentication App (POS System)
function PostAuthApp() {
  return (
    <AppProvider>
      <ShopWizardProvider>
        <PostAuthContent />
      </ShopWizardProvider>
    </AppProvider>
  );
}

function PostAuthContent() {
  const { user } = useUser();
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

  // Check if user has completed shop wizard
  const hasCompletedShopWizard = () => {
    if (!user) return false;
    
    // Check user metadata for shop completion
    const shopCompleted = user.publicMetadata?.shopCompleted === true;
    return shopCompleted || isCompleted || localStorage.getItem('ceypos-shop-completed') === 'true';
  };

  // Check if we need to redirect to shop wizard
  useEffect(() => {
    if (currentPath === '/') {
      if (!hasCompletedShopWizard()) {
        window.history.replaceState(null, '', '/shop-wizard');
        setCurrentPath('/shop-wizard');
      }
    }
  }, [currentPath, user, isCompleted]);

  return (
    <Routes>
      {/* Shop Wizard Route */}
      <Route path="/shop-wizard" element={<ShopWizard />} />
      
      {/* Dashboard Routes */}
      <Route path="/dashboard/*" element={<MainLayout />} />
      
      {/* Authenticated Home Route */}
      <Route 
        path="/" 
        element={
          hasCompletedShopWizard()
            ? <MainLayout /> 
            : <Navigate to="/shop-wizard" replace />
        } 
      />
      
      {/* Redirect old marketing routes to dashboard for authenticated users */}
      <Route path="/home" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="/register" element={<Navigate to="/dashboard" replace />} />
      <Route path="/about" element={<Navigate to="/dashboard" replace />} />
      <Route path="/features" element={<Navigate to="/dashboard" replace />} />
      <Route path="/pricing" element={<Navigate to="/dashboard" replace />} />
      <Route path="/support" element={<Navigate to="/dashboard" replace />} />
      <Route path="/contact" element={<Navigate to="/dashboard" replace />} />
      
      {/* Catch-all for authenticated users */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  // Set page title and favicon
  useEffect(() => {
    document.title = 'CeyPOS - Point of Sale System';
    
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (favicon) {
      favicon.href = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🏪</text></svg>';
    }
  }, []);

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <Router>
        <AppRouter />
      </Router>
    </ClerkProvider>
  );
}

function AppRouter() {
  const { isSignedIn, isLoaded } = useAuth();
  
  // Show loading while Clerk is loading
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Show different app based on authentication status
  return isSignedIn ? <PostAuthApp /> : <PreAuthApp />;
}

export default App;