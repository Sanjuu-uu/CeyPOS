import * as sqlite3 from 'sqlite3';
import {
  getShopDatabasePath,
  sanitizeShopIdentifier,
  shopDatabaseExists,
} from './shop-database-paths.js';
import { applyReadLimit, validateReadOnlySql } from './sql-safety.js';
import { applySearchFallback, normalizeToolResult } from './search-fallback.js';

type QueryRow = Record<string, unknown>;

function normalizeShopId(shopId: string): string {
  const trimmed = String(shopId ?? '')
    .replace(/^shop_/, '')
    .replace(/\.db$/i, '')
    .trim();
  const normalized = sanitizeShopIdentifier(trimmed);
  if (!normalized) {
    throw new Error('Shop identifier is required to query the database.');
  }
  if (!shopDatabaseExists(normalized)) {
    throw new Error(`Shop database not found for ${normalized}`);
  }
  return normalized;
}

function sanitizeSqlQuery(rawQuery: string): string {
  const validation = validateReadOnlySql(rawQuery);
  if (!validation.ok) {
    throw new Error(validation.error);
  }
  return applyReadLimit(validation.sql, 80);
}

export async function queryShopDatabase(shopId: string, rawQuery: string): Promise<QueryRow[]> {
  const normalizedShopId = normalizeShopId(shopId);
  const query = sanitizeSqlQuery(rawQuery);
  const dbPath = getShopDatabasePath(normalizedShopId);

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (openError) => {
      if (openError) {
        reject(openError);
        return;
      }

      db.all(query, [], (queryError, rows) => {
        db.close();
        if (queryError) {
          reject(queryError);
        } else {
          resolve((rows as QueryRow[]) ?? []);
        }
      });
    });
  });
}

export async function queryShopDatabaseWithSearch(
  shopId: string,
  rawQuery: string,
  toolName: string,
): Promise<QueryRow[] | { rows: QueryRow[]; meta: Record<string, unknown> }> {
  const rows = await queryShopDatabase(shopId, rawQuery);
  return applySearchFallback(toolName, rawQuery, rows, 80, (sql) => queryShopDatabase(shopId, sql));
}

export function compactSearchQueryResult(
  result: QueryRow[] | { rows: QueryRow[]; meta?: Record<string, unknown> | null },
) {
  const normalized = normalizeToolResult(result);
  const payload = compactResult(normalized.rows ?? []);
  if (normalized.meta) {
    return { ...payload, matchInfo: normalized.meta };
  }
  return payload;
}

function compactResult(result: QueryRow[]) {
  const rows = result.slice(0, 25).map((row) =>
    Object.fromEntries(
      Object.entries(row)
        .slice(0, 16)
        .map(([key, value]) => [key, compactValue(value)]),
    ),
  );
  return {
    rowCount: result.length,
    returnedRows: rows.length,
    truncated: result.length > rows.length,
    rows,
  };
}

function compactValue(value: unknown) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  const text = String(value);
  return text.length > 180 ? `${text.slice(0, 180)}...` : text;
}

export async function getShopSchema(shopId: string): Promise<Array<{ name: string; sql: string }>> {
  const query = `
    SELECT name, sql FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `;
  const rows = await queryShopDatabase(shopId, query);
  return rows.map((row) => ({
    name: String(row.name ?? ''),
    sql: String(row.sql ?? ''),
  }));
}

export async function getShopSampleData(
  shopId: string,
  table: string,
  limit: number = 5,
): Promise<QueryRow[]> {
  const tableName = table.trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(tableName)) {
    throw new Error('Invalid table name requested.');
  }

  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(Math.trunc(limit), 25)) : 5;
  const query = `SELECT * FROM ${tableName} LIMIT ${safeLimit}`;
  return queryShopDatabase(shopId, query);
}
