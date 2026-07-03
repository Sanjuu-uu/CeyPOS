import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openGlobalBarcodeDatabase, upsertGlobalBarcodeProducts, lookupGlobalBarcodeProduct, getGlobalBarcodeDatabasePath } from '../src/utils/global-barcode-database.js';

test('upsert and lookup global barcode product', async () => {
  const sample = {
    barcode_id: 'TEST123456',
    name: 'Test Product',
    category: 'Test',
    sku: 'TP-001',
    price: 9.99,
    image_url: null,
  };

  const db = openGlobalBarcodeDatabase();
  try {
    const rows = upsertGlobalBarcodeProducts([sample], { shopId: 'test-shop' });
    assert.ok(Array.isArray(rows));
    const found = lookupGlobalBarcodeProduct('TEST123456');
    assert.ok(found, 'product should be found in global DB');
    assert.equal(found.barcode_id, 'TEST123456');
    assert.equal(found.name, 'Test Product');
  } finally {
    try {
      db.prepare('DELETE FROM global_barcode_products WHERE barcode_id = ?').run('TEST123456');
    } catch (err) {
      // ignore
    }
    db.close();
  }
});
