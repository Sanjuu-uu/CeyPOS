// Realtime client for two-way sync with backend SQLite database
import {
  Shop,
  Product,
  Sale,
  User,
  Customer,
  CartItem,
  KeyboardShortcuts,
} from "../types";
import clientIo from "socket.io-client";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";

type SocketEmitCallback = (response: unknown) => void;

type SocketType = ReturnType<typeof clientIo> & {
  emit: (
    event: string,
    payload?: unknown,
    callback?: SocketEmitCallback,
  ) => void;
};

let socket: SocketType | null = null;
let currentShopKey: string | null = null;

// Export Business Rules Types
export interface BusinessRules {
  loyalty: {
    enabled: boolean;
    earnRate: number;
    redeemRate: number;
    minPointsToRedeem: number;
  };
  discounts: Array<{
    id?: number;
    name: string;
    type: "percent" | "fixed";
    value: number;
  }>;
  taxes: Array<{ id?: number; name: string; rate: number; isDefault: boolean }>;
  surcharges: Array<{
    id?: number;
    minAmount: number;
    type: "percent" | "fixed";
    value: number;
  }>;
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
  points_balance?: number | null; // Added
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

type RawDiscountRule = {
  id?: number;
  name?: string | null;
  type?: "percent" | "fixed" | null;
  value?: number | null;
};

type RawTaxRule = {
  id?: number;
  name?: string | null;
  rate?: number | null;
  is_default?: number | null;
};

type RawSurchargeRule = {
  id?: number;
  min_amount?: number | null;
  type?: "percent" | "fixed" | null;
  value?: number | null;
};

type RawLoyaltyRule = {
  enabled?: number | boolean | null;
  earn_rate?: number | null;
  redeem_rate?: number | null;
  min_points?: number | null;
};

interface RawBusinessRulesSnapshot {
  loyalty?: RawLoyaltyRule | null;
  discounts?: RawDiscountRule[] | null;
  taxes?: RawTaxRule[] | null;
  surcharges?: RawSurchargeRule[] | null;
}

interface ShopSnapshotPayload {
  shopId?: string;
  inventory?: InventoryRow[] | null;
  customers?: CustomerRow[] | null;
  transactions?: TransactionRow[] | null;
  transactionItems?: TransactionItemRow[] | null;
  dailySales?: DailySalesRow[] | null;
  paymentMethods?: Array<string | number> | null;
  businessRules?: RawBusinessRulesSnapshot | null;
}

type InventoryChangePayload = {
  rows?: InventoryRow[];
  codes?: Array<string | number>;
};

type PaymentMethodsChangePayload = {
  methods?: Array<string | number>;
};

type BusinessRulesChangePayload = {
  rules?: BusinessRules;
};

interface ChangeEventPayload {
  shopId?: string;
  entity?: string;
  action?: string;
  changeId?: string;
  timestamp?: string;
  payload?: unknown;
}

interface InventoryUpsertResponse {
  ok: boolean;
  rows?: InventoryRow[];
  error?: string;
}

interface InventoryDeleteResponse {
  ok?: boolean;
  codes?: Array<string | number>;
  error?: string;
}

interface PaymentMethodsResponse {
  ok?: boolean;
  methods?: Array<string | number>;
  error?: string;
}

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
  businessRules: BusinessRules; // Added
}

const shopCaches: Record<string, ShopCache> = Object.create(null);
const lastAppliedChanges: Record<
  string,
  Record<string, { timestamp: number; changeId: string }>
> = Object.create(null);

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
        loyalty: {
          enabled: false,
          earnRate: 1,
          redeemRate: 0.01,
          minPointsToRedeem: 0,
        },
        discounts: [],
        taxes: [],
        surcharges: [],
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
  timestamp: string | undefined,
) {
  const store =
    lastAppliedChanges[shopKey] ||
    (lastAppliedChanges[shopKey] = Object.create(null));
  const existing = store[entity];
  const parsedTimestamp = timestamp ? Date.parse(timestamp) : Number.NaN;

  if (existing) {
    if (parsedTimestamp < existing.timestamp) {
      return true;
    }
    if (
      parsedTimestamp === existing.timestamp &&
      changeId &&
      existing.changeId === changeId
    ) {
      return true;
    }
  }

  const effectiveTimestamp = Number.isNaN(parsedTimestamp)
    ? Date.now()
    : parsedTimestamp;
  store[entity] = {
    timestamp: effectiveTimestamp,
    changeId: changeId || `change-${effectiveTimestamp}`,
  };
  return false;
}

type Listener = (payload: unknown) => void;

const listeners: Record<string, Set<Listener>> = Object.create(null);

function emit(event: string, payload?: unknown) {
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

function on(event: string, cb: Listener) {
  if (!listeners[event]) {
    listeners[event] = new Set();
  }
  listeners[event]!.add(cb);
  return () => off(event, cb);
}

function off(event: string, cb: Listener) {
  listeners[event]?.delete(cb);
}

const shopsCache: Record<string, Shop> = {};
const usersCache: User[] = [];

function sanitizeShopIdentifier(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._+-]/g, "_");
}

function normalizeShopId(shopId: string) {
  const trimmed = String(shopId ?? "")
    .replace(/^shop_/, "")
    .replace(/\.db$/i, "")
    .trim();
  return sanitizeShopIdentifier(trimmed);
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "0") {
      return false;
    }
  }
  return fallback;
}

function asString(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) {
    return fallback;
  }
  const str = String(value);
  return str || fallback;
}

function asRuleType(value: unknown): "percent" | "fixed" {
  return value === "fixed" ? "fixed" : "percent";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isInventoryRow(value: unknown): value is InventoryRow {
  return isObject(value) && typeof value.inventory_code === "string";
}

function isCustomerRow(value: unknown): value is CustomerRow {
  return isObject(value) && typeof value.customer_id === "number";
}

function isDailySalesRow(value: unknown): value is DailySalesRow {
  return isObject(value) && typeof value.date === "string";
}

function isTransactionRow(value: unknown): value is TransactionRow {
  return isObject(value) && typeof value.transaction_id === "number";
}

function isTransactionItemRow(value: unknown): value is TransactionItemRow {
  return isObject(value) && typeof value.transaction_id === "number";
}

function toStringArray(values: unknown): string[] {
  return Array.isArray(values) ? values.map((value) => String(value)) : [];
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

// Fixed toCustomer to include pointsBalance
function toCustomer(shopKey: string, row: CustomerRow): Customer {
  return {
    id: `customer_${row.customer_id}`,
    shopId: shopKey,
    name: row.name ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    totalSpend: Number(row.total_spent ?? 0),
    pointsBalance: Number(row.points_balance ?? 0), // Fixed
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
  transaction: TransactionRow,
): Sale {
  const items =
    cache.transactionItemsByTx.get(transaction.transaction_id) || [];
  const cartItems: CartItem[] = items.map((item): CartItem => {
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
    paymentMethod: (transaction.payment_method ||
      "cash") as Sale["paymentMethod"],
    timestamp: transaction.created_at || new Date().toISOString(),
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
    currency: meta.currency || "$", // Map currency
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
    toCustomer(shopKey, r),
  );
  emit("customersUpdated", {
    shopId: shopKey,
    customers: cache.customers.slice(),
  });
}

function upsertDailySale(shopKey: string, row: DailySalesRow) {
  const cache = ensureShopCache(shopKey);
  cache.dailySalesByDate.set(row.date, toDailySale(shopKey, row));
  cache.dailySales = Array.from(cache.dailySalesByDate.values()).sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  emit("dailySalesUpdated", {
    shopId: shopKey,
    rows: cache.dailySales.slice(),
  });
}

function rebuildSales(shopKey: string) {
  const cache = ensureShopCache(shopKey);
  cache.sales = Array.from(cache.transactionsById.values())
    .map((row) => buildSale(shopKey, cache, row))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  emit("salesUpdated", { shopId: shopKey, items: cache.sales.slice() });
}

function upsertTransaction(
  shopKey: string,
  row: TransactionRow,
  items: TransactionItemRow[],
) {
  const cache = ensureShopCache(shopKey);
  cache.transactionsById.set(row.transaction_id, row);
  if (items.length) {
    cache.transactionItemsByTx.set(row.transaction_id, items);
  }
  rebuildSales(shopKey);
  const createdSale = cache.sales.find(
    (sale) => sale.id === String(row.transaction_id),
  );
  if (createdSale) {
    emit("saleCreated", { shopId: shopKey, sale: createdSale });
  }
}

function toBusinessRules(
  raw: RawBusinessRulesSnapshot | null | undefined,
): BusinessRules | null {
  if (!raw) {
    return null;
  }

  const loyaltySource = raw.loyalty ?? {};

  const discounts = Array.isArray(raw.discounts)
    ? raw.discounts
        .filter((entry): entry is RawDiscountRule => Boolean(entry))
        .map((entry) => ({
          id: typeof entry.id === "number" ? entry.id : undefined,
          name: asString(entry.name, ""),
          type: asRuleType(entry.type),
          value: toNumber(entry.value, 0),
        }))
    : [];

  const taxes = Array.isArray(raw.taxes)
    ? raw.taxes
        .filter((entry): entry is RawTaxRule => Boolean(entry))
        .map((entry) => ({
          id: typeof entry.id === "number" ? entry.id : undefined,
          name: asString(entry.name, ""),
          rate: toNumber(entry.rate, 0),
          isDefault: toBoolean(entry.is_default, false),
        }))
    : [];

  const surcharges = Array.isArray(raw.surcharges)
    ? raw.surcharges
        .filter((entry): entry is RawSurchargeRule => Boolean(entry))
        .map((entry) => ({
          id: typeof entry.id === "number" ? entry.id : undefined,
          minAmount: toNumber(entry.min_amount, 0),
          type: asRuleType(entry.type),
          value: toNumber(entry.value, 0),
        }))
    : [];

  return {
    loyalty: {
      enabled: toBoolean(loyaltySource.enabled, false),
      earnRate: toNumber(loyaltySource.earn_rate, 1),
      redeemRate: toNumber(loyaltySource.redeem_rate, 0.01),
      minPointsToRedeem: toNumber(loyaltySource.min_points, 0),
    },
    discounts,
    taxes,
    surcharges,
  };
}

// Updated applySnapshot to load Business Rules
function applySnapshot(
  shopKey: string,
  snapshot: ShopSnapshotPayload | null | undefined,
) {
  resetChangeTracker(shopKey);
  const payload = snapshot ?? {};
  const invRows = Array.isArray(payload.inventory) ? payload.inventory : [];
  const customerRows = Array.isArray(payload.customers)
    ? payload.customers
    : [];
  const transactions = Array.isArray(payload.transactions)
    ? payload.transactions
    : [];
  const txItems = Array.isArray(payload.transactionItems)
    ? payload.transactionItems
    : [];
  const dailyRows = Array.isArray(payload.dailySales) ? payload.dailySales : [];
  const methods = Array.isArray(payload.paymentMethods)
    ? payload.paymentMethods
    : [];

  const cache = ensureShopCache(shopKey);
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
    toCustomer(shopKey, row),
  );

  cache.dailySalesByDate.clear();
  dailyRows.forEach((row) =>
    cache.dailySalesByDate.set(row.date, toDailySale(shopKey, row)),
  );
  cache.dailySales = Array.from(cache.dailySalesByDate.values()).sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  cache.transactionsById.clear();
  transactions.forEach((row) =>
    cache.transactionsById.set(row.transaction_id, row),
  );
  cache.transactionItemsByTx.clear();
  for (const item of txItems) {
    const list = cache.transactionItemsByTx.get(item.transaction_id) || [];
    list.push(item);
    cache.transactionItemsByTx.set(item.transaction_id, list);
  }

  cache.paymentMethods = methods.map((method) => String(method));

  // Business Rules
  const businessRules = toBusinessRules(payload.businessRules ?? null);
  if (businessRules) {
    cache.businessRules = businessRules;
  }

  rebuildSales(shopKey);

  emit("inventoryUpdated", { shopId: shopKey, items: cache.products.slice() });
  emit("customersUpdated", {
    shopId: shopKey,
    customers: cache.customers.slice(),
  });
  emit("dailySalesUpdated", {
    shopId: shopKey,
    rows: cache.dailySales.slice(),
  });
  emit("salesUpdated", { shopId: shopKey, items: cache.sales.slice() });
  emit("paymentMethodsUpdated", {
    shopId: shopKey,
    methods: cache.paymentMethods.slice(),
  });
  emit("businessRulesUpdated", { shopId: shopKey, rules: cache.businessRules });
}

async function fetchSnapshot(shopKey: string) {
  const rawShopId = normalizeShopId(shopKey);
  const res = await fetch(`${API_BASE}/api/shop/${rawShopId}/snapshot`);
  if (!res.ok) throw new Error(`Failed to load snapshot (${res.status})`);
  const data = await res.json();
  if (!data?.snapshot) return;
  applySnapshot(shopKey, data.snapshot);
}

function handleChange(event: ChangeEventPayload | null | undefined) {
  if (!event?.shopId) {
    return;
  }

  const shopKey = toShopKey(event.shopId);
  const entity = String(event.entity ?? "unknown");
  const changeId =
    typeof event.changeId === "string" ? event.changeId : undefined;
  const timestamp =
    typeof event.timestamp === "string" ? event.timestamp : undefined;

  if (shouldSkipChange(shopKey, entity, changeId, timestamp)) {
    return;
  }

  const payload = event.payload;

  switch (entity) {
    case "inventory": {
      const action = String(event.action ?? "upsert");
      const source = isObject(payload)
        ? (payload as Partial<InventoryChangePayload>)
        : {};
      if (action === "delete") {
        const codes = toStringArray((source as { codes?: unknown }).codes);
        removeInventoryRows(shopKey, codes);
      } else {
        const rowsSource = Array.isArray((source as { rows?: unknown }).rows)
          ? ((source as { rows?: unknown }).rows as unknown[])
          : [];
        const rows = rowsSource.filter(isInventoryRow) as InventoryRow[];
        applyInventoryRows(shopKey, rows);
      }
      break;
    }
    case "customers": {
      const sourceRow = isObject(payload)
        ? (payload as { row?: unknown }).row
        : undefined;
      if (isCustomerRow(sourceRow)) {
        upsertCustomer(shopKey, sourceRow);
      }
      break;
    }
    case "daily_sales": {
      const sourceRow = isObject(payload)
        ? (payload as { row?: unknown }).row
        : undefined;
      if (isDailySalesRow(sourceRow)) {
        upsertDailySale(shopKey, sourceRow);
      }
      break;
    }
    case "transactions": {
      const txSource = isObject(payload)
        ? (payload as { transaction?: unknown }).transaction
        : undefined;
      const itemsSource = isObject(payload)
        ? (payload as { items?: unknown }).items
        : undefined;
      const items = Array.isArray(itemsSource)
        ? itemsSource.filter(isTransactionItemRow)
        : [];
      if (isTransactionRow(txSource)) {
        upsertTransaction(shopKey, txSource, items);

        // ⚠️ FIX: DEDUCT INCOMING STOCK TO PREVENT MULTI-TERMINAL OVERSOLD ISSUES
        const cache = ensureShopCache(shopKey);
        let invChanged = false;
        items.forEach((item) => {
          if (item.inventory_code) {
            const inv = cache.inventoryByCode.get(String(item.inventory_code));
            if (inv && typeof inv.stock === "number") {
              inv.stock = Math.max(0, inv.stock - (item.quantity || 0));
              invChanged = true;
            }
          }
        });
        if (invChanged) {
          cache.products = Array.from(cache.inventoryByCode.values())
            .map((row) => toProduct(shopKey, row))
            .sort((a, b) => a.name.localeCompare(b.name));
          emit("inventoryUpdated", {
            shopId: shopKey,
            items: cache.products.slice(),
          });
        }
      }
      break;
    }
    case "payment_methods": {
      const methodsSource = isObject(payload)
        ? (payload as PaymentMethodsChangePayload).methods
        : undefined;
      const methods = toStringArray(methodsSource);
      const cache = ensureShopCache(shopKey);
      cache.paymentMethods = methods;
      emit("paymentMethodsUpdated", {
        shopId: shopKey,
        methods: cache.paymentMethods.slice(),
      });
      break;
    }
    case "business_rules": {
      const rules = isObject(payload)
        ? (payload as BusinessRulesChangePayload).rules
        : undefined;
      if (rules) {
        const cache = ensureShopCache(shopKey);
        cache.businessRules = rules;
        emit("businessRulesUpdated", { shopId: shopKey, rules });
      }
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

  socket.on("initialState", (snapshot: ShopSnapshotPayload) => {
    const key = toShopKey(snapshot?.shopId ?? rawShopId);
    applySnapshot(key, snapshot);
  });

  socket.on("change", (event: ChangeEventPayload) => handleChange(event));

  socket.on("mobile:barcode", (payload: unknown) => {
    emit("mobileBarcode", payload);
  });

  socket.on("disconnect", (reason: unknown) => {
    console.log("WS disconnected", reason);
  });

  socket.on("connect_error", (error: unknown) => {
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

function getTransactionItemsBySale(
  shopId: string,
  saleId: string,
): TransactionItem[] {
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
  product: Omit<Product, "id"> & { id?: string },
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
    socketInstance.emit("inventory:upsert", payload, (response: unknown) => {
      const result = (response as InventoryUpsertResponse) ?? { ok: false };
      if (!result.ok) {
        reject(
          new Error(
            result.error || "Failed to save product. Please try again.",
          ),
        );
        return;
      }

      const rows = Array.isArray(result.rows)
        ? result.rows.filter(isInventoryRow)
        : [];

      if (rows.length) {
        applyInventoryRows(shopKey, rows);
        resolve(toProduct(shopKey, rows[0]));
      } else {
        const cache = ensureShopCache(shopKey);
        const row = cache.inventoryByCode.get(identifier);
        resolve(
          row
            ? toProduct(shopKey, row)
            : {
                ...product,
                id: identifier,
                shopId: shopKey,
              },
        );
      }
    });
  });
}

// Add API method to save business rules
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

// Fixed createSaleRecord to use mapped fields
async function createSaleRecord(sale: Omit<Sale, "id">): Promise<Sale> {
  const shopKey = sale.shopId || currentShopKey;
  if (!shopKey) throw new Error("No active shop selected");
  const cleanShopId = normalizeShopId(shopKey);

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
    subtotal:
      sale.subtotal ||
      sale.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    discount: sale.discount || 0,
    tax: sale.tax || 0,
    total: sale.total,
    pointsEarned: sale.pointsEarned || 0, // SEND POINTS
    pointsRedeemed: sale.pointsRedeemed || 0,
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

  const cache = ensureShopCache(shopKey);
  let invChanged = false;
  sale.items.forEach((item) => {
    const inv = cache.inventoryByCode.get(String(item.id));
    if (inv && typeof inv.stock === "number") {
      inv.stock = Math.max(0, inv.stock - (item.quantity || 0));
      invChanged = true;
    }
  });
  if (invChanged) {
    cache.products = Array.from(cache.inventoryByCode.values())
      .map((row) => toProduct(shopKey, row))
      .sort((a, b) => a.name.localeCompare(b.name));
    emit("inventoryUpdated", {
      shopId: shopKey,
      items: cache.products.slice(),
    });
  }

  return saleRecord;
}

export const normalizeKey = (k: string) =>
  (k || "").toString().toLowerCase().replace(/\s+/g, "").trim();

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
    getById: (id: string): User | undefined =>
      usersCache.find((u) => u.id === id),
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
        },
      );
      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      const payload = isObject(body)
        ? (body as InventoryDeleteResponse)
        : undefined;
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || "Failed to delete product");
      }
      const codes = payload?.codes
        ? toStringArray(payload.codes)
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
      const response = await fetch(
        `${API_BASE}/api/payment-methods/${cleanShopId}`,
      );
      const rawBody: unknown = await response.json();
      const payload = isObject(rawBody)
        ? (rawBody as PaymentMethodsResponse)
        : undefined;
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || "Failed to load payment methods");
      }
      const cache = ensureShopCache(shopKey);
      cache.paymentMethods = payload?.methods
        ? toStringArray(payload.methods)
        : [];
      emit("paymentMethodsUpdated", {
        shopId: shopKey,
        methods: cache.paymentMethods.slice(),
      });
      return cache.paymentMethods.slice();
    },
    async setEnabled(shopId: string, methods: string[]): Promise<string[]> {
      const shopKey = toShopKey(shopId);
      const cleanShopId = normalizeShopId(shopId || shopKey);
      const response = await fetch(
        `${API_BASE}/api/payment-methods/${cleanShopId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ methods }),
        },
      );
      const rawBody: unknown = await response.json();
      const payload = isObject(rawBody)
        ? (rawBody as PaymentMethodsResponse)
        : undefined;
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || "Failed to update payment methods");
      }
      const cache = ensureShopCache(shopKey);
      cache.paymentMethods = payload?.methods
        ? toStringArray(payload.methods)
        : methods.map((method) => String(method));
      emit("paymentMethodsUpdated", {
        shopId: shopKey,
        methods: cache.paymentMethods.slice(),
      });
      return cache.paymentMethods.slice();
    },
  },
  businessRules: {
    get: (): BusinessRules => {
      const cache = ensureShopCache(currentShopKey || "");
      return JSON.parse(JSON.stringify(cache.businessRules));
    },
    save: saveBusinessRules,
  },
  shortcuts: {
    get: (userId: string = "default"): KeyboardShortcuts => {
      const defaultShortcuts: KeyboardShortcuts = {
        focusSearch: "F1",
        checkout: "F2",
        clearCart: "F3",
        togglePayment: "F4",
        addCustomer: "F5",
        removeCustomer: "Delete",
        confirmPayment: "Enter",
        increaseQuantity: "+",
        decreaseQuantity: "-",
      };

      let data = localStorage.getItem(`pos_device_shortcuts_${userId}_v2`);
      if (!data) data = localStorage.getItem(`pos_device_shortcuts_${userId}`);

      if (data) {
        try {
          const parsed = JSON.parse(data);
          return { ...defaultShortcuts, ...parsed };
        } catch (e) {
          console.warn("Failed to parse shortcuts, returning defaults");
        }
      }
      return defaultShortcuts;
    },
    save: (userId: string = "default", shortcuts: KeyboardShortcuts) => {
      // ⚠️ FIX: STRICT SAVE-LAYER VALIDATION
      const values = Object.values(shortcuts).map((val) =>
        normalizeKey(String(val)),
      );

      if (values.some((v) => !v)) {
        throw new Error(
          "Save rejected: Invalid or empty shortcut keys detected.",
        );
      }
      if (new Set(values).size !== values.length) {
        throw new Error("Save rejected: Duplicate shortcut keys detected.");
      }

      localStorage.setItem(
        `pos_device_shortcuts_${userId}_v2`,
        JSON.stringify(shortcuts),
      );
      window.dispatchEvent(new CustomEvent("shortcuts-updated"));
    },
  },
};

export default db;
