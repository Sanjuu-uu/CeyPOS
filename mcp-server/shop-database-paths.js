import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SHOP_DATABASE_DIRECTORY = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? path.resolve(process.env.RAILWAY_VOLUME_MOUNT_PATH)
  : path.resolve(__dirname, '../database');

const SHOP_DATABASE_DIRECTORIES = Array.from(
  new Set([
    SHOP_DATABASE_DIRECTORY,
    path.resolve(process.cwd(), '../database'),
    path.resolve(process.cwd(), 'database'),
  ]),
);

function ensureShopDatabaseDirectory() {
  if (!fs.existsSync(SHOP_DATABASE_DIRECTORY)) {
    fs.mkdirSync(SHOP_DATABASE_DIRECTORY, { recursive: true });
  }
}

function sanitizeShopIdentifier(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._+-]/g, '_');
}

function candidateShopDatabaseFilenames(shopId) {
  const base = String(shopId).replace(/\.db$/i, '');
  const primary = `${base}.db`;
  const legacy = `shop_${base}.db`;
  return [primary, legacy];
}

function resolveExistingShopDatabasePath(shopId) {
  ensureShopDatabaseDirectory();
  for (const directory of SHOP_DATABASE_DIRECTORIES) {
    for (const fileName of candidateShopDatabaseFilenames(shopId)) {
      const fullPath = path.join(directory, fileName);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
  }
  return null;
}

function getShopDatabasePath(shopId) {
  ensureShopDatabaseDirectory();
  const resolved = resolveExistingShopDatabasePath(shopId);
  if (resolved) {
    return resolved;
  }
  const base = String(shopId).replace(/\.db$/i, '');
  return path.join(SHOP_DATABASE_DIRECTORY, `${base}.db`);
}

function shopDatabaseExists(shopId) {
  return Boolean(resolveExistingShopDatabasePath(shopId));
}

export {
  SHOP_DATABASE_DIRECTORY,
  SHOP_DATABASE_DIRECTORIES,
  ensureShopDatabaseDirectory,
  sanitizeShopIdentifier,
  candidateShopDatabaseFilenames,
  resolveExistingShopDatabasePath,
  getShopDatabasePath,
  shopDatabaseExists,
};

// Backward-compatible aliases for existing imports
export {
  SHOP_DATABASE_DIRECTORY as DB_DIR,
  ensureShopDatabaseDirectory as ensureDbDir,
  sanitizeShopIdentifier as sanitizeForFilename,
  getShopDatabasePath as dbPathForShop,
  shopDatabaseExists as dbExists,
  resolveExistingShopDatabasePath as resolveExistingDbPath,
};
