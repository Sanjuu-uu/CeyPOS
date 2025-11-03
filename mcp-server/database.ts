import * as sqlite3 from 'sqlite3';
import { dbPathForShop } from './db-path.js';

export async function queryDatabase(shopId: string, query: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const dbPath = dbPathForShop(shopId);
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        reject(err);
        return;
      }

      db.all(query, [], (err, rows) => {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  });
}

export async function getSchema(shopId: string): Promise<any> {
  const query = `
    SELECT name, sql FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `;
  return await queryDatabase(shopId, query);
}

export async function getSampleData(shopId: string, table: string, limit: number = 5): Promise<any> {
  const query = `SELECT * FROM ${table} LIMIT ${limit}`;
  return await queryDatabase(shopId, query);
}