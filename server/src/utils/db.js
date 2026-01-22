import path from "path";
import fs from "fs";
import Database from "better-sqlite3";

const DB_DIR =
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  path.resolve(process.cwd(), "../database");

function ensureDbDir() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

function sanitizeForFilename(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._+-]/g, "_");
}

function candidateDbFilenames(shopId) {
  const base = String(shopId).replace(/\.db$/i, "");
  const primary = `${base}.db`;
  const legacy = `shop_${base}.db`;
  return [primary, legacy];
}

function resolveExistingDbPath(shopId) {
  ensureDbDir();
  for (const fileName of candidateDbFilenames(shopId)) {
    const fullPath = path.join(DB_DIR, fileName);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

function dbPathForShop(shopId, { allowCreate = false } = {}) {
  ensureDbDir();
  if (allowCreate) {
    const base = String(shopId).replace(/\.db$/i, "");
    return path.join(DB_DIR, `${base}.db`);
  }
  const resolved = resolveExistingDbPath(shopId);
  if (resolved) {
    return resolved;
  }
  return path.join(DB_DIR, `${String(shopId).replace(/\.db$/i, "")}.db`);
}

function getDbFileName(shopId) {
  const resolved = resolveExistingDbPath(shopId);
  if (!resolved) {
    const base = String(shopId).replace(/\.db$/i, "");
    return `${base}.db`;
  }
  return path.basename(resolved);
}

function dbExists(shopId) {
  return Boolean(resolveExistingDbPath(shopId));
}

function openDb(shopId) {
  const existingPath = resolveExistingDbPath(shopId);
  if (!existingPath) {
    throw new Error(`Shop database not found for ${shopId}`);
  }
  const db = new Database(existingPath, { fileMustExist: true });
  db.pragma("journal_mode = WAL");
  return db;
}

function openDbIfExists(shopId) {
  const existingPath = resolveExistingDbPath(shopId);
  if (!existingPath) {
    return null;
  }
  const db = new Database(existingPath, { fileMustExist: true });
  db.pragma("journal_mode = WAL");
  return db;
}

function createShopDb(shopId, shopMeta) {
  const safeId = String(shopId).replace(/\.db$/i, "");
  if (/[\\/]/.test(safeId)) {
    throw new Error("Invalid shopId - path separators are not allowed");
  }

  const dbPath = dbPathForShop(safeId, { allowCreate: true });
  if (fs.existsSync(dbPath)) {
    throw new Error(`Database already exists for shop ${safeId}`);
  }

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  initSchema(db);
  if (shopMeta) {
    upsertShopMeta(db, safeId, shopMeta);
  }
  return db;
}

function initSchema(db) {
  const ddl = `
  CREATE TABLE IF NOT EXISTS shop_meta (
    shop_id TEXT PRIMARY KEY,
    shop_name TEXT,
    owner_name TEXT,
    owner_email TEXT,
    phone TEXT,
    shop_type TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT,
    business_license TEXT,
    tax_id TEXT,
    registration_number TEXT,
    currency TEXT,
    timezone TEXT,
    created_at DATETIME
  );
  
  CREATE TABLE IF NOT EXISTS shop_operating_hours (
    shop_id TEXT NOT NULL,
    day TEXT NOT NULL,
    open TEXT,
    close TEXT,
    closed INTEGER DEFAULT 0,
    PRIMARY KEY (shop_id, day)
  );
  
  CREATE TABLE IF NOT EXISTS shop_payment_methods (
    shop_id TEXT NOT NULL,
    method TEXT NOT NULL,
    PRIMARY KEY (shop_id, method)
  );
  
  CREATE TABLE IF NOT EXISTS inventory (
    item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_code TEXT UNIQUE,
    barcode_id TEXT UNIQUE,
    name TEXT NOT NULL,
    category TEXT,
    sku TEXT UNIQUE,
    price DECIMAL(10,2),
    stock INTEGER DEFAULT 0,
    stock_last_month INTEGER DEFAULT 0,
    restock_suggestion INTEGER DEFAULT 0,
    image_url TEXT,
    created_at DATETIME,
    updated_at DATETIME
  );
  
  CREATE TABLE IF NOT EXISTS customers (
    customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    phone TEXT,
    total_spent DECIMAL(10,2) DEFAULT 0,
    visit_count INTEGER DEFAULT 0,
    last_visit DATETIME,
    points_balance INTEGER DEFAULT 0, -- Added points balance
    created_at DATETIME
  );
  
  CREATE TABLE IF NOT EXISTS transactions (
    transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_id TEXT UNIQUE,
    transaction_code TEXT UNIQUE,
    customer_id INTEGER,
    subtotal DECIMAL(10,2),
    discount DECIMAL(10,2),
    tax DECIMAL(10,2),
    total DECIMAL(10,2),
    payment_method TEXT,
    created_at DATETIME,
    FOREIGN KEY(customer_id) REFERENCES customers(customer_id)
  );
  
  CREATE TABLE IF NOT EXISTS transaction_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER,
    item_id INTEGER,
    inventory_code TEXT,
    quantity INTEGER,
    unit_price DECIMAL(10,2),
    subtotal DECIMAL(10,2),
    FOREIGN KEY(transaction_id) REFERENCES transactions(transaction_id),
    FOREIGN KEY(item_id) REFERENCES inventory(item_id)
  );
  
  CREATE TABLE IF NOT EXISTS daily_sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id TEXT,
    date TEXT,
    total_sales DECIMAL(10,2),
    transactions_count INTEGER,
    top_item TEXT,
    UNIQUE(shop_id, date)
  );
  
  CREATE TABLE IF NOT EXISTS inventory_forecast (
    item_id INTEGER PRIMARY KEY,
    item_name TEXT,
    avg_daily_sales INTEGER,
    recommended_stock INTEGER,
    suggested_restock_date TEXT
  );

  -- New Business Rules Tables
  CREATE TABLE IF NOT EXISTS business_rules_loyalty (
    shop_id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    earn_rate DECIMAL(10,2) DEFAULT 1.0,
    redeem_rate DECIMAL(10,2) DEFAULT 0.01,
    min_points INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS business_rules_discounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id TEXT,
    name TEXT,
    type TEXT,
    value DECIMAL(10,2)
  );

  CREATE TABLE IF NOT EXISTS business_rules_taxes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id TEXT,
    name TEXT,
    rate DECIMAL(10,2),
    is_default INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS business_rules_surcharges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id TEXT,
    min_amount DECIMAL(10,2),
    type TEXT,
    value DECIMAL(10,2)
  );
  `;
  db.exec(ddl);

  // Safe migration for existing tables if column missing
  try {
    const info = db.prepare("PRAGMA table_info(customers)").all();
    if (!info.some(c => c.name === 'points_balance')) {
        db.exec("ALTER TABLE customers ADD COLUMN points_balance INTEGER DEFAULT 0");
    }
  } catch (e) {
    // Ignore if already exists
  }
}

function upsertShopMeta(db, shopId, meta = {}) {
  const upsert = db.prepare(
    `INSERT INTO shop_meta (
       shop_id, shop_name, owner_name, owner_email, phone, shop_type,
       address, city, state, zip_code, country,
       business_license, tax_id, registration_number,
       currency, timezone, created_at
     ) VALUES (
       @shop_id, @shop_name, @owner_name, @owner_email, @phone, @shop_type,
       @address, @city, @state, @zip_code, @country,
       @business_license, @tax_id, @registration_number,
       @currency, @timezone, @created_at
     )
     ON CONFLICT(shop_id) DO UPDATE SET
       shop_name=excluded.shop_name,
       owner_name=excluded.owner_name,
       owner_email=excluded.owner_email,
       phone=excluded.phone,
       shop_type=excluded.shop_type,
       address=excluded.address,
       city=excluded.city,
       state=excluded.state,
       zip_code=excluded.zip_code,
       country=excluded.country,
       business_license=excluded.business_license,
       tax_id=excluded.tax_id,
       registration_number=excluded.registration_number,
       currency=excluded.currency,
       timezone=excluded.timezone`
  );
  upsert.run({
    shop_id: shopId,
    shop_name: meta.shop_name ?? null,
    owner_name: meta.owner_name ?? null,
    owner_email: meta.owner_email ?? null,
    phone: meta.phone ?? null,
    shop_type: meta.shop_type ?? null,
    address: meta.address ?? null,
    city: meta.city ?? null,
    state: meta.state ?? null,
    zip_code: meta.zip_code ?? null,
    country: meta.country ?? null,
    business_license: meta.business_license ?? null,
    tax_id: meta.tax_id ?? null,
    registration_number: meta.registration_number ?? null,
    currency: meta.currency ?? null,
    timezone: meta.timezone ?? null,
    created_at: meta.created_at ?? new Date().toISOString(),
  });
}

function upsertOperatingHours(db, shopId, operatingHours = {}) {
  const upsert = db.prepare(
    `INSERT INTO shop_operating_hours (shop_id, day, open, close, closed)
     VALUES (@shop_id, @day, @open, @close, @closed)
     ON CONFLICT(shop_id, day) DO UPDATE SET
       open=excluded.open,
       close=excluded.close,
       closed=excluded.closed`
  );
  const txn = db.transaction((entries) => {
    for (const e of entries) upsert.run(e);
  });
  const days = Object.keys(operatingHours);
  const rows = days.map((d) => ({
    shop_id: shopId,
    day: d,
    open: operatingHours[d]?.open ?? null,
    close: operatingHours[d]?.close ?? null,
    closed: operatingHours[d]?.closed ? 1 : 0,
  }));
  if (rows.length) txn(rows);
}

function replacePaymentMethods(db, shopId, methods = []) {
  const del = db.prepare(`DELETE FROM shop_payment_methods WHERE shop_id = ?`);
  const ins = db.prepare(
    `INSERT INTO shop_payment_methods (shop_id, method) VALUES (?, ?)`
  );
  const txn = db.transaction((list) => {
    del.run(shopId);
    for (const m of list) ins.run(shopId, String(m));
  });
  txn(Array.isArray(methods) ? methods : []);
}

function insertInventoryRows(db, rows) {
  const insert = db.prepare(`
    INSERT INTO inventory (
      inventory_code, barcode_id, name, category, sku, price, stock, stock_last_month, restock_suggestion, image_url, created_at, updated_at
    ) VALUES (@inventory_code, @barcode_id, @name, @category, @sku, @price, @stock, @stock_last_month, @restock_suggestion, @image_url, @created_at, @updated_at)
    ON CONFLICT(inventory_code) DO UPDATE SET
      barcode_id=excluded.barcode_id,
      name=excluded.name,
      category=excluded.category,
      sku=excluded.sku,
      price=excluded.price,
      stock=excluded.stock,
      stock_last_month=excluded.stock_last_month,
      restock_suggestion=excluded.restock_suggestion,
      image_url=excluded.image_url,
      updated_at=excluded.updated_at
  `);
  const txn = db.transaction((list) => {
    for (const r of list) insert.run(r);
  });
  txn(rows);
}

export {
  sanitizeForFilename,
  dbPathForShop,
  createShopDb,
  openDb,
  openDbIfExists,
  dbExists,
  getDbFileName,
  initSchema,
  insertInventoryRows,
  upsertShopMeta,
  upsertOperatingHours,
  replacePaymentMethods,
};