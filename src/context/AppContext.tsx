import React, { createContext, useContext, useState, useEffect } from 'react';
import { ModuleName, User, Shop, CartItem } from '../types';
import { db } from '../lib/db';

interface AppContextType {
  currentModule: ModuleName;
  setCurrentModule: (module: ModuleName) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  currentUser: User | null;
  currentShop: Shop | null;
  cart: CartItem[];
  addToCart: (product: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateCartItemQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const [currentModule, setCurrentModule] = useState<ModuleName>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentShop, setCurrentShop] = useState<Shop | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Calculate cart total
  const cartTotal = cart.reduce(
    (total, item) => total + item.price * item.quantity, 
    0
  );

  // Initialize app with sample data
  useEffect(() => {
    // Initialize database
    db.init();
    
    // Set mock current user (first user in the database for demo)
    const users = db.users.getAll();
    if (users.length > 0) {
      setCurrentUser(users[0]);
      
      // Set current shop based on user's shop ID
      const userShop = db.shops.getById(users[0].shopId);
      if (userShop) {
        setCurrentShop(userShop);
      }
    }
  }, []);

  // Cart management functions
  const addToCart = (product: CartItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      
      if (existingItem) {
        // Update quantity if item already exists
        return prevCart.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + product.quantity } 
            : item
        );
      } else {
        // Add new item
        return [...prevCart, product];
      }
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const updateCartItemQuantity = (productId: string, quantity: number) => {
    setCart(prevCart => 
      prevCart.map(item => 
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  return (
    <AppContext.Provider
      value={{
        currentModule,
        setCurrentModule,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        currentUser,
        currentShop,
        cart,
        addToCart,
        removeFromCart,
        updateCartItemQuantity,
        clearCart,
        cartTotal
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};