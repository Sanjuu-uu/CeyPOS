// Real-time database sync client using REST for socket.io live updates
import { Shop, Product, Sale, User } from "../types";
import clientIo from "socket.io-client";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";
let socket: any = null;
let currentShopId: string | null = null;

// Types for new collections
export interface Customer {
  id: string;
  shopId: string;
  name?: string;
  email?: string;
  phone?: string;
  lastPurchaseAt?: string; // ISO
  totalSpend?: number;
}

export interface DailySale {
  id: string;
  shopId: string;
  date: string; // "YYYY-MM-DD"
  grossTotal: number; // sum of all sales that day
  transactions: number; // number of sales
}

export interface TransactionItem {
  id: string;
  saleId: string;
  shopId: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number; // price * qty
}

// Simple event emitter so React components can subscribe to db changes
const listeners: Record<string, Set<Function>> = {};
function emit(event: string, payload?: any) {
  const set = listeners[event];
  if (!set) return;
  for (const cb of Array.from(set)) {
    try {
      cb(payload);
    } catch (e) {
      console.error("db listener error", e);
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

// Local in-memory caches to preserve existing API surface
const shopsCache: Shop[] = [];
const usersCache: User[] = [];
const productsCache: Product[] = [];
const salesCache: Sale[] = [];
const customersCache: Customer[] = [];
const dailySalesCache: DailySale[] = [];
const transactionItemsCache: TransactionItem[] = [];

// Helper functions
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const uid = () => crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

function toProductRow(r: any): Product {
  return {
    id: String(r.inventory_code || r.item_id || r.id || ""),
    shopId: currentShopId
      ? `shop_${currentShopId}`
      : r.shop_id
      ? `shop_${r.shop_id}`
      : "shop_1",
    name: r.name,
    category: r.category,
    price: typeof r.price === "number" ? r.price : Number(r.price || 0),
    stock: typeof r.stock === "number" ? r.stock : Number(r.stock || 0),
    barcode: r.barcode_id,
    imageUrl: r.image_url || r.imageUrl || "",
  } as Product;
}

async function fetchInitialData(shopId: string) {
  try {
    const metaRes = await fetch(`${API_BASE}/api/shop/${shopId}/meta`);
    if (metaRes.ok) {
      const body = await metaRes.json();
      const meta = body.meta || body;
      shopsCache.length = 0;
      shopsCache.push({
        id: `shop_${shopId}`,
        name: meta.shop_name || "Shop",
        address: meta.address || "",
      } as Shop);
      emit("shopMeta", { shopId, meta });
    }
  } catch (e) {
    console.warn("Failed to fetch shop meta", e);
  }
}

function ensureSocket(shopId: string) {
  if (socket && currentShopId === shopId) return socket;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  socket = (clientIo as any)(API_BASE, { query: { shopId } });
  currentShopId = shopId;

  socket.on("connect", () => {
    console.log("WS connected", socket?.id);
    socket?.emit("getInventory");
  });

  socket.on("inventorySnapshot", (payload: any) => {
    if (!payload || String(payload.shopId) !== String(shopId)) return;
    productsCache.length = 0;
    for (const r of payload.items) productsCache.push(toProductRow(r));
    emit("inventorySnapshot", { shopId, items: productsCache.slice() });
    emit("inventoryUpdated", { shopId, items: productsCache.slice() });
  });

  socket.on("inventoryUpdated", (payload: any) => {
    if (!payload || String(payload.shopId) !== String(shopId)) return;
    productsCache.length = 0;
    for (const r of payload.items) productsCache.push(toProductRow(r));
    emit("inventoryUpdated", { shopId, items: productsCache.slice() });
  });

  socket.on("connect_error", (err: any) =>
    console.error("WS connect error", err)
  );
  socket.on("disconnect", (reason: any) =>
    console.log("WS disconnected", reason)
  );

  return socket;
}

// Customers collection
const customers = {
  async upsert(
    input: Omit<Customer, "id" | "totalSpend"> & { totalSpendDelta?: number }
  ) {
    const key = (input.email?.toLowerCase() || input.phone || "").trim();
    let existing = key
      ? customersCache.find(
          (c) =>
            c.shopId === input.shopId &&
            ((input.email &&
              c.email?.toLowerCase() === input.email.toLowerCase()) ||
              (input.phone && c.phone === input.phone))
        )
      : undefined;

    const now = new Date().toISOString();
    if (existing) {
      existing.name = input.name || existing.name;
      existing.lastPurchaseAt = now;
      existing.totalSpend =
        (existing.totalSpend ?? 0) + (input.totalSpendDelta ?? 0);
      emit("customerUpdated", existing);
      return existing;
    }

    const created: Customer = {
      id: uid(),
      shopId: input.shopId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      lastPurchaseAt: now,
      totalSpend: input.totalSpendDelta ?? 0,
    };
    customersCache.push(created);
    emit("customerCreated", created);
    return created;
  },

  getByShopId(shopId: string) {
    return customersCache.filter((c) => c.shopId === shopId);
  },
};

// Daily sales collection
const daily_sales = {
  addOrIncrement(shopId: string, whenISO: string, amount: number) {
    const d = new Date(whenISO);
    const day = ymd(d);
    let row = dailySalesCache.find(
      (r) => r.shopId === shopId && r.date === day
    );

    if (!row) {
      row = {
        id: uid(),
        shopId,
        date: day,
        grossTotal: 0,
        transactions: 0,
      };
      dailySalesCache.push(row);
    }

    row.grossTotal += amount;
    row.transactions += 1;
    emit("dailySalesUpdated", row);
    return row;
  },

  getByShopId(shopId: string) {
    return dailySalesCache.filter((r) => r.shopId === shopId);
  },
};

// Transaction items collection
const transaction_items = {
  bulkCreate(items: Omit<TransactionItem, "id">[]) {
    const created = items.map((it) => ({ ...it, id: uid() }));
    transactionItemsCache.push(...created);
    emit("transactionItemsCreated", created);
    return created;
  },

  getBySaleId(saleId: string) {
    return transactionItemsCache.filter((t) => t.saleId === saleId);
  },
};

export const db = {
  // Event API
  on,
  off,
  // Initialization
  init: () => {
    // no-op for client
  },
  connectWebSocket: async (shopId: string) => {
    await fetchInitialData(shopId);
    ensureSocket(shopId);
  },
  // Shops
  shops: {
    getAll: (): Shop[] => shopsCache,
    getById: (id: string): Shop | undefined =>
      shopsCache.find((s) => s.id === id),
    create: async (shop: Omit<Shop, "id"> & { id?: string }): Promise<Shop> => {
      const shopId =
        (shop as any).id?.replace(/^shop_/, "") ||
        String(Math.floor(Date.now() / 1000));
      await fetch(`${API_BASE}/api/shop/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId, formData: shop }),
      });
      const newShop = { ...shop, id: `shop_${shopId}` } as Shop;
      shopsCache.push(newShop);
      emit("shopCreated", newShop);
      return newShop;
    },
  },
  users: {
    getAll: (): User[] => usersCache,
    getById: (id: string): User | undefined =>
      usersCache.find((u) => u.id === id),
    getByShopId: (shopId: string): User[] =>
      usersCache.filter((u) => u.shopId === shopId),
    create: async (user: Omit<User, "id">): Promise<User> => {
      const newUser = { ...user, id: `user_${Date.now()}` } as User;
      usersCache.push(newUser);
      emit("userCreated", newUser);
      return newUser;
    },
  },
  products: {
    getAll: (): Product[] => productsCache,
    getByShopId: (shopId: string): Product[] =>
      productsCache.filter((p) => p.shopId === shopId),
    getById: (id: string): Product | undefined =>
      productsCache.find((p) => p.id === id),
    create: async (
      product: Omit<Product, "id" | "shopId"> & { shopId?: string }
    ): Promise<Product> => {
      const shopId = product.shopId
        ? product.shopId.replace(/^shop_/, "")
        : currentShopId!;
      ensureSocket(shopId as string)?.emit("upsertProduct", product);
      const created: Product = {
        ...product,
        id: `prod_${Date.now()}`,
        shopId: `shop_${shopId}`,
      } as Product;
      productsCache.push(created);
      emit("productCreated", created);
      emit("inventoryUpdated", { shopId, items: productsCache.slice() });
      return created;
    },
    update: async (product: Product): Promise<Product> => {
      const shopId = product.shopId
        ? product.shopId.replace(/^shop_/, "")
        : currentShopId!;
      ensureSocket(shopId as string)?.emit("upsertProduct", product);
      const idx = productsCache.findIndex((p) => p.id === product.id);
      if (idx !== -1) productsCache[idx] = product;
      emit("productUpdated", product);
      emit("inventoryUpdated", { shopId, items: productsCache.slice() });
      return product;
    },
    updateStock: (productId: string, quantity: number): Product | undefined => {
      const idx = productsCache.findIndex((p) => p.id === productId);
      if (idx === -1) return undefined;
      productsCache[idx].stock = Math.max(
        0,
        productsCache[idx].stock + quantity
      );
      ensureSocket(productsCache[idx].shopId.replace(/^shop_/, ""))?.emit(
        "upsertProduct",
        productsCache[idx]
      );
      emit("productUpdated", productsCache[idx]);
      emit("inventoryUpdated", {
        shopId: productsCache[idx].shopId.replace(/^shop_/, ""),
        items: productsCache.slice(),
      });
      return productsCache[idx];
    },
  },
  sales: {
    getAll: (): Sale[] => salesCache,
    getByShopId: (shopId: string): Sale[] =>
      salesCache.filter((s) => s.shopId === shopId),
    getById: (id: string): Sale | undefined =>
      salesCache.find((s) => s.id === id),
    create: async (sale: Omit<Sale, "id">): Promise<Sale> => {
      const newSale = {
        ...sale,
        id: `sale_${Date.now()}`,
        timestamp: new Date().toISOString(),
      } as Sale;
      salesCache.push(newSale);
      emit("saleCreated", newSale);
      // update stocks locally and via WS
      newSale.items.forEach((item) => {
        db.products.updateStock(item.id, -item.quantity);
      });
      return newSale;
    },
  },
  // New collections
  customers,
  daily_sales,
  transaction_items,
};

export default db;
