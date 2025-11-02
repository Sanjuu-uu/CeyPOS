import { openDb } from "../utils/db.js";
import { publishChange } from "../realtime/change-bus.js";

function normalizeProduct(input = {}) {
  const now = new Date().toISOString();
  return {
    inventory_code: input.inventory_code ?? input.inventoryCode ?? input.id ?? null,
    barcode_id: input.barcode_id ?? input.barcodeId ?? null,
    name: input.name ?? null,
    category: input.category ?? null,
    sku: input.sku ?? null,
    price:
      input.price === undefined || input.price === null || input.price === ""
        ? null
        : Number(input.price),
    stock:
      input.stock === undefined || input.stock === null || input.stock === ""
        ? 0
        : Number(input.stock),
    stock_last_month:
      input.stock_last_month === undefined || input.stock_last_month === null
        ? 0
        : Number(input.stock_last_month),
    restock_suggestion:
      input.restock_suggestion === undefined || input.restock_suggestion === null
        ? 0
        : Number(input.restock_suggestion),
    image_url: input.image_url ?? input.imageUrl ?? null,
    created_at: input.created_at ?? now,
    updated_at: now,
  };
}

function fetchInventory(db) {
  return db.prepare("SELECT * FROM inventory ORDER BY name COLLATE NOCASE").all();
}

function upsertInventoryRows(db, rows = []) {
  if (!rows.length) return [];
  const stmt = db.prepare(`
    INSERT INTO inventory (
      inventory_code, barcode_id, name, category, sku, price, stock,
      stock_last_month, restock_suggestion, image_url, created_at, updated_at
    ) VALUES (
      @inventory_code, @barcode_id, @name, @category, @sku, @price, @stock,
      @stock_last_month, @restock_suggestion, @image_url, @created_at, @updated_at
    )
    ON CONFLICT(inventory_code) DO UPDATE SET
      barcode_id = excluded.barcode_id,
      name = excluded.name,
      category = excluded.category,
      sku = excluded.sku,
      price = excluded.price,
      stock = excluded.stock,
      stock_last_month = excluded.stock_last_month,
      restock_suggestion = excluded.restock_suggestion,
      image_url = excluded.image_url,
      updated_at = excluded.updated_at
  `);

  const txn = db.transaction((items) => {
    for (const item of items) {
      stmt.run(item);
    }
  });

  txn(rows);

  const codes = rows
    .map((r) => r.inventory_code)
    .filter(Boolean)
    .map((code) => String(code));

  if (!codes.length) return fetchInventory(db);

  const placeholders = codes.map(() => "?").join(",");
  const updatedRows = db
    .prepare(
      `SELECT * FROM inventory WHERE inventory_code IN (${placeholders}) ORDER BY name COLLATE NOCASE`
    )
    .all(...codes);

  return updatedRows;
}

function adjustStockLevels(db, adjustments = []) {
  if (!adjustments.length) return [];
  const stmt = db.prepare(`
    UPDATE inventory
       SET stock = MAX(0, COALESCE(stock, 0) + @delta),
           updated_at = @updated_at
     WHERE inventory_code = @inventory_code
  `);
  const now = new Date().toISOString();
  const txn = db.transaction((items) => {
    for (const item of items) {
      stmt.run({
        inventory_code: item.inventory_code,
        delta: Number(item.delta || 0),
        updated_at: now,
      });
    }
  });
  txn(adjustments);

  const codes = adjustments
    .map((a) => a.inventory_code)
    .filter(Boolean)
    .map((code) => String(code));
  if (!codes.length) return [];

  const placeholders = codes.map(() => "?").join(",");
  return db
    .prepare(
      `SELECT * FROM inventory WHERE inventory_code IN (${placeholders}) ORDER BY name COLLATE NOCASE`
    )
    .all(...codes);
}

function getInventory(shopId) {
  const db = openDb(shopId);
  try {
    return fetchInventory(db);
  } finally {
    db.close();
  }
}

function upsertProducts(shopId, products = [], options = {}) {
  if (!products.length) {
    return [];
  }
  const normalized = products.map((p) => normalizeProduct(p));
  const db = openDb(shopId);
  try {
    const updatedRows = upsertInventoryRows(db, normalized);
    publishChange({
      shopId,
      entity: "inventory",
      action: "upsert",
      payload: {
        rows: updatedRows,
      },
      metadata: options.metadata || {},
      actor: options.actor || null,
    });
    return updatedRows;
  } finally {
    db.close();
  }
}

function applyStockAdjustments(shopId, adjustments = [], options = {}) {
  if (!adjustments.length) return [];
  const db = openDb(shopId);
  try {
    const updatedRows = adjustStockLevels(db, adjustments);
    if (updatedRows.length) {
      publishChange({
        shopId,
        entity: "inventory",
        action: "stock-adjust",
        payload: {
          rows: updatedRows,
        },
        metadata: options.metadata || {},
        actor: options.actor || null,
      });
    }
    return updatedRows;
  } finally {
    db.close();
  }
}

function deleteProducts(shopId, codes = [], options = {}) {
  const normalized = Array.from(new Set((codes || []).map((code) => String(code).trim()).filter(Boolean)));
  if (!normalized.length) {
    return [];
  }

  const db = openDb(shopId);
  try {
    const placeholders = normalized.map(() => "?").join(",");
    const existing = db
      .prepare(
        `SELECT inventory_code FROM inventory WHERE inventory_code IN (${placeholders})`
      )
      .all(...normalized)
      .map((row) => String(row.inventory_code));

    if (!existing.length) {
      return [];
    }

    const deletePlaceholders = existing.map(() => "?").join(",");
    db.prepare(`DELETE FROM inventory WHERE inventory_code IN (${deletePlaceholders})`).run(
      ...existing
    );

    publishChange({
      shopId,
      entity: "inventory",
      action: "delete",
      payload: { codes: existing },
      metadata: options.metadata || {},
      actor: options.actor || null,
    });

    return existing;
  } finally {
    db.close();
  }
}

export {
  getInventory,
  upsertProducts,
  applyStockAdjustments,
  normalizeProduct,
  fetchInventory,
  upsertInventoryRows,
  adjustStockLevels,
  deleteProducts,
};
