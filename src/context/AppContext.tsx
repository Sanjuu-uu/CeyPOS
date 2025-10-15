import React, { createContext, useContext, useState, useEffect } from 'react';
import { ModuleName, User, Shop, CartItem } from '../types';
import { db } from '../lib/db';
import { generateShopId } from '../lib/api';

interface AppContextType {
  currentModule: ModuleName;
  setCurrentModule: (module: ModuleName) => void;

  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;

  // ▼ ADD THESE TWO LINES to the interface ▼
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  // ▲ END ADDITION ▲

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

export const AppProvider: React.FC<{ children: React.ReactNode, userEmail?: string }> = ({
  children,
  userEmail,
}) => {
  const [currentModule, setCurrentModule] = useState<ModuleName>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // ▼ INSERT this new state hook right after `isSidebarCollapsed` ▼
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // ▲ END INSERTION ▲

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentShop, setCurrentShop] = useState<Shop | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Calculate cart total
  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);

  // Initialize app with sample data
  useEffect(() => {
    // Initialize database
    db.init();

    (async () => {
      // Try to determine a shopId from userEmail, existing user, or localStorage
      let shopId: string | null = null;

      // First priority: derive from userEmail (for newly created shops)
      if (userEmail) {
        shopId = generateShopId(userEmail);
      }

      // Second priority: check existing users in cache
      if (!shopId) {
        const users = db.users.getAll();
        if (users.length > 0) {
          setCurrentUser(users[0]);
          shopId = users[0].shopId?.replace(/^shop_/, '') || null;
        }
      }

      // Third priority: localStorage
      if (!shopId) {
        shopId = localStorage.getItem('ceypos-shop-id');
      }

      if (shopId) {
        try {
          // Connect websocket and fetch initial shop meta/inventory
          await (db as any).connectWebSocket(shopId);

          // Set currentShop from client cache (db.shops.getById expects full id)
          const loadedShop = db.shops.getById(`shop_${shopId}`);
          if (loadedShop) setCurrentShop(loadedShop);
        } catch (e) {
          console.warn('Failed to connect WebSocket for shop', shopId, e);
        }
      }
    })();
  }, [userEmail]);  // New effect: when currentShop changes, ensure websocket connected (keeps sync alive)
  useEffect(() => {
    if (currentShop) {
      const rawShopId = currentShop.id.replace(/^shop_/, '');
      (db as any).connectWebSocket(rawShopId).catch((e: any) => console.warn('WS connect failed', e));
    }
  }, [currentShop]);

  // Cart management functions
  const addToCart = (product: CartItem) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);

      if (existingItem) {
        // Update quantity if item already exists
        return prevCart.map((item) =>
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
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  const updateCartItemQuantity = (productId: string, quantity: number) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
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

        // ▼ EXPOSE these two values in the provider’s value object ▼
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        // ▲ END EXPOSURE ▲

        currentUser,
        currentShop,
        cart,
        addToCart,
        removeFromCart,
        updateCartItemQuantity,
        clearCart,
        cartTotal,
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
