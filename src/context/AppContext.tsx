import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ModuleName, User, Shop, CartItem } from '../types';
import { MemberScope } from '../types/team';
import { db } from '../lib/db';
import {
  fetchShopContext,
  loadTerminalSession,
  saveTerminalSession,
  clearTerminalSession,
} from '../lib/shopContext';
import { installGlobalBarcodeRouter } from '../lib/barcodeRouter';
import { authFetch } from '../lib/api';

interface AppContextType {
  currentModule: ModuleName;
  setCurrentModule: (module: ModuleName) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  currentUser: User | null;
  currentShop: Shop | null;
  activeShopId: string | null;
  memberScope: MemberScope | null;
  accountType: 'owner' | 'team';
  pairingRequired: boolean;
  refreshShopContext: () => Promise<void>;
  cart: CartItem[];
  addToCart: (product: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateCartItemQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  canAccessModule: (module: ModuleName) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const MODULE_SCOPE_MAP: Partial<Record<ModuleName, keyof MemberScope['modules']>> = {
  pos: 'pos',
  inventory: 'inventory',
  sessions: 'sessions',
  analytics: 'analytics',
  settings: 'settings',
  reports: 'reports',
  payments: 'payments',
  receipts: 'receipts',
  business: 'business',
  Subscription: 'subscription',
};

interface AppProviderProps {
  children: React.ReactNode;
  userEmail?: string;
  shopId?: string;
  shopProfile?: {
    name?: string;
    address?: string;
    contact?: string;
  };
  accountType?: 'owner' | 'team';
}

export const AppProvider: React.FC<AppProviderProps> = ({
  children,
  userEmail,
  shopId: externalShopId,
  shopProfile,
  accountType = 'owner',
}) => {
  // PayHere returns the customer to "/?module=Subscription&payhere=..." after
  // checkout, so honour a module hint in the URL on first render.
  const [currentModule, setCurrentModule] = useState<ModuleName>(() => {
    if (typeof window === 'undefined') return 'pos';
    const requested = new URLSearchParams(window.location.search).get('module');
    return requested === 'Subscription' ? 'Subscription' : 'pos';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentShop, setCurrentShop] = useState<Shop | null>(null);
  const [memberScope, setMemberScope] = useState<MemberScope | null>(null);
  const [pairingRequired, setPairingRequired] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);

  const canAccessModule = useCallback(
    (module: ModuleName) => {
      if (!memberScope) {
        if (accountType === 'owner') return true;
        return module === 'pos' || module === 'support';
      }
      if (memberScope.role === 'owner' && module === 'pos') {
        return true;
      }
      const key = MODULE_SCOPE_MAP[module];
      if (!key) return true;
      const value = memberScope.modules[key];
      return value === true || typeof value === 'string';
    },
    [accountType, memberScope],
  );

  const refreshShopContext = useCallback(async () => {
    if (!externalShopId || !userEmail) {
      setPairingRequired(accountType === 'team');
      return;
    }

    let terminal = loadTerminalSession(externalShopId);
    const isStalePrimarySession = accountType === 'team' && terminal?.terminalType === 'primary';
    if (isStalePrimarySession) {
      clearTerminalSession();
      terminal = null;
    }
    let effectiveTerminal = terminal;
    if (
      accountType === 'team' &&
      (!effectiveTerminal ||
        effectiveTerminal.terminalType !== 'register' ||
        !effectiveTerminal.terminalToken)
    ) {
      setPairingRequired(true);
    }

    let context;
    try {
      context = await fetchShopContext(
        externalShopId,
        userEmail,
        effectiveTerminal?.terminalId,
        effectiveTerminal?.terminalToken,
      );
    } catch (error) {
      if (accountType !== 'team' || !effectiveTerminal) {
        if (accountType === 'team') {
          setPairingRequired(true);
        }
        throw error;
      }

      clearTerminalSession();
      effectiveTerminal = null;
      setPairingRequired(true);
      context = await fetchShopContext(externalShopId, userEmail);
    }

    setMemberScope(context.scope);
    db.setSaleAttribution({
      memberId: context.member.memberId,
      displayName: context.member.displayName,
      role: context.member.role,
      terminalId: context.terminal?.terminalId || effectiveTerminal?.terminalId,
    });
    setCurrentUser({
      id: context.member.memberId,
      name: context.member.displayName,
      email: context.member.email,
      role: context.member.role === 'cashier' ? 'staff' : context.member.role === 'manager' ? 'manager' : 'admin',
      shopId: `shop_${externalShopId}`,
      permissions: [],
      memberId: context.member.memberId,
      terminalId: context.terminal?.terminalId || effectiveTerminal?.terminalId,
    });

    const needsPairing =
      accountType === 'team' &&
      context.member.role !== 'owner' &&
      (!effectiveTerminal ||
        effectiveTerminal.terminalType !== 'register' ||
        !effectiveTerminal.terminalToken ||
        !context.terminal ||
        context.terminal.terminalType !== 'register');

    setPairingRequired(Boolean(needsPairing));

    if (context.member.role === 'owner' && !terminal) {
      try {
        const res = await authFetch('/api/terminals/primary/ensure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shopId: externalShopId,
            userEmail,
            deviceMeta: { userAgent: navigator.userAgent },
          }),
        });
        const body = await res.json();
        if (res.ok && body.terminalToken && body.terminal?.terminalId) {
          const primaryTerminal = {
            shopId: externalShopId,
            terminalId: body.terminal.terminalId,
            terminalToken: body.terminalToken,
            terminalType: 'primary',
            label: body.terminal.label,
          };
          saveTerminalSession(primaryTerminal);
          setCurrentUser((prev) =>
            prev
              ? { ...prev, terminalId: primaryTerminal.terminalId }
              : prev,
          );
          void db.connectWebSocket(externalShopId, {
            terminalId: primaryTerminal.terminalId,
            terminalToken: primaryTerminal.terminalToken,
          });
        }
      } catch {
        // non-fatal
      }
    }
  }, [externalShopId, userEmail, accountType]);

  useEffect(() => {
    db.init();
    installGlobalBarcodeRouter();
  }, []);

  useEffect(() => {
    (async () => {
      if (!externalShopId) {
        setCurrentShop(null);
        return;
      }

      const terminal = loadTerminalSession(externalShopId);

      try {
        await db.connectWebSocket(externalShopId, terminal || undefined);
      } catch (e) {
        console.warn('Failed to connect WebSocket for shop', externalShopId, e);
      }

      try {
        await refreshShopContext();
      } catch (e) {
        console.warn('Failed to refresh shop context for shop', externalShopId, e);
      }

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
    })();
  }, [externalShopId, refreshShopContext]);

  useEffect(() => {
    if (!externalShopId || !shopProfile) return;
    setCurrentShop((prev) => {
      const base: Shop =
        prev ?? {
          id: `shop_${externalShopId}`,
          name: 'My Shop',
          address: '',
          contact: '',
        };
      return {
        ...base,
        name: shopProfile.name || base.name,
        address: shopProfile.address ?? base.address,
        contact: shopProfile.contact ?? base.contact,
      };
    });
  }, [externalShopId, shopProfile]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.terminalId) {
        setPairingRequired(false);
        void refreshShopContext();
      }
      if (detail?.revoked) {
        clearTerminalSession();
        setPairingRequired(true);
      }
    };
    window.addEventListener('ceypos:terminal-updated', handler);
    return () => window.removeEventListener('ceypos:terminal-updated', handler);
  }, [refreshShopContext]);

  // Mirror the current cart to the server as stock reservations so every
  // terminal (including this one) sees held items reduce immediately. Pushed
  // synchronously on each cart change — no debounce — for the fastest possible
  // propagation; releases automatically when the cart empties.
  useEffect(() => {
    if (!externalShopId) return;
    db.reserveCart(
      cart.map((item) => ({
        inventory_code: item.id,
        quantity: item.quantity,
      })),
    );
  }, [cart, externalShopId]);

  const addToCart = (product: CartItem) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + product.quantity }
            : item,
        );
      }
      return [...prevCart, product];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  const updateCartItemQuantity = (productId: string, quantity: number) => {
    setCart((prevCart) => {
      if (quantity <= 0) return prevCart.filter((item) => item.id !== productId);
      return prevCart.map((item) =>
        item.id === productId ? { ...item, quantity } : item,
      );
    });
  };

  const clearCart = () => setCart([]);

  return (
    <AppContext.Provider
      value={{
        currentModule,
        setCurrentModule,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        currentUser,
        currentShop,
        activeShopId: externalShopId ?? null,
        memberScope,
        accountType,
        pairingRequired,
        refreshShopContext,
        cart,
        addToCart,
        removeFromCart,
        updateCartItemQuantity,
        clearCart,
        cartTotal,
        canAccessModule,
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
