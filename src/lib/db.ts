// Realtime client for two-way sync with backend SQLite database
import { Shop, Product, Sale, User } from "../types";
import clientIo from "socket.io-client";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

type SocketType = ReturnType<typeof clientIo> & {
  emit: (event: string, payload?: any, callback?: (response: any) => void) => void;
};

let socket: SocketType | null = null;
let currentShopKey: string | null = null;

export interface Customer {
  id: string;
  shopId: string;
  name?: string;
  email?: string;
  phone?: string;
  lastPurchaseAt?: string;
  totalSpend?: number;
}

export interface DailySale {
  id: string;
  shopId: string;
  date: string;
  grossTotal: number;
  transactions: number;
}

export interface TransactionItem {
  id: string;
  saleId: string;
  shopId: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

// 1. Add Business Rules Interfaces
export interface BusinessRules {
  loyalty: {
    enabled: boolean;
    earnRate: number;
    redeemRate: number;
    minPointsToRedeem: number;
  };
  discounts: Array<{ id?: number; name: string; type: 'percent' | 'fixed'; value: number }>;
  taxes: Array<{ id?: number; name: string; rate: number; isDefault: boolean }>;
  surcharges: Array<{ id?: number; minAmount: number; type: 'percent' | 'fixed'; value: number }>;
}

type InventoryRow = {
  inventory_code: string;
  barcode_id?: string | null;
  name: string;
  category?: string | null;
  price?: number | null;
  stock?: number | null;
  image_url?: string | null;
  sku?: string | null;
};

type CustomerRow = {
  customer_id: number;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  total_spent?: number | null;
  visit_count?: number | null;
  last_visit?: string | null;
  created_at?: string | null;
};

type DailySalesRow = {
  id?: number;
  shop_id?: string | null;
  date: string;
  total_sales?: number | null;
  transactions_count?: number | null;
  top_item?: string | null;
};

type TransactionRow = {
  transaction_id: number;
  customer_id?: number | null;
  subtotal?: number | null;
  discount?: number | null;
  tax?: number | null;
  total?: number | null;
  payment_method?: string | null;
  created_at?: string | null;
};

type TransactionItemRow = {
  id: number;
  transaction_id: number;
  item_id?: number | null;
  inventory_code?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  subtotal?: number | null;
};

interface ShopCache {
  inventoryByCode: Map<string, InventoryRow>;
  products: Product[];
  customersById: Map<number, CustomerRow>;
  customers: Customer[];
  dailySalesByDate: Map<string, DailySale>;
  dailySales: DailySale[];
  transactionsById: Map<number, TransactionRow>;
  transactionItemsByTx: Map<number, TransactionItemRow[]>;
  sales: Sale[];
  paymentMethods: string[];
  businessRules: BusinessRules;
}

const shopCaches: Record<string, ShopCache> = Object.create(null);
const lastAppliedChanges: Record<string, Record<string, { timestamp: number; changeId: string }>> =
  Object.create(null);

function ensureShopCache(shopKey: string): ShopCache {
  if (!shopCaches[shopKey]) {
    shopCaches[shopKey] = {
      inventoryByCode: new Map(),
      products: [],
      customersById: new Map(),
      customers: [],
      dailySalesByDate: new Map(),
      dailySales: [],
      transactionsById: new Map(),
      transactionItemsByTx: new Map(),
      sales: [],
      paymentMethods: [],
      businessRules: {
        loyalty: { enabled: false, earnRate: 1, redeemRate: 0.01, minPointsToRedeem: 0 },
        discounts: [],
        taxes: [],
        surcharges: []
      },
    };
  }
  return shopCaches[shopKey];
}

function resetChangeTracker(shopKey: string) {
  lastAppliedChanges[shopKey] = Object.create(null);
}

function shouldSkipChange(
  shopKey: string,
  entity: string,
  changeId: string | undefined,
  timestamp: string | undefined
) {
  const store = lastAppliedChanges[shopKey] || (lastAppliedChanges[shopKey] = Object.create(null));
  const existing = store[entity];
  const parsedTimestamp = timestamp ? Date.parse(timestamp) : Number.NaN;

  if (existing) {
    if (parsedTimestamp < existing.timestamp) {
      return true;
    }
    if (parsedTimestamp === existing.timestamp && changeId && existing.changeId === changeId) {
      return true;
    }
  }

  const effectiveTimestamp = Number.isNaN(parsedTimestamp) ? Date.now() : parsedTimestamp;
  store[entity] = {
    timestamp: effectiveTimestamp,
    changeId: changeId || `change-${effectiveTimestamp}`,
  };
  return false;
}

// Simple event emitter so React components can subscribe to db changes
const listeners: Record<string, Set<Function>> = {};

function emit(event: string, payload?: any) {
  const set = listeners[event];
  if (!set) return;
  for (const cb of Array.from(set)) {
    try {
      cb(payload);
    } catch (error) {
      console.error("db listener error", error);
    }
  }
}

function on(event: string, cb: Function) {
  listeners[event] = listeners[event] || new Set();
  listeners[event].add(cb);
  return () => off(event, cb);
}

function off(event: string, cb: Function) {
  listeners[event]?.delete(cb);
}

const shopsCache: Record<string, Shop> = {};
const usersCache: User[] = [];

function normalizeShopId(shopId: string) {
  return String(shopId || "").replace(/^shop_/, "");
}

function toShopKey(shopId: string) {
  return `shop_${normalizeShopId(shopId)}`;
}

function toProduct(shopKey: string, row: InventoryRow): Product {
  return {
    id: String(row.inventory_code),
    shopId: shopKey,
    name: row.name,
    category: row.category || "Uncategorized",
    price: Number(row.price ?? 0),
    stock: Number(row.stock ?? 0),
    barcode: row.barcode_id || "",
    imageUrl: row.image_url || undefined,
  };
}

function toCustomer(shopKey: string, row: CustomerRow): Customer {
  return {
    id: `customer_${row.customer_id}`,
    shopId: shopKey,
    name: row.name ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    totalSpend: Number(row.total_spent ?? 0),
    lastPurchaseAt: row.last_visit ?? row.created_at ?? undefined,
  };
}

function toDailySale(shopKey: string, row: DailySalesRow): DailySale {
  return {
    id: row.id ? String(row.id) : `${shopKey}-${row.date}`,
    shopId: shopKey,
    date: row.date,
    grossTotal: Number(row.total_sales ?? 0),
    transactions: Number(row.transactions_count ?? 0),
  };
}

function buildSale(
  shopKey: string,
  cache: ShopCache,
  transaction: TransactionRow
): Sale {
  const items = cache.transactionItemsByTx.get(transaction.transaction_id) || [];
  const cartItems = items.map((item): any => {
    const inventory = item.inventory_code
      ? cache.inventoryByCode.get(String(item.inventory_code))
      : undefined;
    const product = inventory ? toProduct(shopKey, inventory) : undefined;
    return {
      id: product?.id || String(item.inventory_code ?? item.item_id ?? "item"),
      shopId: shopKey,
      name: product?.name || String(item.inventory_code ?? "Item"),
      category: product?.category || "",
      price: Number(item.unit_price ?? product?.price ?? 0),
      stock: product?.stock ?? 0,
      barcode: product?.barcode || "",
      imageUrl: product?.imageUrl,
      quantity: Number(item.quantity ?? 0),
    };
  });

  return {
    id: String(transaction.transaction_id),
    shopId: shopKey,
    items: cartItems,
    total: Number(transaction.total ?? 0),
    paymentMethod: (transaction.payment_method || "cash") as Sale["paymentMethod"],
    timestamp: transaction.created_at || new Date().toISOString(),
    tax: Number(transaction.tax ?? 0),
    discount: Number(transaction.discount ?? 0),
    subtotal: Number(transaction.subtotal ?? 0),
  } as Sale;
}

async function fetchShopMeta(rawShopId: string) {
  const res = await fetch(`${API_BASE}/api/shop/${rawShopId}/meta`);
  if (!res.ok) throw new Error(`Failed to load shop metadata (${res.status})`);
  const body = await res.json();
  const meta = body.meta || body;
  const key = toShopKey(rawShopId);
  shopsCache[key] = {
    id: key,
    name: meta.shop_name || "Shop",
    address: meta.address || "",
    contact: meta.phone || "",
    logo: undefined,
  } as Shop;
  emit("shopMeta", { shopId: key, meta });
}

function applyInventoryRows(shopKey: string, rows: InventoryRow[]) {
  const cache = ensureShopCache(shopKey);
  let changed = false;
  for (const row of rows) {
    if (!row?.inventory_code) continue;
    cache.inventoryByCode.set(String(row.inventory_code), row);
    changed = true;
  }
  if (!changed) return;
  cache.products = Array.from(cache.inventoryByCode.values())
    .map((row) => toProduct(shopKey, row))
    .sort((a, b) => a.name.localeCompare(b.name));
  emit("inventoryUpdated", { shopId: shopKey, items: cache.products.slice() });
}

function removeInventoryRows(shopKey: string, codes: string[]) {
  if (!codes.length) return;
  const cache = ensureShopCache(shopKey);
  let changed = false;
  for (const code of codes) {
    const key = String(code);
    if (cache.inventoryByCode.delete(key)) {
      changed = true;
    }
  }
  if (!changed) return;
  cache.products = Array.from(cache.inventoryByCode.values())
    .map((row) => toProduct(shopKey, row))
    .sort((a, b) => a.name.localeCompare(b.name));
  emit("inventoryUpdated", { shopId: shopKey, items: cache.products.slice() });
}

function upsertCustomer(shopKey: string, row: CustomerRow) {
  const cache = ensureShopCache(shopKey);
  cache.customersById.set(row.customer_id, row);
  cache.customers = Array.from(cache.customersById.values()).map((r) =>
    toCustomer(shopKey, r)
  );
  emit("customersUpdated", { shopId: shopKey, customers: cache.customers.slice() });
}

function upsertDailySale(shopKey: string, row: DailySalesRow) {
  const cache = ensureShopCache(shopKey);
  cache.dailySalesByDate.set(row.date, toDailySale(shopKey, row));
  cache.dailySales = Array.from(cache.dailySalesByDate.values()).sort((a, b) =>
    b.date.localeCompare(a.date)
  );
  emit("dailySalesUpdated", { shopId: shopKey, rows: cache.dailySales.slice() });
}

function rebuildSales(shopKey: string) {
  const cache = ensureShopCache(shopKey);
  cache.sales = Array.from(cache.transactionsById.values())
    .map((row) => buildSale(shopKey, cache, row))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  emit("salesUpdated", { shopId: shopKey, items: cache.sales.slice() });
}

function upsertTransaction(shopKey: string, row: TransactionRow, items: TransactionItemRow[]) {
  const cache = ensureShopCache(shopKey);
  cache.transactionsById.set(row.transaction_id, row);
  if (items.length) {
    cache.transactionItemsByTx.set(row.transaction_id, items);
  }
  rebuildSales(shopKey);
  const createdSale = cache.sales.find((sale) => sale.id === String(row.transaction_id));
  if (createdSale) {
    emit("saleCreated", { shopId: shopKey, sale: createdSale });
  }
}

function applySnapshot(shopKey: string, snapshot: any) {
  resetChangeTracker(shopKey);
  const invRows: InventoryRow[] = snapshot.inventory || [];
  const customerRows: CustomerRow[] = snapshot.customers || [];
  const transactions: TransactionRow[] = snapshot.transactions || [];
  const txItems: TransactionItemRow[] = snapshot.transactionItems || [];
  const dailyRows: DailySalesRow[] = snapshot.dailySales || [];
  const methods: string[] = snapshot.paymentMethods || [];

  const cache = ensureShopCache(shopKey);
  // Load Business Rules
  if (snapshot.businessRules) {
    const { loyalty, discounts, taxes, surcharges } = snapshot.businessRules;
    cache.businessRules = {
      loyalty: {
        enabled: Boolean(loyalty?.enabled),
        earnRate: Number(loyalty?.earn_rate || 1),
        redeemRate: Number(loyalty?.redeem_rate || 0.01),
        minPointsToRedeem: Number(loyalty?.min_points || 0),
      },
      discounts: (discounts || []).map((d: any) => ({
        id: d.id, name: d.name, type: d.type, value: Number(d.value)
      })),
      taxes: (taxes || []).map((t: any) => ({
        id: t.id, name: t.name, rate: Number(t.rate), isDefault: Boolean(t.is_default)
      })),
      surcharges: (surcharges || []).map((s: any) => ({
        id: s.id, minAmount: Number(s.min_amount), type: s.type, value: Number(s.value)
      }))
    };
  }
  cache.inventoryByCode.clear();
  invRows.forEach((row) => {
    if (row?.inventory_code) {
      cache.inventoryByCode.set(String(row.inventory_code), row);
    }
  });
  cache.products = Array.from(cache.inventoryByCode.values())
    .map((row) => toProduct(shopKey, row))
    .sort((a, b) => a.name.localeCompare(b.name));

  cache.customersById.clear();
  customerRows.forEach((row) => cache.customersById.set(row.customer_id, row));
  cache.customers = Array.from(cache.customersById.values()).map((row) =>
    toCustomer(shopKey, row)
  );

  cache.dailySalesByDate.clear();
  dailyRows.forEach((row) =>
    cache.dailySalesByDate.set(row.date, toDailySale(shopKey, row))
  );
  cache.dailySales = Array.from(cache.dailySalesByDate.values()).sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  cache.transactionsById.clear();
  transactions.forEach((row) => cache.transactionsById.set(row.transaction_id, row));
  cache.transactionItemsByTx.clear();
  for (const item of txItems) {
    const list = cache.transactionItemsByTx.get(item.transaction_id) || [];
    list.push(item);
    cache.transactionItemsByTx.set(item.transaction_id, list);
  }

  cache.paymentMethods = Array.isArray(methods)
    ? methods.map((method) => String(method))
    : [];

  rebuildSales(shopKey);

  emit("inventoryUpdated", { shopId: shopKey, items: cache.products.slice() });
  emit("customersUpdated", { shopId: shopKey, customers: cache.customers.slice() });
  emit("dailySalesUpdated", { shopId: shopKey, rows: cache.dailySales.slice() });
  emit("salesUpdated", { shopId: shopKey, items: cache.sales.slice() });
  emit("paymentMethodsUpdated", { shopId: shopKey, methods: cache.paymentMethods.slice() });
  emit("businessRulesUpdated", { shopId: shopKey, rules: cache.businessRules });
}

// 5. Add API method to save rules
async function saveBusinessRules(rules: BusinessRules): Promise<void> {
  if (!currentShopKey) throw new Error("No active shop");
  const cleanShopId = normalizeShopId(currentShopKey);
  
  const res = await fetch(`${API_BASE}/api/business-rules/${cleanShopId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rules),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to save business rules");
  }
  
  // Optimistic update
  const cache = ensureShopCache(currentShopKey);
  cache.businessRules = rules;
  emit("businessRulesUpdated", { shopId: currentShopKey, rules });
}

async function fetchSnapshot(shopKey: string) {
  const rawShopId = normalizeShopId(shopKey);
  const res = await fetch(`${API_BASE}/api/shop/${rawShopId}/snapshot`);
  if (!res.ok) throw new Error(`Failed to load snapshot (${res.status})`);
  const data = await res.json();
  if (!data?.snapshot) return;
  applySnapshot(shopKey, data.snapshot);
}

function handleChange(event: any) {
  if (!event?.shopId) return;
  const shopKey = toShopKey(event.shopId);
  const entity = String(event.entity || "unknown");
  const changeId = typeof event.changeId === "string" ? event.changeId : undefined;
  const timestamp = typeof event.timestamp === "string" ? event.timestamp : undefined;

  if (shouldSkipChange(shopKey, entity, changeId, timestamp)) {
    return;
  }

  switch (event.entity) {
    case "inventory": {
      const action = String(event.action || "upsert");
      if (action === "delete") {
        const codes: string[] = event.payload?.codes || [];
        removeInventoryRows(shopKey, codes.map((code) => String(code)));
      } else {
        const rows: InventoryRow[] = event.payload?.rows || [];
        applyInventoryRows(shopKey, rows);
      }
      break;
    }
    case "customers": {
      const row: CustomerRow | null = event.payload?.row || null;
      if (row) {
        upsertCustomer(shopKey, row);
      }
      break;
    }
    case "daily_sales": {
      const row: DailySalesRow | null = event.payload?.row || null;
      if (row) {
        upsertDailySale(shopKey, row);
      }
      break;
    }
    case "transactions": {
      const tx: TransactionRow | null = event.payload?.transaction || null;
      const items: TransactionItemRow[] = event.payload?.items || [];
      if (tx) {
        upsertTransaction(shopKey, tx, items);
      }
      break;
    }
    case "payment_methods": {
      const methods: string[] = event.payload?.methods || [];
      const cache = ensureShopCache(shopKey);
      cache.paymentMethods = methods.map((method) => String(method));
      emit("paymentMethodsUpdated", { shopId: shopKey, methods: cache.paymentMethods.slice() });
      break;
    }
    default:
      break;
  }
}

function ensureSocket(shopKey: string) {
  const rawShopId = normalizeShopId(shopKey);
  if (socket && currentShopKey === shopKey) {
    return socket;
  }
  if (socket) {
    try {
      socket.off("change");
      socket.off("initialState");
      socket.off("disconnect");
    } catch (err) {
      console.warn("Failed clearing previous socket listeners", err);
    }
    socket.disconnect();
    socket = null;
  }

  socket = clientIo(API_BASE, { query: { shopId: rawShopId } }) as SocketType;
  currentShopKey = shopKey;

  socket.on("connect", () => {
    console.log("WS connected", socket?.id);
  });

  socket.on("initialState", (snapshot: any) => {
    const key = toShopKey(snapshot?.shopId ?? rawShopId);
    applySnapshot(key, snapshot);
  });

  socket.on("change", (event: any) => handleChange(event));

  socket.on("disconnect", (reason: any) => {
    console.log("WS disconnected", reason);
  });

  socket.on("connect_error", (error: any) => {
    console.error("WS connect error", error);
  });

  return socket;
}

function shopsAsArray(): Shop[] {
  return Object.values(shopsCache);
}

async function connectWebSocket(shopId: string) {
  const rawShopId = normalizeShopId(shopId);
  const shopKey = toShopKey(shopId);
  await fetchShopMeta(rawShopId);
  await fetchSnapshot(shopKey);
  ensureSocket(shopKey);
}

function getProductsByShop(shopId: string): Product[] {
  const cache = ensureShopCache(toShopKey(shopId));
  return cache.products.slice();
}

function getSalesByShop(shopId: string): Sale[] {
  const cache = ensureShopCache(toShopKey(shopId));
  return cache.sales.slice();
}

function getCustomersByShop(shopId: string): Customer[] {
  const cache = ensureShopCache(toShopKey(shopId));
  return cache.customers.slice();
}

function getDailySalesByShop(shopId: string): DailySale[] {
  const cache = ensureShopCache(toShopKey(shopId));
  return cache.dailySales.slice();
}

function getTransactionItemsBySale(shopId: string, saleId: string): TransactionItem[] {
  const cache = ensureShopCache(toShopKey(shopId));
  const rawItems = cache.transactionItemsByTx.get(Number(saleId)) || [];
  return rawItems.map((item) => {
    const product = item.inventory_code
      ? cache.inventoryByCode.get(String(item.inventory_code))
      : undefined;
    const productId = product?.inventory_code
      ? String(product.inventory_code)
      : `${saleId}-${item.id}`;
    return {
      id: `${saleId}-${item.id}`,
      saleId,
      shopId: toShopKey(shopId),
      productId,
      name: product?.name || String(item.inventory_code ?? "Item"),
      price: Number(item.unit_price ?? product?.price ?? 0),
      quantity: Number(item.quantity ?? 0),
      subtotal: Number(item.subtotal ?? 0),
    } as TransactionItem;
  });
}

function getPaymentMethodsByShop(shopId: string): string[] {
  const cache = ensureShopCache(toShopKey(shopId));
  return cache.paymentMethods.slice();
}

async function createInventoryRecord(
  product: Omit<Product, "id"> & { id?: string }
): Promise<Product> {
  const shopKey = product.shopId || currentShopKey || "";
  if (!shopKey) throw new Error("No active shop selected");
  const socketInstance = ensureSocket(shopKey);
  const identifier = product.id || `inv_${Date.now()}`;
  const payload = {
    ...product,
    id: identifier,
    inventory_code: identifier,
  };

  return new Promise((resolve, reject) => {
    socketInstance.emit("inventory:upsert", payload, (response: any) => {
      if (!response?.ok) {
        reject(
          new Error(
            response?.error || "Failed to save product. Please try again."
          )
        );
        return;
      }
      const rows: InventoryRow[] = response.rows || [];
      if (rows.length) {
        applyInventoryRows(shopKey, rows);
        resolve(toProduct(shopKey, rows[0]));
      } else {
        const cache = ensureShopCache(shopKey);
        const row = cache.inventoryByCode.get(identifier);
        resolve(row ? toProduct(shopKey, row) : {
          ...product,
          id: identifier,
          shopId: shopKey,
        });
      }
    });
  });
}

async function createSaleRecord(sale: Omit<Sale, "id">): Promise<Sale> {
  const shopKey = sale.shopId || currentShopKey;
  if (!shopKey) throw new Error("No active shop selected");
  const cleanShopId = normalizeShopId(shopKey);
  
  // Update payload to include real tax and discount values
  const payload = {
    shopId: cleanShopId,
    customer: sale.customerInfo || {},
    items: sale.items.map((item) => ({
      item_id: null,
      inventory_code: item.id,
      name: item.name,
      unit_price: item.price,
      quantity: item.quantity,
    })),
    subtotal: sale.subtotal || sale.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    discount: sale.discount || 0,
    tax: sale.tax || 0,
    total: sale.total,
    paymentMethod: sale.paymentMethod,
    createdAt: sale.timestamp || new Date().toISOString(),
  };

  const res = await fetch(`${API_BASE}/api/sales/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = await res.json();
  if (!res.ok || !body?.ok) {
    throw new Error(body?.error || "Failed to complete sale");
  }

  const saleRecord: Sale = {
    ...sale,
    id: String(body.transactionId ?? Date.now()),
    shopId: shopKey,
    timestamp: payload.createdAt,
  };

  return saleRecord;
}

export const db = {
  on,
  off,
  init: () => undefined,
  connectWebSocket,
  shops: {
    getAll: (): Shop[] => shopsAsArray(),
    getById: (id: string): Shop | undefined => shopsCache[id],
    async create(shop: Omit<Shop, "id"> & { id?: string }) {
      const shopId =
        shop.id?.replace(/^shop_/, "") || String(Math.floor(Date.now() / 1000));
      await fetch(`${API_BASE}/api/shop/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId, formData: shop }),
      });
      const key = toShopKey(shopId);
      const created: Shop = { ...shop, id: key } as Shop;
      shopsCache[key] = created;
      emit("shopCreated", created);
      return created;
    },
  },
  users: {
    getAll: (): User[] => usersCache,
    getById: (id: string): User | undefined => usersCache.find((u) => u.id === id),
    getByShopId: (shopId: string): User[] =>
      usersCache.filter((u) => u.shopId === shopId),
    async create(user: Omit<User, "id">): Promise<User> {
      const newUser = { ...user, id: `user_${Date.now()}` } as User;
      usersCache.push(newUser);
      emit("userCreated", newUser);
      return newUser;
    },
  },
  products: {
    getAll: (): Product[] => getProductsByShop(currentShopKey || ""),
    getByShopId: getProductsByShop,
    getById: (id: string): Product | undefined => {
      const cache = ensureShopCache(currentShopKey || "");
      return cache.products.find((p) => p.id === id);
    },
    create: createInventoryRecord,
    update: async (product: Product) => createInventoryRecord(product),
    async delete(id: string, shopId?: string): Promise<string[]> {
      const targetShop = shopId || currentShopKey;
      if (!targetShop) {
        throw new Error("No active shop selected");
      }
      const shopKey = toShopKey(targetShop);
      const cleanShopId = normalizeShopId(targetShop);
      const response = await fetch(
        `${API_BASE}/api/inventory/${encodeURIComponent(cleanShopId)}/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        }
      );
      let body: any = null;
      try {
        body = await response.json();
      } catch (err) {
        body = null;
      }
      if (!response.ok || body?.ok === false) {
        throw new Error(body?.error || "Failed to delete product");
      }
      const codes = Array.isArray(body?.codes)
        ? body.codes.map((code: any) => String(code))
        : [String(id)];
      removeInventoryRows(shopKey, codes);
      return codes;
    },
  },
  sales: {
    getAll: (): Sale[] => getSalesByShop(currentShopKey || ""),
    getByShopId: getSalesByShop,
    getById: (id: string): Sale | undefined => {
      const cache = ensureShopCache(currentShopKey || "");
      return cache.sales.find((sale) => sale.id === id);
    },
    create: createSaleRecord,
  },
  customers: {
    getByShopId: getCustomersByShop,
  },
  daily_sales: {
    getByShopId: getDailySalesByShop,
  },
  transaction_items: {
    getBySaleId: (saleId: string) =>
      getTransactionItemsBySale(currentShopKey || "", saleId),
  },
  paymentMethods: {
    getByShopId: getPaymentMethodsByShop,
    getCurrent(): string[] {
      if (!currentShopKey) return [];
      return getPaymentMethodsByShop(currentShopKey);
    },
    async refresh(shopId: string): Promise<string[]> {
      const shopKey = toShopKey(shopId);
      const cleanShopId = normalizeShopId(shopId || shopKey);
      const response = await fetch(`${API_BASE}/api/payment-methods/${cleanShopId}`);
      const body = await response.json();
      if (!response.ok || body?.ok === false) {
        throw new Error(body?.error || "Failed to load payment methods");
      }
      const cache = ensureShopCache(shopKey);
      cache.paymentMethods = Array.isArray(body?.methods)
        ? body.methods.map((method: any) => String(method))
        : [];
      emit("paymentMethodsUpdated", { shopId: shopKey, methods: cache.paymentMethods.slice() });
      return cache.paymentMethods.slice();
    },
    async setEnabled(shopId: string, methods: string[]): Promise<string[]> {
      const shopKey = toShopKey(shopId);
      const cleanShopId = normalizeShopId(shopId || shopKey);
      const response = await fetch(`${API_BASE}/api/payment-methods/${cleanShopId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ methods }),
      });
      const body = await response.json();
      if (!response.ok || body?.ok === false) {
        throw new Error(body?.error || "Failed to update payment methods");
      }
      const cache = ensureShopCache(shopKey);
      cache.paymentMethods = Array.isArray(body?.methods)
        ? body.methods.map((method: any) => String(method))
        : methods.map((method) => String(method));
      emit("paymentMethodsUpdated", { shopId: shopKey, methods: cache.paymentMethods.slice() });
      return cache.paymentMethods.slice();
    },
  },
  businessRules: {
    get: (): BusinessRules => {
        const cache = ensureShopCache(currentShopKey || "");
        return JSON.parse(JSON.stringify(cache.businessRules)); // Return copy
    },
    save: saveBusinessRules
  }
};

export default db;