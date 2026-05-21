import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import { ModuleName, User, Shop, CartItem, TerminalInfo } from '../types';
import { db } from '../lib/db';

// ─── Terminal identity ───────────────────────────────────────────────────────
// One unique ID per browser tab (sessionStorage resets on tab close).
function getOrCreateTerminalId(): string {
  let id = sessionStorage.getItem('ceypos_terminal_id');
  if (!id) {
    id = 'T-' + Math.random().toString(36).slice(2, 7).toUpperCase();
    sessionStorage.setItem('ceypos_terminal_id', id);
  }
  return id;
}

const THIS_TERMINAL_ID = getOrCreateTerminalId();
const HEARTBEAT_MS = 15_000;
const STALE_MS = 45_000;

type TerminalBroadcast =
  | {
      type: 'announce' | 'state' | 'cart_update' | 'heartbeat';
      terminalId: string;
      label: string;
      shopId: string;
      reservations: Record<string, number>;
      ts: number;
    }
  | { type: 'disconnected'; terminalId: string }
  | { type: 'request_state'; terminalId: string };

// ─── Context shape ────────────────────────────────────────────────────────────
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

  cart: CartItem[];
  addToCart: (product: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateCartItemQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;

  // ── Multi-terminal ──
  terminalId: string;
  terminalLabel: string;
  setTerminalLabel: (label: string) => void;
  activeTerminals: TerminalInfo[];
  getAvailableStock: (productId: string, totalStock: number) => number;
  getReservedByOthers: (productId: string) => number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────
interface AppProviderProps {
  children: React.ReactNode;
  userEmail?: string;
  shopId?: string;
  shopProfile?: { name?: string; address?: string; contact?: string };
}

export const AppProvider: React.FC<AppProviderProps> = ({
  children,
  userEmail,
  shopId: externalShopId,
  shopProfile,
}) => {
  const [currentModule, setCurrentModule] = useState<ModuleName>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentShop, setCurrentShop] = useState<Shop | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  // ── Terminal state ──
  const [terminalLabel, setTerminalLabelState] = useState<string>(
    () =>
      localStorage.getItem(`ceypos_label_${THIS_TERMINAL_ID}`) ||
      `Terminal ${THIS_TERMINAL_ID}`,
  );
  const [otherTerminals, setOtherTerminals] = useState<Map<string, TerminalInfo>>(
    new Map(),
  );

  // Live product stock from inventory updates (for accurate cap checks)
  const liveStockRef = useRef<Map<string, number>>(new Map());

  // Stable refs so callbacks don't need cart/label in deps
  const cartRef = useRef<CartItem[]>(cart);
  const labelRef = useRef<string>(terminalLabel);
  const shopIdRef = useRef<string>(externalShopId || '');
  const otherTerminalsRef = useRef<Map<string, TerminalInfo>>(otherTerminals);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => { cartRef.current = cart; }, [cart]);
  useEffect(() => { labelRef.current = terminalLabel; }, [terminalLabel]);
  useEffect(() => { shopIdRef.current = externalShopId || ''; }, [externalShopId]);
  useEffect(() => { otherTerminalsRef.current = otherTerminals; }, [otherTerminals]);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // ── Reservation helpers ──────────────────────────────────────────────────

  const getReservedByOthers = useCallback((productId: string): number => {
    let total = 0;
    for (const t of otherTerminals.values()) {
      total += t.reservations[productId] || 0;
    }
    return total;
  }, [otherTerminals]);

  const getAvailableStock = useCallback(
    (productId: string, totalStock: number): number => {
      // Prefer the live stock value if we have it
      const stock = liveStockRef.current.get(productId) ?? totalStock;
      return Math.max(0, stock - getReservedByOthers(productId));
    },
    [getReservedByOthers],
  );

  // ── BroadcastChannel helpers ─────────────────────────────────────────────

  const buildBroadcast = useCallback(
    (type: TerminalBroadcast['type']): TerminalBroadcast => {
      if (type === 'disconnected') {
        return { type: 'disconnected', terminalId: THIS_TERMINAL_ID };
      }
      if (type === 'request_state') {
        return { type: 'request_state', terminalId: THIS_TERMINAL_ID };
      }
      const reservations: Record<string, number> = {};
      for (const item of cartRef.current) {
        reservations[item.id] = item.quantity;
      }
      return {
        type,
        terminalId: THIS_TERMINAL_ID,
        label: labelRef.current,
        shopId: shopIdRef.current,
        reservations,
        ts: Date.now(),
      };
    },
    [],
  );

  const broadcastMsg = useCallback(
    (type: TerminalBroadcast['type']) => {
      channelRef.current?.postMessage(buildBroadcast(type));
    },
    [buildBroadcast],
  );

  const handleIncoming = useCallback(
    (msg: TerminalBroadcast) => {
      if (msg.terminalId === THIS_TERMINAL_ID) return;

      if (msg.type === 'disconnected') {
        setOtherTerminals((prev) => {
          const next = new Map(prev);
          next.delete(msg.terminalId);
          return next;
        });
        return;
      }

      if (msg.type === 'request_state') {
        channelRef.current?.postMessage(buildBroadcast('state'));
        return;
      }

      // announce | state | cart_update | heartbeat
      const info: TerminalInfo = {
        terminalId: msg.terminalId,
        label: msg.label,
        shopId: msg.shopId,
        reservations: msg.reservations,
        lastSeen: msg.ts,
      };
      setOtherTerminals((prev) => new Map(prev).set(msg.terminalId, info));
    },
    [buildBroadcast],
  );

  // ── Setup BroadcastChannel ───────────────────────────────────────────────

  useEffect(() => {
    if (!externalShopId) return;

    const channelName = `ceypos_t_${externalShopId.replace(/[^a-z0-9]/gi, '_')}`;
    let channel: BroadcastChannel;
    try {
      channel = new BroadcastChannel(channelName);
    } catch {
      // BroadcastChannel not supported (shouldn't happen in modern browsers)
      return;
    }
    channelRef.current = channel;

    channel.onmessage = (e: MessageEvent<TerminalBroadcast>) =>
      handleIncoming(e.data);

    // Announce presence and request current state from other terminals
    channel.postMessage(buildBroadcast('announce'));
    channel.postMessage({ type: 'request_state', terminalId: THIS_TERMINAL_ID });

    const heartbeat = setInterval(
      () => channel.postMessage(buildBroadcast('heartbeat')),
      HEARTBEAT_MS,
    );

    // Prune stale terminals
    const staleCheck = setInterval(() => {
      const now = Date.now();
      setOtherTerminals((prev) => {
        let changed = false;
        const next = new Map(prev);
        for (const [id, info] of next) {
          if (now - info.lastSeen > STALE_MS) {
            next.delete(id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, HEARTBEAT_MS);

    const onUnload = () =>
      channel.postMessage({
        type: 'disconnected',
        terminalId: THIS_TERMINAL_ID,
      });
    window.addEventListener('beforeunload', onUnload);

    return () => {
      channel.postMessage({ type: 'disconnected', terminalId: THIS_TERMINAL_ID });
      clearInterval(heartbeat);
      clearInterval(staleCheck);
      window.removeEventListener('beforeunload', onUnload);
      channel.close();
      channelRef.current = null;
    };
  }, [externalShopId, handleIncoming, buildBroadcast]);

  // Broadcast cart whenever it changes
  useEffect(() => {
    if (!channelRef.current) return;
    broadcastMsg('cart_update');
  }, [cart, broadcastMsg]);

  // ── Keep live stock in sync ──────────────────────────────────────────────

  useEffect(() => {
    if (!currentShop) return;
    const unsub = db.on('inventoryUpdated', (payload: unknown) => {
      const p = payload as { items?: Array<{ id: string; stock: number }> } | null;
      if (!p?.items) return;
      for (const item of p.items) {
        liveStockRef.current.set(item.id, item.stock);
      }
    });
    return () => unsub();
  }, [currentShop]);

  // ── Terminal label ───────────────────────────────────────────────────────

  const setTerminalLabel = useCallback(
    (label: string) => {
      setTerminalLabelState(label);
      localStorage.setItem(`ceypos_label_${THIS_TERMINAL_ID}`, label);
      // Broadcast the label change immediately
      setTimeout(() => {
        channelRef.current?.postMessage(buildBroadcast('announce'));
      }, 0);
    },
    [buildBroadcast],
  );

  // ── Shop / User init (unchanged logic) ───────────────────────────────────

  useEffect(() => {
    db.init();
    (async () => {
      if (!externalShopId) {
        setCurrentShop(null);
        return;
      }
      try {
        await db.connectWebSocket(externalShopId);
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
    if (!externalShopId || !shopProfile) return;
    setCurrentShop((prev) => {
      const base: Shop = prev ?? {
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

  // ── Cart operations (reservation-aware) ──────────────────────────────────

  const addToCart = useCallback(
    (product: CartItem) => {
      setCart((prevCart) => {
        // How many has this product been reserved by OTHER terminals?
        let reservedByOthers = 0;
        for (const t of otherTerminalsRef.current.values()) {
          reservedByOthers += t.reservations[product.id] || 0;
        }

        // Use live stock if available
        const liveStock =
          liveStockRef.current.get(product.id) ?? product.stock;
        const currentInCart =
          prevCart.find((i) => i.id === product.id)?.quantity || 0;
        const available = Math.max(
          0,
          liveStock - reservedByOthers - currentInCart,
        );

        if (available <= 0) return prevCart; // fully reserved by other terminals

        const qtyToAdd = Math.min(product.quantity, available);
        const existingItem = prevCart.find((i) => i.id === product.id);

        if (existingItem) {
          return prevCart.map((i) =>
            i.id === product.id
              ? { ...i, quantity: i.quantity + qtyToAdd }
              : i,
          );
        }
        return [...prevCart, { ...product, quantity: qtyToAdd }];
      });
    },
    [], // uses refs — no deps needed
  );

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.id !== productId));
  }, []);

  const updateCartItemQuantity = useCallback(
    (productId: string, quantity: number) => {
      setCart((prevCart) => {
        if (quantity <= 0) {
          return prevCart.filter((i) => i.id !== productId);
        }
        const product = prevCart.find((i) => i.id === productId);
        if (!product) return prevCart;

        let reservedByOthers = 0;
        for (const t of otherTerminalsRef.current.values()) {
          reservedByOthers += t.reservations[productId] || 0;
        }

        const liveStock =
          liveStockRef.current.get(productId) ?? product.stock;
        const maxQty = Math.max(0, liveStock - reservedByOthers);
        const cappedQty = Math.min(quantity, maxQty);

        if (cappedQty <= 0) {
          return prevCart.filter((i) => i.id !== productId);
        }
        return prevCart.map((i) =>
          i.id === productId ? { ...i, quantity: cappedQty } : i,
        );
      });
    },
    [], // uses refs
  );

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const activeTerminals = useMemo<TerminalInfo[]>(
    () => Array.from(otherTerminals.values()),
    [otherTerminals],
  );

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
        cart,
        addToCart,
        removeFromCart,
        updateCartItemQuantity,
        clearCart,
        cartTotal,
        terminalId: THIS_TERMINAL_ID,
        terminalLabel,
        setTerminalLabel,
        activeTerminals,
        getAvailableStock,
        getReservedByOthers,
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
