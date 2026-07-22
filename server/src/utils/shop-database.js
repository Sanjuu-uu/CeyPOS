import path from "path";
import fs from "fs";
import Database from "better-sqlite3";

function resolveShopDatabaseDirectory() {
  const explicitPath = process.env.RAILWAY_VOLUME_MOUNT_PATH || process.env.APP_DATABASE_PATH;
  if (explicitPath) {
    return path.resolve(explicitPath);
  }

  const cwd = process.cwd();
  const appDatabaseDir = "/app/database";
  const repoDatabaseDir = path.resolve(cwd, "database");
  const serverParentDatabaseDir = path.resolve(cwd, "../database");

  if (process.env.NODE_ENV === "production" && (fs.existsSync(appDatabaseDir) || cwd.startsWith("/app"))) {
    return appDatabaseDir;
  }

  if (fs.existsSync("/data")) {
    return "/data";
  }

  if (cwd.endsWith("/server") || cwd.endsWith("/mcp-server")) {
    return serverParentDatabaseDir;
  }

  return repoDatabaseDir;
}

const SHOP_DATABASE_DIRECTORY = resolveShopDatabaseDirectory();

function ensureShopDatabaseDirectory() {
  if (!fs.existsSync(SHOP_DATABASE_DIRECTORY)) {
    fs.mkdirSync(SHOP_DATABASE_DIRECTORY, { recursive: true });
  }
}

function sanitizeShopIdentifier(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._+-]/g, "_");
}

function candidateDatabaseFilenames(shopId) {
  const base = String(shopId).replace(/\.db$/i, "");
  const stripped = base.startsWith("shop_") ? base.slice("shop_".length) : base;
  const primary = `${stripped}.db`;
  const legacy = `shop_${stripped}.db`;
  return [primary, legacy];
}

function resolveExistingShopDatabasePath(shopId) {
  ensureShopDatabaseDirectory();
  for (const fileName of candidateDatabaseFilenames(shopId)) {
    const fullPath = path.join(SHOP_DATABASE_DIRECTORY, fileName);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

function getShopDatabasePath(shopId, { allowCreate = false } = {}) {
  ensureShopDatabaseDirectory();

  if (!allowCreate) {
    const resolved = resolveExistingShopDatabasePath(shopId);
    if (resolved) {
      return resolved;
    }
  }

  const base = String(shopId).replace(/\.db$/i, "");
  return path.join(SHOP_DATABASE_DIRECTORY, `${base}.db`);
}

function shopDatabaseExists(shopId) {
  return Boolean(resolveExistingShopDatabasePath(shopId));
}

function getShopDatabaseFileName(shopId) {
  const resolved = resolveExistingShopDatabasePath(shopId);
  if (!resolved) {
    const base = String(shopId).replace(/\.db$/i, "");
    return `${base}.db`;
  }
  return path.basename(resolved);
}

function openShopDatabase(shopId) {
  const existingPath = resolveExistingShopDatabasePath(shopId);
  if (!existingPath) {
    throw new Error(`Shop database not found for ${shopId}`);
  }
  const db = new Database(existingPath, { fileMustExist: true });
  db.pragma("journal_mode = WAL");
  initializeShopDatabaseSchema(db);
  return db;
}

function openShopDatabaseIfExists(shopId) {
  const existingPath = resolveExistingShopDatabasePath(shopId);
  if (!existingPath) {
    return null;
  }
  const db = new Database(existingPath, { fileMustExist: true });
  db.pragma("journal_mode = WAL");
  initializeShopDatabaseSchema(db);
  return db;
}

function resolveShopIdByOwnerEmail(ownerEmail) {
  const normalizedEmail = String(ownerEmail || "").trim().toLowerCase();
  if (!normalizedEmail) return null;

  ensureShopDatabaseDirectory();
  const entries = fs.readdirSync(SHOP_DATABASE_DIRECTORY, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".db")) continue;

    const fullPath = path.join(SHOP_DATABASE_DIRECTORY, entry.name);
    let db;
    try {
      db = new Database(fullPath, { fileMustExist: true });
      db.pragma("journal_mode = WAL");
      initializeShopDatabaseSchema(db);
      const row = db
        .prepare("SELECT shop_id, owner_email FROM shop_meta WHERE lower(owner_email) = lower(?) LIMIT 1")
        .get(normalizedEmail);
      if (row?.shop_id) {
        return {
          shopId: row.shop_id,
          ownerEmail: row.owner_email || normalizedEmail,
          dbFileName: entry.name,
        };
      }
    } catch {
      // ignore unreadable databases while searching by owner email
    } finally {
      if (db) {
        try {
          db.close();
        } catch {
          // ignore
        }
      }
    }
  }

  return null;
}

function initializeShopDatabaseSchema(db) {
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
    points_balance INTEGER DEFAULT 0,
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

  CREATE TABLE IF NOT EXISTS mobile_sessions (
    session_id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    session_type TEXT NOT NULL,
    status TEXT NOT NULL,
    auth_token TEXT NOT NULL,
    created_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    created_by_email TEXT,
    created_by_user_id TEXT,
    last_seen_at DATETIME,
    last_seen_email TEXT,
    last_seen_user_id TEXT,
    device_meta TEXT
  );

  CREATE TABLE IF NOT EXISTS mobile_scan_events (
    event_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    shop_id TEXT NOT NULL,
    session_type TEXT NOT NULL,
    barcode TEXT NOT NULL,
    status TEXT NOT NULL,
    product_code TEXT,
    socket_id TEXT,
    created_at DATETIME NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_mobile_scan_events_session_created
    ON mobile_scan_events (session_id, created_at);

  CREATE TABLE IF NOT EXISTS analytics_conversations (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    user_email TEXT,
    title TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'lite',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
  );

  CREATE TABLE IF NOT EXISTS analytics_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    shop_id TEXT NOT NULL,
    sender TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL,
    attachments TEXT,
    visualizations TEXT,
    metadata TEXT,
    created_at DATETIME NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_analytics_conversations_shop_updated
    ON analytics_conversations (shop_id, updated_at);

  CREATE INDEX IF NOT EXISTS idx_analytics_messages_conversation_created
    ON analytics_messages (conversation_id, created_at);

  CREATE INDEX IF NOT EXISTS idx_analytics_messages_shop
    ON analytics_messages (shop_id);

  CREATE TABLE IF NOT EXISTS receipt_tokens (
    token TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    transaction_code TEXT,
    receipt_id TEXT,
    recipient_email TEXT,
    recipient_phone TEXT,
    snapshot_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME,
    last_sent_at DATETIME,
    send_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    last_viewed_at DATETIME
  );

  CREATE INDEX IF NOT EXISTS idx_receipt_tokens_shop
    ON receipt_tokens (shop_id);

  CREATE INDEX IF NOT EXISTS idx_receipt_tokens_txcode
    ON receipt_tokens (shop_id, transaction_code);

  CREATE TABLE IF NOT EXISTS shop_members (
    member_id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    clerk_user_id TEXT,
    email TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'cashier',
    status TEXT NOT NULL DEFAULT 'pending',
    pro_team_seat INTEGER DEFAULT 0,
    pin_hash TEXT,
    invited_by_email TEXT,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    last_login_at DATETIME,
    UNIQUE(shop_id, email)
  );

  CREATE TABLE IF NOT EXISTS shop_terminals (
    terminal_id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    terminal_type TEXT NOT NULL,
    label TEXT,
    status TEXT NOT NULL,
    device_fingerprint TEXT,
    device_meta TEXT,
    paired_by_member_id TEXT,
    approved_by_member_id TEXT,
    terminal_token_hash TEXT,
    created_at DATETIME NOT NULL,
    last_seen_at DATETIME,
    revoked_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS terminal_pairing_codes (
    pairing_id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    code TEXT NOT NULL,
    status TEXT NOT NULL,
    created_by_member_id TEXT,
    target_terminal_id TEXT,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_pairing_codes_shop_code
    ON terminal_pairing_codes (shop_id, code);

  CREATE TABLE IF NOT EXISTS terminal_pairing_requests (
    request_id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    pairing_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    device_meta TEXT,
    status TEXT NOT NULL,
    requested_at DATETIME NOT NULL,
    resolved_at DATETIME,
    resolved_by_member_id TEXT
  );

  CREATE TABLE IF NOT EXISTS member_daily_stats (
    shop_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    date TEXT NOT NULL,
    transactions_count INTEGER DEFAULT 0,
    total_sales DECIMAL(10,2) DEFAULT 0,
    items_sold INTEGER DEFAULT 0,
    PRIMARY KEY (shop_id, member_id, date)
  );

  CREATE TABLE IF NOT EXISTS member_shifts (
    shift_id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    terminal_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    started_at DATETIME NOT NULL,
    ended_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS phone_verification_otps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    normalized_phone TEXT NOT NULL,
    code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    failed_attempts INTEGER DEFAULT 0,
    created_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    verified_at DATETIME,
    rate_limit_expires_at DATETIME,
    UNIQUE(user_email, normalized_phone)
  );

  CREATE INDEX IF NOT EXISTS idx_phone_verification_expiry
    ON phone_verification_otps (expires_at);

  CREATE INDEX IF NOT EXISTS idx_phone_verification_user_email
    ON phone_verification_otps (user_email);

  CREATE TABLE IF NOT EXISTS phone_verification_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id TEXT,
    user_email TEXT NOT NULL,
    normalized_phone TEXT NOT NULL,
    action TEXT NOT NULL,
    result TEXT NOT NULL,
    error_code TEXT,
    error_message TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_phone_verification_audit_user
    ON phone_verification_audit (user_email, created_at);

  CREATE INDEX IF NOT EXISTS idx_phone_verification_audit_phone
    ON phone_verification_audit (normalized_phone, created_at);

  CREATE TABLE IF NOT EXISTS notifications (
    notification_id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    category TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    link_path TEXT,
    source_entity TEXT,
    source_action TEXT,
    source_change_id TEXT,
    payload_json TEXT,
    created_at DATETIME NOT NULL,
    read_at DATETIME,
    delivered_at DATETIME
  );

  CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
    ON notifications (shop_id, recipient_email, created_at DESC);

  CREATE TABLE IF NOT EXISTS notification_preferences (
    shop_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    email_notifications INTEGER NOT NULL DEFAULT 1,
    in_app_notifications INTEGER NOT NULL DEFAULT 1,
    low_stock_alerts INTEGER NOT NULL DEFAULT 1,
    daily_reports INTEGER NOT NULL DEFAULT 0,
    sales_alerts INTEGER NOT NULL DEFAULT 1,
    system_updates INTEGER NOT NULL DEFAULT 1,
    quiet_hours_start TEXT,
    quiet_hours_end TEXT,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (shop_id, user_email)
  );
  `;

  db.exec(ddl);

  try {
    const info = db.prepare("PRAGMA table_info(customers)").all();
    if (!info.some((column) => column.name === "points_balance")) {
      db.exec("ALTER TABLE customers ADD COLUMN points_balance INTEGER DEFAULT 0");
    }
  } catch (error) {
    // ignore if migration already applied
  }

  try {
    const cols = db
      .prepare("PRAGMA table_info(receipt_tokens)")
      .all()
      .map((c) => c.name);
    if (cols.length && !cols.includes("recipient_phone")) {
      db.exec("ALTER TABLE receipt_tokens ADD COLUMN recipient_phone TEXT");
    }
  } catch (error) {
    // ignore if migration already applied
  }

  try {
    const cols = db
      .prepare("PRAGMA table_info(analytics_messages)")
      .all()
      .map((c) => c.name);
    if (cols.length && !cols.includes("metadata")) {
      db.exec("ALTER TABLE analytics_messages ADD COLUMN metadata TEXT");
    }
  } catch (error) {
    // ignore if migration already applied
  }

  try {
    const cols = db
      .prepare("PRAGMA table_info(analytics_conversations)")
      .all()
      .map((c) => c.name);
    if (cols.length && !cols.includes("user_email")) {
      db.exec("ALTER TABLE analytics_conversations ADD COLUMN user_email TEXT");
    }
    if (cols.length && !cols.includes("mode")) {
      db.exec("ALTER TABLE analytics_conversations ADD COLUMN mode TEXT NOT NULL DEFAULT 'lite'");
    }
  } catch (error) {
    // ignore if migration already applied
  }

  runTeamWorkflowColumnMigrations(db);
}

function runTeamWorkflowColumnMigrations(db) {
  const addColumnIfMissing = (table, column, definition) => {
    try {
      const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
      if (cols.length && !cols.includes(column)) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      }
    } catch {
      // ignore
    }
  };

  addColumnIfMissing("shop_meta", "plan_tier", "TEXT DEFAULT 'free'");
  addColumnIfMissing("shop_meta", "max_register_terminals", "INTEGER DEFAULT 0");
  addColumnIfMissing("shop_meta", "max_team_members", "INTEGER DEFAULT 1");
  addColumnIfMissing("shop_meta", "pro_team_seats", "INTEGER DEFAULT 0");
  addColumnIfMissing("shop_meta", "ai_enabled", "INTEGER DEFAULT 0");
  addColumnIfMissing("shop_meta", "ai_mode", "TEXT");

  addColumnIfMissing("transactions", "terminal_id", "TEXT");
  addColumnIfMissing("transactions", "served_by_member_id", "TEXT");
  addColumnIfMissing("transactions", "served_by_display_name", "TEXT");
  addColumnIfMissing("transactions", "served_by_role", "TEXT");

  addColumnIfMissing("mobile_sessions", "created_by_member_id", "TEXT");
  addColumnIfMissing("mobile_sessions", "terminal_id", "TEXT");
  addColumnIfMissing("mobile_sessions", "scan_url", "TEXT");

  addColumnIfMissing("analytics_conversations", "member_id", "TEXT");
  addColumnIfMissing("analytics_conversations", "scope", "TEXT DEFAULT 'shop'");
}

function createShopDatabase(shopId, shopMeta) {
  const safeId = String(shopId).replace(/\.db$/i, "");
  if (/[\\/]/.test(safeId)) {
    throw new Error("Invalid shopId - path separators are not allowed");
  }

  const dbPath = getShopDatabasePath(safeId, { allowCreate: true });
  if (fs.existsSync(dbPath)) {
    throw new Error(`Database already exists for shop ${safeId}`);
  }

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  initializeShopDatabaseSchema(db);
  if (shopMeta) {
    upsertShopMetadata(db, safeId, shopMeta);
  }
  return db;
}

function upsertShopMetadata(db, shopId, meta = {}) {
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

function upsertShopOperatingHours(db, shopId, operatingHours = {}) {
  const upsert = db.prepare(
    `INSERT INTO shop_operating_hours (shop_id, day, open, close, closed)
     VALUES (@shop_id, @day, @open, @close, @closed)
     ON CONFLICT(shop_id, day) DO UPDATE SET
       open=excluded.open,
       close=excluded.close,
       closed=excluded.closed`
  );
  const txn = db.transaction((entries) => {
    for (const entry of entries) upsert.run(entry);
  });
  const days = Object.keys(operatingHours);
  const rows = days.map((day) => ({
    shop_id: shopId,
    day,
    open: operatingHours[day]?.open ?? null,
    close: operatingHours[day]?.close ?? null,
    closed: operatingHours[day]?.closed ? 1 : 0,
  }));
  if (rows.length) txn(rows);
}

function replaceShopPaymentMethods(db, shopId, methods = []) {
  const del = db.prepare(`DELETE FROM shop_payment_methods WHERE shop_id = ?`);
  const ins = db.prepare(
    `INSERT INTO shop_payment_methods (shop_id, method) VALUES (?, ?)`
  );
  const txn = db.transaction((list) => {
    del.run(shopId);
    for (const method of list) ins.run(shopId, String(method));
  });
  txn(Array.isArray(methods) ? methods : []);
}

function ensureAllShopDatabasesSchema() {
  ensureShopDatabaseDirectory();
  if (!fs.existsSync(SHOP_DATABASE_DIRECTORY)) return [];
  const initialized = [];
  for (const fileName of fs.readdirSync(SHOP_DATABASE_DIRECTORY)) {
    if (!fileName.endsWith(".db")) continue;
    if (fileName === "receipt-tokens.db" || fileName === "import-catalog.db") continue;
    const fullPath = path.join(SHOP_DATABASE_DIRECTORY, fileName);
    try {
      const db = new Database(fullPath, { fileMustExist: true });
      db.pragma("journal_mode = WAL");
      initializeShopDatabaseSchema(db);
      db.close();
      initialized.push(fileName);
    } catch (err) {
      console.warn(
        `ensureAllShopDatabasesSchema: failed for ${fileName}:`,
        err?.message || err,
      );
    }
  }
  return initialized;
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
    for (const row of list) insert.run(row);
  });
  txn(rows);
}

export {
  SHOP_DATABASE_DIRECTORY,
  ensureShopDatabaseDirectory,
  sanitizeShopIdentifier,
  candidateDatabaseFilenames,
  resolveExistingShopDatabasePath,
  getShopDatabasePath,
  shopDatabaseExists,
  getShopDatabaseFileName,
  openShopDatabase,
  openShopDatabaseIfExists,
  resolveShopIdByOwnerEmail,
  createShopDatabase,
  initializeShopDatabaseSchema,
  ensureAllShopDatabasesSchema,
  upsertShopMetadata,
  upsertShopOperatingHours,
  replaceShopPaymentMethods,
  insertInventoryRows,
};

// Backward-compatible export aliases (will be removed in a future cleanup)
export {
  sanitizeShopIdentifier as sanitizeForFilename,
  getShopDatabasePath as dbPathForShop,
  createShopDatabase as createShopDb,
  openShopDatabase as openDb,
  openShopDatabaseIfExists as openDbIfExists,
  shopDatabaseExists as dbExists,
  getShopDatabaseFileName as getDbFileName,
  initializeShopDatabaseSchema as initSchema,
  upsertShopMetadata as upsertShopMeta,
  upsertShopOperatingHours as upsertOperatingHours,
  replaceShopPaymentMethods as replacePaymentMethods,
};
