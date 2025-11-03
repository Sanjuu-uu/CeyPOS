import React, { createContext, useContext, useState, useEffect } from 'react';
import { ModuleName, User, Shop, CartItem } from '../types';
import { db } from '../lib/db';

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
  activeShopId: string | null;

  cart: CartItem[];
  addToCart: (product: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateCartItemQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: React.ReactNode;
  userEmail?: string;
  shopId?: string;
  shopProfile?: {
    name?: string;
    address?: string;
    contact?: string;
  };
}

export const AppProvider: React.FC<AppProviderProps> = ({
  children,
  userEmail,
  shopId: externalShopId,
  shopProfile,
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
      if (!externalShopId) {
        setCurrentShop(null);
        return;
      }

      try {
        await (db as any).connectWebSocket(externalShopId);
        const loadedShop = db.shops.getById(`shop_${externalShopId}`);
        if (loadedShop) {
          setCurrentShop(loadedShop);
        } else {
          setCurrentShop({
            id: `shop_${externalShopId}`,
            name: 'My Shop',
            address: '',
            contact: '',
          } as Shop);
        }
      } catch (e) {
        console.warn('Failed to connect WebSocket for shop', externalShopId, e);
      }
    })();
  }, [externalShopId]);

  useEffect(() => {
    if (!externalShopId || !shopProfile) {
      return;
    }

    setCurrentShop((prev) => {
      const base: Shop =
        prev ?? {
          id: `shop_${externalShopId}`,
          name: 'My Shop',
          address: '',
          contact: '',
        };

      const next: Shop = {
        ...base,
        name: shopProfile.name || base.name,
        address: shopProfile.address ?? base.address,
        contact: shopProfile.contact ?? base.contact,
      };

      return next;
    });
  }, [externalShopId, shopProfile]);

  useEffect(() => {
    if (!userEmail) {
      setCurrentUser(null);
      return;
    }

    setCurrentUser({
      id: `clerk_${userEmail}`,
      name: userEmail.split('@')[0] || userEmail,
      email: userEmail,
      role: 'admin',
      shopId: externalShopId ? `shop_${externalShopId}` : '',
      permissions: ['*'],
    });
  }, [userEmail, externalShopId]);

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
    setCart((prevCart) => {
      if (quantity <= 0) {
        return prevCart.filter((item) => item.id !== productId);
      }
      return prevCart.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      );
    });
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
        activeShopId: externalShopId ?? null,
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
