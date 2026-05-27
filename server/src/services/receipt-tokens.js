// Receipt-token store. Tokens now live inside each shop's database so a
// deployment ships a single SQLite file per tenant. Public lookups by token
// alone (no shopId in the URL) walk all shop DBs in the configured directory.

import path from "path";
import fs from "fs";
import crypto from "crypto";
import Database from "better-sqlite3";
import {
  SHOP_DATABASE_DIRECTORY,
  openShopDatabase,
  openShopDatabaseIfExists,
} from "../utils/shop-database.js";

function listShopDatabaseFiles() {
  if (!fs.existsSync(SHOP_DATABASE_DIRECTORY)) return [];
  return fs
    .readdirSync(SHOP_DATABASE_DIRECTORY)
    .filter(
      (name) =>
        name.endsWith(".db") &&
        !name.endsWith("-wal") &&
        !name.endsWith("-shm") &&
        name !== "receipt-tokens.db",
    );
}

function shopIdFromFilename(fileName) {
  // Mirror the convention used by shop-database.js: stored file is `${shopId}.db`
  // (optionally with a `shop_` legacy prefix).
  let base = fileName.replace(/\.db$/i, "");
  if (base.startsWith("shop_")) base = base.slice("shop_".length);
  return base;
}

function normalizeShopId(shopId) {
  const base = String(shopId || "").replace(/\.db$/i, "");
  return base.startsWith("shop_") ? base.slice("shop_".length) : base;
}

function withTokenDb(token, callback) {
  for (const fileName of listShopDatabaseFiles()) {
    const shopId = shopIdFromFilename(fileName);
    const db = openShopDatabaseIfExists(shopId);
    if (!db) continue;
    const row = db
      .prepare("SELECT 1 FROM receipt_tokens WHERE token = ? LIMIT 1")
      .get(token);
    if (row) {
      return callback(db);
    }
  }
  return undefined;
}

function generateToken() {
  return crypto.randomBytes(24).toString("base64url");
}

export function findOrCreateReceiptToken({
  shopId,
  transactionCode,
  receiptId,
  snapshot,
}) {
  const normalizedShopId = normalizeShopId(shopId);
  const db = openShopDatabase(normalizedShopId);
  if (transactionCode) {
    const existing = db
      .prepare(
        "SELECT token FROM receipt_tokens WHERE shop_id = ? AND transaction_code = ?",
      )
      .get(normalizedShopId, transactionCode);
    if (existing) {
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
    normalizedShopId,
    transactionCode || null,
    receiptId || null,
    JSON.stringify(snapshot),
  );
  return token;
}

export function recordSend({ token, recipientEmail, recipientPhone }) {
  const now = new Date().toISOString();
  withTokenDb(token, (db) => {
    db.prepare(
      `UPDATE receipt_tokens
          SET recipient_email = COALESCE(?, recipient_email),
              recipient_phone = COALESCE(?, recipient_phone),
              sent_at = COALESCE(sent_at, ?),
              last_sent_at = ?,
              send_count = COALESCE(send_count, 0) + 1
        WHERE token = ?`,
    ).run(recipientEmail || null, recipientPhone || null, now, now, token);
  });
}

export function getReceiptByToken(token) {
  return (
    withTokenDb(token, (db) => {
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
    }) || null
  );
}

export function recordView({ token }) {
  const now = new Date().toISOString();
  withTokenDb(token, (db) => {
    db.prepare(
      `UPDATE receipt_tokens
          SET view_count = COALESCE(view_count, 0) + 1,
              last_viewed_at = ?
        WHERE token = ?`,
    ).run(now, token);
  });
}

export function migrateLegacyReceiptTokensDb() {
  const legacyPath = path.join(SHOP_DATABASE_DIRECTORY, "receipt-tokens.db");
  if (!fs.existsSync(legacyPath)) return { migrated: 0, skipped: 0 };

  let legacy;
  try {
    legacy = new Database(legacyPath, { readonly: true, fileMustExist: true });
  } catch (err) {
    console.warn(
      "receipt-tokens migration: cannot open legacy DB:",
      err?.message || err,
    );
    return { migrated: 0, skipped: 0 };
  }

  let rows;
  try {
    rows = legacy.prepare("SELECT * FROM receipt_tokens").all();
  } catch {
    legacy.close();
    return { migrated: 0, skipped: 0 };
  }

  let migrated = 0;
  let skipped = 0;
  for (const row of rows) {
    if (!row.shop_id) {
      skipped += 1;
      continue;
    }
    let shopDb;
    try {
      shopDb = openShopDatabaseIfExists(row.shop_id);
    } catch {
      shopDb = null;
    }
    if (!shopDb) {
      skipped += 1;
      continue;
    }
    try {
      shopDb
        .prepare(
          `INSERT OR IGNORE INTO receipt_tokens (
             token, shop_id, transaction_code, receipt_id,
             recipient_email, recipient_phone, snapshot_json,
             created_at, sent_at, last_sent_at,
             send_count, view_count, last_viewed_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          row.token,
          row.shop_id,
          row.transaction_code ?? null,
          row.receipt_id ?? null,
          row.recipient_email ?? null,
          row.recipient_phone ?? null,
          row.snapshot_json,
          row.created_at ?? null,
          row.sent_at ?? null,
          row.last_sent_at ?? null,
          row.send_count ?? 0,
          row.view_count ?? 0,
          row.last_viewed_at ?? null,
        );
      migrated += 1;
    } catch (err) {
      console.warn(
        "receipt-tokens migration: insert failed for token",
        row.token,
        err?.message || err,
      );
      skipped += 1;
    }
  }

  legacy.close();

  try {
    const archivedPath = `${legacyPath}.migrated`;
    fs.renameSync(legacyPath, archivedPath);
    for (const ext of ["-wal", "-shm"]) {
      const sidecar = `${legacyPath}${ext}`;
      if (fs.existsSync(sidecar)) {
        try {
          fs.unlinkSync(sidecar);
        } catch {
          // best-effort cleanup
        }
      }
    }
  } catch (err) {
    console.warn(
      "receipt-tokens migration: could not rename legacy DB:",
      err?.message || err,
    );
  }

  return { migrated, skipped };
}
