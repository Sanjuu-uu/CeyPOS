import path from 'path';
import fs from 'fs';

const DB_DIR =
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  path.resolve(process.cwd(), '../database');

function ensureDbDir() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

function sanitizeForFilename(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._+-]/g, '_');
}

function candidateDbFilenames(shopId) {
  const base = String(shopId).replace(/\.db$/i, '');
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

function dbPathForShop(shopId) {
  ensureDbDir();
  const resolved = resolveExistingDbPath(shopId);
  if (resolved) {
    return resolved;
  }
  const base = String(shopId).replace(/\.db$/i, '');
  return path.join(DB_DIR, `${base}.db`);
}

function dbExists(shopId) {
  return Boolean(resolveExistingDbPath(shopId));
}

export {
  DB_DIR,
  ensureDbDir,
  sanitizeForFilename,
  dbPathForShop,
  dbExists,
  resolveExistingDbPath,
};
