import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const modulePath = '../src/utils/shop-database.js';

test('resolveShopIdByOwnerEmail prefers the most recently updated matching shop database', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ceypos-shop-db-'));
  process.env.APP_DATABASE_PATH = tempDir;
  process.env.RAILWAY_VOLUME_MOUNT_PATH = '';

  const shopDbModule = await import(modulePath);
  const { createShopDatabase, upsertShopMetadata, resolveShopIdByOwnerEmail } = shopDbModule;

  const firstDb = createShopDatabase('owner-test-alpha', {
    shop_name: 'Alpha Shop',
    owner_email: 'owner@example.com',
    owner_name: 'Owner',
  });
  firstDb.close();

  const secondDb = createShopDatabase('owner-test-beta', {
    shop_name: 'Beta Shop',
    owner_email: 'owner@example.com',
    owner_name: 'Owner',
  });
  secondDb.close();

  const firstPath = path.join(tempDir, 'owner-test-alpha.db');
  const secondPath = path.join(tempDir, 'owner-test-beta.db');
  fs.utimesSync(firstPath, new Date('2024-01-01T00:00:00.000Z'), new Date('2024-01-01T00:00:00.000Z'));
  fs.utimesSync(secondPath, new Date('2024-02-01T00:00:00.000Z'), new Date('2024-02-01T00:00:00.000Z'));

  const result = resolveShopIdByOwnerEmail('owner@example.com');
  assert.equal(result?.shopId, 'owner-test-beta');
  assert.equal(result?.dbFileName, 'owner-test-beta.db');
});
