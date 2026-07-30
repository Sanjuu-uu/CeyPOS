import fs from "fs";
import path from "path";
import crypto from "crypto";
import Database from "better-sqlite3";
import { SHOP_DATABASE_DIRECTORY, getShopDatabasePath, shopDatabaseExists } from "../utils/shop-database.js";

const ADMIN_DB_PATH = path.join(SHOP_DATABASE_DIRECTORY, "admin-ops.db");
const BACKUP_DIR = path.resolve(process.env.BACKUP_DIRECTORY || path.join(SHOP_DATABASE_DIRECTORY, "../backups"));
const OFFSITE_DIR = process.env.BACKUP_OFFSITE_PATH ? path.resolve(process.env.BACKUP_OFFSITE_PATH) : null;
const BACKUP_GENERATIONS = Math.max(3, Math.min(Number(process.env.BACKUP_GENERATIONS || 14), 90));
const DAILY_BACKUP_MS = Math.max(60_000, Number(process.env.BACKUP_DAILY_INTERVAL_MS || 24 * 60 * 60 * 1000));
const RECOVERY_POINT_MS = Math.max(60_000, Number(process.env.BACKUP_RECOVERY_POINT_INTERVAL_MS || 15 * 60 * 1000));
const BACKUP_ALGORITHM = "aes-256-gcm";

let schedulerStarted = false;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function adminDb() {
  ensureDir(SHOP_DATABASE_DIRECTORY);
  const db = new Database(ADMIN_DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS backup_runs (
      run_id TEXT PRIMARY KEY,
      shop_id TEXT,
      backup_type TEXT NOT NULL,
      status TEXT NOT NULL,
      file_path TEXT,
      offsite_path TEXT,
      bytes INTEGER DEFAULT 0,
      sha256 TEXT,
      integrity_status TEXT,
      restore_test_status TEXT,
      message TEXT,
      created_at DATETIME NOT NULL,
      completed_at DATETIME
    );

    CREATE INDEX IF NOT EXISTS idx_backup_runs_created ON backup_runs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_backup_runs_shop_created ON backup_runs(shop_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS admin_alerts (
      alert_id TEXT PRIMARY KEY,
      severity TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      shop_id TEXT,
      source_id TEXT,
      created_at DATETIME NOT NULL,
      resolved_at DATETIME
    );

    CREATE INDEX IF NOT EXISTS idx_admin_alerts_created ON admin_alerts(created_at DESC);

    CREATE TABLE IF NOT EXISTS support_conversations (
      conversation_id TEXT PRIMARY KEY,
      shop_id TEXT,
      user_email TEXT,
      user_name TEXT,
      subject TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      priority TEXT NOT NULL DEFAULT 'medium',
      assigned_admin_email TEXT,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL
    );

    CREATE TABLE IF NOT EXISTS support_messages (
      message_id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_type TEXT NOT NULL,
      sender_email TEXT,
      message TEXT NOT NULL,
      created_at DATETIME NOT NULL,
      read_at DATETIME,
      FOREIGN KEY(conversation_id) REFERENCES support_conversations(conversation_id)
    );

    CREATE INDEX IF NOT EXISTS idx_support_conversations_updated ON support_conversations(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_support_messages_conversation ON support_messages(conversation_id, created_at);
  `);
  return db;
}

function backupKey() {
  const raw = process.env.BACKUP_ENCRYPTION_KEY || process.env.CEYPOS_BACKUP_KEY || "ceypos-dev-backup-key-change-before-production";
  return crypto.createHash("sha256").update(raw).digest();
}

function encryptBuffer(buffer) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(BACKUP_ALGORITHM, backupKey(), iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from("CEYBKP1:"), iv, tag, encrypted]);
}

function decryptBuffer(buffer) {
  const prefix = Buffer.from("CEYBKP1:");
  if (!buffer.subarray(0, prefix.length).equals(prefix)) throw new Error("Invalid CeyPOS backup file");
  const iv = buffer.subarray(prefix.length, prefix.length + 12);
  const tag = buffer.subarray(prefix.length + 12, prefix.length + 28);
  const encrypted = buffer.subarray(prefix.length + 28);
  const decipher = crypto.createDecipheriv(BACKUP_ALGORITHM, backupKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

function listShopDbFiles() {
  ensureDir(SHOP_DATABASE_DIRECTORY);
  return fs
    .readdirSync(SHOP_DATABASE_DIRECTORY)
    .filter((name) => name.endsWith(".db"))
    .filter((name) => !["admin-ops.db", "receipt-tokens.db", "import-catalog.db", "verification.db"].includes(name))
    .map((name) => ({
      fileName: name,
      shopId: name.replace(/\.db$/i, ""),
      path: path.join(SHOP_DATABASE_DIRECTORY, name),
    }));
}

function integrityCheck(dbPath) {
  const db = new Database(dbPath, { fileMustExist: true, readonly: true });
  try {
    const row = db.prepare("PRAGMA integrity_check").get();
    const value = row ? Object.values(row)[0] : "unknown";
    return String(value || "").toLowerCase() === "ok" ? "ok" : String(value || "failed");
  } finally {
    db.close();
  }
}

function createAlert({ severity = "warning", category, title, body, shopId = null, sourceId = null }) {
  const db = adminDb();
  try {
    const alertId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO admin_alerts (alert_id, severity, category, title, body, shop_id, source_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(alertId, severity, category, title, body, shopId, sourceId, new Date().toISOString());
    return alertId;
  } finally {
    db.close();
  }
}

function pruneBackups(shopId) {
  const db = adminDb();
  try {
    const rows = db
      .prepare("SELECT run_id, file_path, offsite_path FROM backup_runs WHERE shop_id = ? AND status = 'ok' ORDER BY datetime(created_at) DESC")
      .all(shopId);
    for (const row of rows.slice(BACKUP_GENERATIONS)) {
      for (const file of [row.file_path, row.offsite_path]) {
        if (file && fs.existsSync(file)) {
          try { fs.unlinkSync(file); } catch { /* keep DB row if delete fails */ }
        }
      }
      db.prepare("DELETE FROM backup_runs WHERE run_id = ?").run(row.run_id);
    }
  } finally {
    db.close();
  }
}

export function runBackup({ shopId = null, backupType = "manual" } = {}) {
  ensureDir(BACKUP_DIR);
  if (OFFSITE_DIR) ensureDir(OFFSITE_DIR);
  const targets = shopId
    ? [{ shopId, path: getShopDatabasePath(shopId), fileName: `${shopId}.db` }]
    : listShopDbFiles();
  const results = [];

  for (const target of targets) {
    const runId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    const ops = adminDb();
    try {
      ops.prepare(`
        INSERT INTO backup_runs (run_id, shop_id, backup_type, status, created_at)
        VALUES (?, ?, ?, 'running', ?)
      `).run(runId, target.shopId, backupType, startedAt);
    } finally {
      ops.close();
    }

    try {
      if (!fs.existsSync(target.path)) throw new Error("Shop database file not found");
      const integrity = integrityCheck(target.path);
      if (integrity !== "ok") throw new Error(`Integrity check failed: ${integrity}`);

      const plain = fs.readFileSync(target.path);
      const encrypted = encryptBuffer(plain);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupName = `${target.shopId}.${backupType}.${timestamp}.db.ceybak`;
      const filePath = path.join(BACKUP_DIR, backupName);
      fs.writeFileSync(filePath, encrypted, { mode: 0o600 });
      const sha256 = crypto.createHash("sha256").update(encrypted).digest("hex");
      let offsitePath = null;
      if (OFFSITE_DIR) {
        offsitePath = path.join(OFFSITE_DIR, backupName);
        fs.copyFileSync(filePath, offsitePath);
      }

      const restore = testRestoreFile(filePath);
      const status = restore.ok ? "ok" : "failed";
      const completedAt = new Date().toISOString();
      const db = adminDb();
      try {
        db.prepare(`
          UPDATE backup_runs
             SET status = ?, file_path = ?, offsite_path = ?, bytes = ?, sha256 = ?,
                 integrity_status = ?, restore_test_status = ?, message = ?, completed_at = ?
           WHERE run_id = ?
        `).run(status, filePath, offsitePath, encrypted.length, sha256, integrity, restore.status, restore.message, completedAt, runId);
      } finally {
        db.close();
      }
      if (status !== "ok") {
        createAlert({ severity: "critical", category: "backup", title: "Backup restore test failed", body: restore.message, shopId: target.shopId, sourceId: runId });
      } else {
        pruneBackups(target.shopId);
      }
      results.push({ runId, shopId: target.shopId, status, filePath, offsitePath, integrity, restoreTest: restore.status });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const db = adminDb();
      try {
        db.prepare("UPDATE backup_runs SET status = 'failed', message = ?, completed_at = ? WHERE run_id = ?")
          .run(message, new Date().toISOString(), runId);
      } finally {
        db.close();
      }
      createAlert({ severity: "critical", category: "backup", title: "Backup failed", body: message, shopId: target.shopId, sourceId: runId });
      results.push({ runId, shopId: target.shopId, status: "failed", message });
    }
  }
  return results;
}

export function testRestoreFile(filePath) {
  const tempDir = fs.mkdtempSync(path.join(BACKUP_DIR, "restore-test-"));
  const restoredPath = path.join(tempDir, "restore-test.db");
  try {
    const encrypted = fs.readFileSync(filePath);
    const plain = decryptBuffer(encrypted);
    fs.writeFileSync(restoredPath, plain, { mode: 0o600 });
    const integrity = integrityCheck(restoredPath);
    return { ok: integrity === "ok", status: integrity === "ok" ? "ok" : "failed", message: integrity };
  } catch (error) {
    return { ok: false, status: "failed", message: error instanceof Error ? error.message : String(error) };
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

export function recoverBackupToFile({ runId, targetShopId = null }) {
  const db = adminDb();
  let row;
  try {
    row = db.prepare("SELECT * FROM backup_runs WHERE run_id = ?").get(runId);
  } finally {
    db.close();
  }
  if (!row?.file_path || !fs.existsSync(row.file_path)) throw new Error("Backup file not found");
  const restored = decryptBuffer(fs.readFileSync(row.file_path));
  const shopId = targetShopId || `${row.shop_id || "shop"}_recovered_${Date.now()}`;
  const targetPath = path.join(SHOP_DATABASE_DIRECTORY, `${shopId}.db`);
  if (fs.existsSync(targetPath)) throw new Error("Recovery target already exists");
  fs.writeFileSync(targetPath, restored, { mode: 0o600 });
  const integrity = integrityCheck(targetPath);
  if (integrity !== "ok") throw new Error(`Recovered database failed integrity check: ${integrity}`);
  return { shopId, path: targetPath, integrity };
}

export function exportShopDatabase(shopId) {
  if (!shopDatabaseExists(shopId)) throw new Error("Shop database not found");
  const dbPath = getShopDatabasePath(shopId);
  const integrity = integrityCheck(dbPath);
  if (integrity !== "ok") throw new Error(`Cannot export: integrity check failed (${integrity})`);
  return { filePath: dbPath, fileName: `${shopId}.db`, bytes: fs.statSync(dbPath).size };
}

export function getAdminStatus() {
  const dbFiles = listShopDbFiles();
  const checks = dbFiles.map((file) => {
    let integrity = "unknown";
    let bytes = 0;
    try {
      integrity = integrityCheck(file.path);
      bytes = fs.statSync(file.path).size;
    } catch (error) {
      integrity = error instanceof Error ? error.message : "failed";
    }
    return { shopId: file.shopId, fileName: file.fileName, bytes, integrity };
  });

  let disk = null;
  try {
    const stat = fs.statfsSync(SHOP_DATABASE_DIRECTORY);
    const freeBytes = Number(stat.bavail) * Number(stat.bsize);
    const totalBytes = Number(stat.blocks) * Number(stat.bsize);
    disk = { freeBytes, totalBytes, usedPercent: totalBytes ? Math.round(((totalBytes - freeBytes) / totalBytes) * 100) : null };
    if (freeBytes < 500 * 1024 * 1024) {
      createAlert({ severity: "critical", category: "disk", title: "Low database disk space", body: `Only ${Math.round(freeBytes / 1024 / 1024)}MB free.` });
    }
  } catch {
    disk = { freeBytes: null, totalBytes: null, usedPercent: null };
  }

  const ops = adminDb();
  try {
    const backups = ops.prepare("SELECT * FROM backup_runs ORDER BY datetime(created_at) DESC LIMIT 50").all();
    const alerts = ops.prepare("SELECT * FROM admin_alerts WHERE resolved_at IS NULL ORDER BY datetime(created_at) DESC LIMIT 50").all();
    const support = ops.prepare("SELECT * FROM support_conversations ORDER BY datetime(updated_at) DESC LIMIT 50").all();
    return {
      rto: process.env.CEYPOS_RTO || "4 hours",
      rpo: process.env.CEYPOS_RPO || "15 minutes",
      backupGenerations: BACKUP_GENERATIONS,
      backupDirectory: BACKUP_DIR,
      offsiteConfigured: Boolean(OFFSITE_DIR),
      offsiteDirectory: OFFSITE_DIR,
      disk,
      shops: checks,
      backups,
      alerts,
      support,
      runbook: [
        "1. Triage: check admin alerts, disk space, latest backup status and integrity.",
        "2. Contain: stop writes for the impacted shop if corruption is suspected.",
        "3. Verify: run restore test on the latest backup generation.",
        "4. Recover: restore to a separate recovered shop DB, validate PRAGMA integrity_check, then swap only during a maintenance window.",
        "5. Reconcile: compare latest invoices, register shifts and backup timestamp against the RPO.",
        "6. Communicate: update merchant via support chat and record final incident notes.",
      ],
    };
  } finally {
    ops.close();
  }
}

export function listSupportConversations() {
  const db = adminDb();
  try {
    return db.prepare("SELECT * FROM support_conversations ORDER BY datetime(updated_at) DESC LIMIT 100").all();
  } finally {
    db.close();
  }
}

export function getSupportMessages(conversationId) {
  const db = adminDb();
  try {
    const conversation = db.prepare("SELECT * FROM support_conversations WHERE conversation_id = ?").get(conversationId);
    const messages = db.prepare("SELECT * FROM support_messages WHERE conversation_id = ? ORDER BY datetime(created_at)").all(conversationId);
    return { conversation, messages };
  } finally {
    db.close();
  }
}

export function sendSupportMessage({ conversationId = null, shopId = null, userEmail, userName = null, subject = "Support request", priority = "medium", senderType = "merchant", message }) {
  if (!message || !String(message).trim()) throw new Error("Message is required");
  const db = adminDb();
  try {
    const now = new Date().toISOString();
    let targetId = conversationId;
    if (!targetId) {
      targetId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO support_conversations (conversation_id, shop_id, user_email, user_name, subject, status, priority, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?)
      `).run(targetId, shopId, userEmail, userName, subject, priority, now, now);
    }
    db.prepare(`
      INSERT INTO support_messages (message_id, conversation_id, sender_type, sender_email, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), targetId, senderType, userEmail, String(message).trim().slice(0, 4000), now);
    db.prepare("UPDATE support_conversations SET updated_at = ?, status = CASE WHEN status = 'resolved' THEN 'open' ELSE status END WHERE conversation_id = ?").run(now, targetId);
    return getSupportMessages(targetId);
  } finally {
    db.close();
  }
}

export function startBackupScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  setTimeout(() => runBackup({ backupType: "startup" }), 10_000).unref?.();
  setInterval(() => runBackup({ backupType: "daily" }), DAILY_BACKUP_MS).unref?.();
  setInterval(() => runBackup({ backupType: "recovery-point" }), RECOVERY_POINT_MS).unref?.();
}

