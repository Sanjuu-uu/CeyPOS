import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { AppProvider } from './context/AppContext';
import { ShopWizardProvider, useShopWizard } from './context/ShopWizardContext';
import { ShopWizard } from './components/modules/ShopWizard';
import Home from './pages/home/home';
import Login from './pages/login/Login';
import Register from './pages/register/Register';
import AboutUs from './pages/aboutUs/AboutUs';

// Auth Context for managing authentication state
interface AuthContextType {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextType | null>(null);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check if user is already logged in (localStorage, token, etc.)
    return localStorage.getItem('ceypos-authenticated') === 'true';
  });

  const login = () => {
    localStorage.setItem('ceypos-authenticated', 'true');
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('ceypos-authenticated');
    localStorage.removeItem('ceypos-shop-completed'); // Also clear shop completion
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
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

  // Check if we need to redirect to shop wizard
  useEffect(() => {
    if (currentPath === '/') {
      if (!isCompleted) {
        const shopCompleted = localStorage.getItem('ceypos-shop-completed') === 'true';
        if (!shopCompleted) {
          window.history.replaceState(null, '', '/shop-wizard');
          setCurrentPath('/shop-wizard');
        }
      }
    }
  }, [currentPath, isCompleted]);

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
          isCompleted || localStorage.getItem('ceypos-shop-completed') === 'true' 
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
    <AuthProvider>
      <Router>
        <AppRouter />
      </Router>
    </AuthProvider>
  );
}

function AppRouter() {
  const { isAuthenticated } = useAuth();
  
  // Show different app based on authentication status
  return isAuthenticated ? <PostAuthApp /> : <PreAuthApp />;
}

export default App;

// Export the useAuth hook for use in other components
export { useAuth };