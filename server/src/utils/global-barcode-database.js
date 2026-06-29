import path from "path";
import Database from "better-sqlite3";
import {
  SHOP_DATABASE_DIRECTORY,
  ensureShopDatabaseDirectory,
} from "./shop-database.js";

const GLOBAL_BARCODE_DATABASE_FILE = "import-catalog.db";

function getGlobalBarcodeDatabasePath() {
  ensureShopDatabaseDirectory();
  return path.join(SHOP_DATABASE_DIRECTORY, GLOBAL_BARCODE_DATABASE_FILE);
}

function initializeGlobalBarcodeSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS global_barcode_products (
      barcode_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      sku TEXT,
      price DECIMAL(10,2),
      image_url TEXT,
      first_seen_shop_id TEXT,
      last_seen_shop_id TEXT,
      first_seen_at DATETIME NOT NULL,
      last_seen_at DATETIME NOT NULL,
      seen_count INTEGER DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_global_barcode_products_name
      ON global_barcode_products (name COLLATE NOCASE);
  `);
}

function openGlobalBarcodeDatabase() {
  const db = new Database(getGlobalBarcodeDatabasePath());
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  initializeGlobalBarcodeSchema(db);
  return db;
}

function normalizeBarcode(value) {
  return String(value || "").replace(/\s+/g, "").trim();
}

function lookupGlobalBarcodeProduct(barcode) {
  const clean = normalizeBarcode(barcode);
  if (!clean) return null;

  const db = openGlobalBarcodeDatabase();
  try {
    return db
      .prepare(
        `SELECT *
         FROM global_barcode_products
         WHERE barcode_id = ?
         LIMIT 1`,
      )
      .get(clean) || null;
  } finally {
    db.close();
  }
}

function upsertGlobalBarcodeProducts(rows = [], options = {}) {
  const cleanRows = rows
    .map((row) => ({
      barcode_id: normalizeBarcode(row.barcode_id ?? row.barcodeId ?? row.barcode),
      name: String(row.name || "").trim(),
      category: row.category ? String(row.category).trim() : null,
      sku: row.sku ? String(row.sku).trim() : null,
      price:
        row.price === undefined || row.price === null || row.price === ""
          ? null
          : Number(row.price),
      image_url: row.image_url ?? row.imageUrl ?? null,
    }))
    .filter((row) => row.barcode_id && row.name);

  if (!cleanRows.length) return [];

  const now = new Date().toISOString();
  const shopId = options.shopId ? String(options.shopId) : null;
  const db = openGlobalBarcodeDatabase();
  try {
    const stmt = db.prepare(`
      INSERT INTO global_barcode_products (
        barcode_id, name, category, sku, price, image_url,
        first_seen_shop_id, last_seen_shop_id, first_seen_at, last_seen_at, seen_count
      ) VALUES (
        @barcode_id, @name, @category, @sku, @price, @image_url,
        @shop_id, @shop_id, @now, @now, 1
      )
      ON CONFLICT(barcode_id) DO UPDATE SET
        name = excluded.name,
        category = COALESCE(excluded.category, global_barcode_products.category),
        sku = COALESCE(excluded.sku, global_barcode_products.sku),
        price = COALESCE(excluded.price, global_barcode_products.price),
        image_url = COALESCE(excluded.image_url, global_barcode_products.image_url),
        last_seen_shop_id = excluded.last_seen_shop_id,
        last_seen_at = excluded.last_seen_at,
        seen_count = COALESCE(global_barcode_products.seen_count, 0) + 1
    `);
    const txn = db.transaction((items) => {
      for (const item of items) {
        stmt.run({ ...item, shop_id: shopId, now });
      }
    });
    txn(cleanRows);

    const placeholders = cleanRows.map(() => "?").join(",");
    return db
      .prepare(
        `SELECT *
         FROM global_barcode_products
         WHERE barcode_id IN (${placeholders})
         ORDER BY name COLLATE NOCASE`,
      )
      .all(...cleanRows.map((row) => row.barcode_id));
  } finally {
    db.close();
  }
}

export {
  getGlobalBarcodeDatabasePath,
  openGlobalBarcodeDatabase,
  lookupGlobalBarcodeProduct,
  upsertGlobalBarcodeProducts,
};
