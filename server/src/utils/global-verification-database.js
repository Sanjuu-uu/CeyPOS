/**
 * Global Verification Database
 *
 * Central database for phone verification and authentication flows.
 * Used when employee/user details don't belong to a specific shop yet.
 */

import path from "path";
import Database from "better-sqlite3";
import {
  SHOP_DATABASE_DIRECTORY,
  ensureShopDatabaseDirectory,
} from "./shop-database.js";

const GLOBAL_VERIFICATION_DATABASE_FILE = "verification.db";

export function getGlobalVerificationDatabasePath() {
  ensureShopDatabaseDirectory();
  return path.join(SHOP_DATABASE_DIRECTORY, GLOBAL_VERIFICATION_DATABASE_FILE);
}

function initializeVerificationSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS phone_verification_otps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id TEXT,
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
  `);
}

/**
 * Open global verification database
 * @returns {Database}
 */
export function openGlobalVerificationDatabase() {
  const db = new Database(getGlobalVerificationDatabasePath());
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  initializeVerificationSchema(db);
  return db;
}
