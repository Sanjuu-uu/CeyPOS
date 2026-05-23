// Global receipt-token store. Lives next to per-shop databases so it benefits
// from the same persistent volume in production, and stays isolated from
// tenant data. Snapshots are self-contained so public viewing never touches
// shop DBs.

import path from "path";
import fs from "fs";
import crypto from "crypto";
import Database from "better-sqlite3";

const TOKEN_DB_DIRECTORY =
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  (process.env.NODE_ENV === "production" && fs.existsSync("/data")
    ? "/data"
    : null) ||
  path.resolve(process.cwd(), "../database");

const TOKEN_DB_FILE = path.join(TOKEN_DB_DIRECTORY, "receipt-tokens.db");

let cachedDb = null;

function getDb() {
  if (cachedDb) return cachedDb;
  if (!fs.existsSync(TOKEN_DB_DIRECTORY)) {
    fs.mkdirSync(TOKEN_DB_DIRECTORY, { recursive: true });
  }
  const db = new Database(TOKEN_DB_FILE);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.exec(`
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
      ON receipt_tokens(shop_id);
    CREATE INDEX IF NOT EXISTS idx_receipt_tokens_txcode
      ON receipt_tokens(shop_id, transaction_code);
  `);

  // Idempotent migration for pre-existing databases that were created before
  // the `recipient_phone` column existed.
  const cols = db
    .prepare("PRAGMA table_info(receipt_tokens)")
    .all()
    .map((c) => c.name);
  if (!cols.includes("recipient_phone")) {
    db.exec("ALTER TABLE receipt_tokens ADD COLUMN recipient_phone TEXT");
  }

  cachedDb = db;
  return cachedDb;
}

function generateToken() {
  // 24 random bytes → 32 char base64url. Sufficiently unguessable.
  return crypto.randomBytes(24).toString("base64url");
}

export function findOrCreateReceiptToken({
  shopId,
  transactionCode,
  receiptId,
  snapshot,
}) {
  const db = getDb();
  if (transactionCode) {
    const existing = db
      .prepare(
        "SELECT token FROM receipt_tokens WHERE shop_id = ? AND transaction_code = ?",
      )
      .get(shopId, transactionCode);
    if (existing) {
      // Refresh snapshot so future views show the latest data (e.g. customer
      // email updated, points adjustments).
      db.prepare(
        `UPDATE receipt_tokens
            SET snapshot_json = ?,
                receipt_id = COALESCE(?, receipt_id)
          WHERE token = ?`,
      ).run(JSON.stringify(snapshot), receiptId || null, existing.token);
      return existing.token;
    }
  }

  const token = generateToken();
  db.prepare(
    `INSERT INTO receipt_tokens
       (token, shop_id, transaction_code, receipt_id, snapshot_json)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    token,
    shopId,
    transactionCode || null,
    receiptId || null,
    JSON.stringify(snapshot),
  );
  return token;
}

export function recordSend({ token, recipientEmail, recipientPhone }) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE receipt_tokens
        SET recipient_email = COALESCE(?, recipient_email),
            recipient_phone = COALESCE(?, recipient_phone),
            sent_at = COALESCE(sent_at, ?),
            last_sent_at = ?,
            send_count = COALESCE(send_count, 0) + 1
      WHERE token = ?`,
  ).run(recipientEmail || null, recipientPhone || null, now, now, token);
}

export function getReceiptByToken(token) {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM receipt_tokens WHERE token = ?")
    .get(token);
  if (!row) return null;
  let snapshot = null;
  try {
    snapshot = JSON.parse(row.snapshot_json);
  } catch {
    snapshot = null;
  }
  return { ...row, snapshot };
}

export function recordView({ token }) {
  const db = getDb();
  db.prepare(
    `UPDATE receipt_tokens
        SET view_count = COALESCE(view_count, 0) + 1,
            last_viewed_at = ?
      WHERE token = ?`,
  ).run(new Date().toISOString(), token);
}
