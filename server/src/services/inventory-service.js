import { openShopDatabase } from "../utils/shop-database.js";
import { publishChange } from "../realtime/change-bus.js";
import { upsertGlobalBarcodeProducts } from "../utils/global-barcode-database.js";
import { notifyLowStock } from "./notification-service.js";

function normalizeProduct(input = {}) {
  const now = new Date().toISOString();
  const costSource = input.cost_price ?? input.costPrice;
  const reorderSource = input.reorder_threshold ?? input.reorderThreshold;
  const packSource = input.pack_size ?? input.packSize;
  return {
    inventory_code: input.inventory_code ?? input.inventoryCode ?? input.id ?? null,
    // Accept `barcode` too — the POS/inventory client sends the Product field
    // named `barcode`; without this the barcode was silently dropped on save.
    barcode_id: input.barcode_id ?? input.barcodeId ?? input.barcode ?? null,
    name: input.name ?? null,
    category: input.category ?? null,
    sku: input.sku ?? null,
    price:
      input.price === undefined || input.price === null || input.price === ""
        ? null
        : Number(input.price),
    cost_price:
      costSource === undefined || costSource === null || costSource === ""
        ? Number(input.costPrice || 0)
        : Number(costSource),
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
    reorder_threshold:
      reorderSource === undefined || reorderSource === null || reorderSource === ""
        ? Number(input.reorderThreshold || 0)
        : Number(reorderSource),
    unit_name: input.unit_name ?? input.unitName ?? "unit",
    pack_size:
      packSource === undefined || packSource === null || packSource === ""
        ? Number(input.packSize || 1)
        : Number(packSource),
    preferred_supplier_id:
      input.preferred_supplier_id ?? input.preferredSupplierId ?? null,
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
      inventory_code, barcode_id, name, category, sku, price, cost_price, stock,
      stock_last_month, restock_suggestion, reorder_threshold, unit_name, pack_size,
      preferred_supplier_id, image_url, created_at, updated_at
    ) VALUES (
      @inventory_code, @barcode_id, @name, @category, @sku, @price, @cost_price, @stock,
      @stock_last_month, @restock_suggestion, @reorder_threshold, @unit_name, @pack_size,
      @preferred_supplier_id, @image_url, @created_at, @updated_at
    )
    ON CONFLICT(inventory_code) DO UPDATE SET
      barcode_id = excluded.barcode_id,
      name = excluded.name,
      category = excluded.category,
      sku = excluded.sku,
      price = excluded.price,
      cost_price = excluded.cost_price,
      stock = excluded.stock,
      stock_last_month = excluded.stock_last_month,
      restock_suggestion = excluded.restock_suggestion,
      reorder_threshold = excluded.reorder_threshold,
      unit_name = excluded.unit_name,
      pack_size = excluded.pack_size,
      preferred_supplier_id = excluded.preferred_supplier_id,
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
      const before = db.prepare("SELECT inventory_code, stock, cost_price FROM inventory WHERE inventory_code = ?").get(item.inventory_code);
      stmt.run({
        inventory_code: item.inventory_code,
        delta: Number(item.delta || 0),
        updated_at: now,
      });
      const after = db.prepare("SELECT inventory_code, stock FROM inventory WHERE inventory_code = ?").get(item.inventory_code);
      if (before && after) {
        db.prepare(`
          INSERT INTO inventory_movements (
            inventory_code, movement_type, stock_type, quantity_delta, quantity_after,
            unit_cost, source_type, source_id, reason, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          item.inventory_code,
          item.movement_type || "adjustment",
          item.stock_type || "sellable",
          Number(item.delta || 0),
          Number(after.stock || 0),
          Number(item.unit_cost ?? before.cost_price ?? 0),
          item.source_type || null,
          item.source_id || null,
          item.reason || null,
          item.notes || null,
          now,
        );
      }
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
  const db = openShopDatabase(shopId);
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
  const db = openShopDatabase(shopId);
  try {
    const updatedRows = upsertInventoryRows(db, normalized);
    upsertGlobalBarcodeProducts(updatedRows, { shopId });
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
    notifyLowStock({ shopId, rows: updatedRows });
    return updatedRows;
  } finally {
    db.close();
  }
}

function applyStockAdjustments(shopId, adjustments = [], options = {}) {
  if (!adjustments.length) return [];
  const db = openShopDatabase(shopId);
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
      notifyLowStock({ shopId, rows: updatedRows });
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

  const db = openShopDatabase(shopId);
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

function normalizeLineItem(item = {}) {
  return {
    inventory_code: String(item.inventory_code ?? item.inventoryCode ?? "").trim(),
    quantity: Number(item.quantity ?? item.qty ?? item.quantity_ordered ?? 0),
    unit_cost: Number(item.unit_cost ?? item.unitCost ?? 0),
  };
}

function getInventoryOperations(shopId) {
  const db = openShopDatabase(shopId);
  try {
    return {
      suppliers: db.prepare("SELECT * FROM inventory_suppliers ORDER BY name COLLATE NOCASE").all(),
      purchaseOrders: db.prepare(`
        SELECT po.*, s.name AS supplier_name
          FROM inventory_purchase_orders po
          LEFT JOIN inventory_suppliers s ON s.supplier_id = po.supplier_id
         ORDER BY po.created_at DESC
         LIMIT 100
      `).all(),
      goodsReceived: db.prepare(`
        SELECT gr.*, s.name AS supplier_name
          FROM inventory_goods_received gr
          LEFT JOIN inventory_suppliers s ON s.supplier_id = gr.supplier_id
         ORDER BY gr.received_at DESC
         LIMIT 100
      `).all(),
      purchaseReturns: db.prepare(`
        SELECT pr.*, s.name AS supplier_name
          FROM inventory_purchase_returns pr
          LEFT JOIN inventory_suppliers s ON s.supplier_id = pr.supplier_id
         ORDER BY pr.returned_at DESC
         LIMIT 100
      `).all(),
      stockCounts: db.prepare("SELECT * FROM inventory_stock_counts ORDER BY started_at DESC LIMIT 100").all(),
      adjustmentReasons: db.prepare("SELECT * FROM inventory_adjustment_reasons ORDER BY name COLLATE NOCASE").all(),
      movements: db.prepare(`
        SELECT m.*, i.name AS product_name
          FROM inventory_movements m
          LEFT JOIN inventory i ON i.inventory_code = m.inventory_code
         ORDER BY m.created_at DESC, m.movement_id DESC
         LIMIT 200
      `).all(),
      variants: db.prepare(`
        SELECT v.*, i.name AS parent_name
          FROM inventory_product_variants v
          LEFT JOIN inventory i ON i.inventory_code = v.parent_inventory_code
         ORDER BY v.updated_at DESC
         LIMIT 200
      `).all(),
    };
  } finally {
    db.close();
  }
}

function upsertSupplier(shopId, supplier = {}, options = {}) {
  const db = openShopDatabase(shopId);
  const now = new Date().toISOString();
  try {
    const id = supplier.supplier_id ?? supplier.supplierId ?? null;
    if (id) {
      db.prepare(`
        UPDATE inventory_suppliers
           SET name = @name, contact_name = @contact_name, phone = @phone,
               email = @email, address = @address, notes = @notes,
               status = @status, updated_at = @updated_at
         WHERE supplier_id = @supplier_id
      `).run({
        supplier_id: Number(id),
        name: supplier.name,
        contact_name: supplier.contact_name ?? supplier.contactName ?? null,
        phone: supplier.phone ?? null,
        email: supplier.email ?? null,
        address: supplier.address ?? null,
        notes: supplier.notes ?? null,
        status: supplier.status ?? "active",
        updated_at: now,
      });
    } else {
      db.prepare(`
        INSERT INTO inventory_suppliers
          (name, contact_name, phone, email, address, notes, status, created_at, updated_at)
        VALUES (@name, @contact_name, @phone, @email, @address, @notes, @status, @created_at, @updated_at)
      `).run({
        name: supplier.name,
        contact_name: supplier.contact_name ?? supplier.contactName ?? null,
        phone: supplier.phone ?? null,
        email: supplier.email ?? null,
        address: supplier.address ?? null,
        notes: supplier.notes ?? null,
        status: supplier.status ?? "active",
        created_at: now,
        updated_at: now,
      });
    }
    publishChange({ shopId, entity: "inventory_operations", action: "supplier-upsert", payload: {}, metadata: options.metadata || {}, actor: options.actor || null });
    return getInventoryOperations(shopId);
  } finally {
    db.close();
  }
}

function createPurchaseOrder(shopId, payload = {}, options = {}) {
  const db = openShopDatabase(shopId);
  const now = new Date().toISOString();
  const items = (Array.isArray(payload.items) ? payload.items : []).map(normalizeLineItem).filter((item) => item.inventory_code && item.quantity > 0);
  try {
    const poNumber = payload.po_number || payload.poNumber || `PO-${Date.now()}`;
    const txn = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO inventory_purchase_orders
          (po_number, supplier_id, status, expected_at, notes, subtotal, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        poNumber,
        payload.supplier_id ?? payload.supplierId ?? null,
        payload.status || "ordered",
        payload.expected_at ?? payload.expectedAt ?? null,
        payload.notes ?? null,
        items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0),
        now,
        now,
      );
      const poId = Number(result.lastInsertRowid);
      const insertItem = db.prepare(`
        INSERT INTO inventory_purchase_order_items
          (po_id, inventory_code, quantity_ordered, quantity_received, unit_cost)
        VALUES (?, ?, ?, 0, ?)
      `);
      items.forEach((item) => insertItem.run(poId, item.inventory_code, item.quantity, item.unit_cost));
    });
    txn();
    publishChange({ shopId, entity: "inventory_operations", action: "po-create", payload: {}, metadata: options.metadata || {}, actor: options.actor || null });
    return getInventoryOperations(shopId);
  } finally {
    db.close();
  }
}

function receiveGoods(shopId, payload = {}, options = {}) {
  const db = openShopDatabase(shopId);
  const now = new Date().toISOString();
  const items = (Array.isArray(payload.items) ? payload.items : []).map(normalizeLineItem).filter((item) => item.inventory_code && item.quantity > 0);
  try {
    const txn = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO inventory_goods_received
          (receipt_number, po_id, supplier_id, received_at, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        payload.receipt_number || payload.receiptNumber || `GRN-${Date.now()}`,
        payload.po_id ?? payload.poId ?? null,
        payload.supplier_id ?? payload.supplierId ?? null,
        payload.received_at ?? payload.receivedAt ?? now,
        payload.notes ?? null,
        now,
      );
      const receiptId = Number(result.lastInsertRowid);
      const insertItem = db.prepare(`
        INSERT INTO inventory_goods_received_items
          (receipt_id, inventory_code, quantity, unit_cost)
        VALUES (?, ?, ?, ?)
      `);
      const updateStock = db.prepare(`
        UPDATE inventory
           SET stock = COALESCE(stock, 0) + @quantity,
               cost_price = CASE WHEN @unit_cost > 0 THEN @unit_cost ELSE COALESCE(cost_price, 0) END,
               updated_at = @updated_at
         WHERE inventory_code = @inventory_code
      `);
      const updatePo = db.prepare(`
        UPDATE inventory_purchase_order_items
           SET quantity_received = quantity_received + @quantity
         WHERE po_id = @po_id AND inventory_code = @inventory_code
      `);
      items.forEach((item) => {
        insertItem.run(receiptId, item.inventory_code, item.quantity, item.unit_cost);
        updateStock.run({ inventory_code: item.inventory_code, quantity: item.quantity, unit_cost: item.unit_cost, updated_at: now });
        if (payload.po_id || payload.poId) {
          updatePo.run({ po_id: payload.po_id ?? payload.poId, inventory_code: item.inventory_code, quantity: item.quantity });
        }
        const after = db.prepare("SELECT stock FROM inventory WHERE inventory_code = ?").get(item.inventory_code);
        db.prepare(`
          INSERT INTO inventory_movements
            (inventory_code, movement_type, stock_type, quantity_delta, quantity_after, unit_cost, source_type, source_id, reason, notes, created_at)
          VALUES (?, 'goods_received', 'sellable', ?, ?, ?, 'goods_received', ?, 'Goods received', ?, ?)
        `).run(item.inventory_code, item.quantity, Number(after?.stock || 0), item.unit_cost, String(receiptId), payload.notes ?? null, now);
      });
      if (payload.po_id || payload.poId) {
        const poId = payload.po_id ?? payload.poId;
        const remaining = db.prepare(`
          SELECT COUNT(*) AS count
            FROM inventory_purchase_order_items
           WHERE po_id = ? AND quantity_received < quantity_ordered
        `).get(poId);
        db.prepare("UPDATE inventory_purchase_orders SET status = ?, updated_at = ? WHERE po_id = ?")
          .run(Number(remaining?.count || 0) > 0 ? "partial" : "received", now, poId);
      }
    });
    txn();
    const rows = fetchInventory(db);
    publishChange({ shopId, entity: "inventory", action: "stock-adjust", payload: { rows }, metadata: options.metadata || {}, actor: options.actor || null });
    notifyLowStock({ shopId, rows });
    return { operations: getInventoryOperations(shopId), rows };
  } finally {
    db.close();
  }
}

function createPurchaseReturn(shopId, payload = {}, options = {}) {
  const db = openShopDatabase(shopId);
  const now = new Date().toISOString();
  const items = (Array.isArray(payload.items) ? payload.items : []).map(normalizeLineItem).filter((item) => item.inventory_code && item.quantity > 0);
  try {
    const txn = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO inventory_purchase_returns
          (return_number, supplier_id, po_id, returned_at, reason, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        payload.return_number || payload.returnNumber || `PR-${Date.now()}`,
        payload.supplier_id ?? payload.supplierId ?? null,
        payload.po_id ?? payload.poId ?? null,
        payload.returned_at ?? payload.returnedAt ?? now,
        payload.reason ?? "Purchase return",
        payload.notes ?? null,
        now,
      );
      const returnId = Number(result.lastInsertRowid);
      const insertItem = db.prepare(`
        INSERT INTO inventory_purchase_return_items
          (return_id, inventory_code, quantity, unit_cost)
        VALUES (?, ?, ?, ?)
      `);
      items.forEach((item) => {
        insertItem.run(returnId, item.inventory_code, item.quantity, item.unit_cost);
        const before = db.prepare("SELECT stock, cost_price FROM inventory WHERE inventory_code = ?").get(item.inventory_code);
        const delta = -Math.min(Number(before?.stock || 0), item.quantity);
        db.prepare("UPDATE inventory SET stock = MAX(0, COALESCE(stock, 0) + ?), updated_at = ? WHERE inventory_code = ?")
          .run(delta, now, item.inventory_code);
        const after = db.prepare("SELECT stock FROM inventory WHERE inventory_code = ?").get(item.inventory_code);
        db.prepare(`
          INSERT INTO inventory_movements
            (inventory_code, movement_type, stock_type, quantity_delta, quantity_after, unit_cost, source_type, source_id, reason, notes, created_at)
          VALUES (?, 'purchase_return', 'sellable', ?, ?, ?, 'purchase_return', ?, ?, ?, ?)
        `).run(item.inventory_code, delta, Number(after?.stock || 0), item.unit_cost || Number(before?.cost_price || 0), String(returnId), payload.reason ?? "Purchase return", payload.notes ?? null, now);
      });
    });
    txn();
    const rows = fetchInventory(db);
    publishChange({ shopId, entity: "inventory", action: "stock-adjust", payload: { rows }, metadata: options.metadata || {}, actor: options.actor || null });
    notifyLowStock({ shopId, rows });
    return { operations: getInventoryOperations(shopId), rows };
  } finally {
    db.close();
  }
}

function adjustInventoryStock(shopId, payload = {}, options = {}) {
  const item = normalizeLineItem(payload);
  if (!item.inventory_code || !Number.isFinite(item.quantity) || item.quantity === 0) {
    return { operations: getInventoryOperations(shopId), rows: [] };
  }
  const stockType = payload.stock_type || payload.stockType || "adjustment";
  const delta = payload.direction === "increase" ? Math.abs(item.quantity) : -Math.abs(item.quantity);
  const rows = applyStockAdjustments(shopId, [{
    inventory_code: item.inventory_code,
    delta,
    unit_cost: item.unit_cost,
    movement_type: "adjustment",
    stock_type: stockType,
    source_type: "adjustment",
    reason: payload.reason || stockType,
    notes: payload.notes || null,
  }], options);
  return { operations: getInventoryOperations(shopId), rows };
}

function createStockCount(shopId, payload = {}, options = {}) {
  const db = openShopDatabase(shopId);
  const now = new Date().toISOString();
  const items = Array.isArray(payload.items) ? payload.items : [];
  try {
    const txn = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO inventory_stock_counts (count_number, status, started_at, completed_at, notes)
        VALUES (?, ?, ?, ?, ?)
      `).run(payload.count_number || payload.countNumber || `SC-${Date.now()}`, payload.status || "completed", payload.started_at ?? now, payload.completed_at ?? now, payload.notes ?? null);
      const countId = Number(result.lastInsertRowid);
      const insertItem = db.prepare(`
        INSERT INTO inventory_stock_count_items
          (count_id, inventory_code, expected_quantity, counted_quantity, variance, reason)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      items.forEach((raw) => {
        const code = String(raw.inventory_code ?? raw.inventoryCode ?? "").trim();
        if (!code) return;
        const current = db.prepare("SELECT stock, cost_price FROM inventory WHERE inventory_code = ?").get(code);
        const expected = Number(current?.stock || 0);
        const counted = Number(raw.counted_quantity ?? raw.countedQuantity ?? expected);
        const variance = counted - expected;
        insertItem.run(countId, code, expected, counted, variance, raw.reason ?? null);
        db.prepare("UPDATE inventory SET stock = ?, updated_at = ? WHERE inventory_code = ?").run(Math.max(0, counted), now, code);
        db.prepare(`
          INSERT INTO inventory_movements
            (inventory_code, movement_type, stock_type, quantity_delta, quantity_after, unit_cost, source_type, source_id, reason, notes, created_at)
          VALUES (?, 'stock_count', 'sellable', ?, ?, ?, 'stock_count', ?, ?, ?, ?)
        `).run(code, variance, Math.max(0, counted), Number(current?.cost_price || 0), String(countId), raw.reason ?? "Stock count", payload.notes ?? null, now);
      });
    });
    txn();
    const rows = fetchInventory(db);
    publishChange({ shopId, entity: "inventory", action: "stock-count", payload: { rows }, metadata: options.metadata || {}, actor: options.actor || null });
    notifyLowStock({ shopId, rows });
    return { operations: getInventoryOperations(shopId), rows };
  } finally {
    db.close();
  }
}

function upsertVariant(shopId, payload = {}, options = {}) {
  const db = openShopDatabase(shopId);
  const now = new Date().toISOString();
  try {
    const id = payload.variant_id ?? payload.variantId ?? null;
    if (id) {
      db.prepare(`
        UPDATE inventory_product_variants
           SET parent_inventory_code = @parent_inventory_code, inventory_code = @inventory_code,
               name = @name, barcode_id = @barcode_id, sku = @sku, price = @price,
               cost_price = @cost_price, attributes_json = @attributes_json,
               is_active = @is_active, updated_at = @updated_at
         WHERE variant_id = @variant_id
      `).run({
        variant_id: Number(id),
        parent_inventory_code: payload.parent_inventory_code ?? payload.parentInventoryCode,
        inventory_code: payload.inventory_code ?? payload.inventoryCode,
        name: payload.name,
        barcode_id: payload.barcode_id ?? payload.barcode ?? null,
        sku: payload.sku ?? null,
        price: Number(payload.price || 0),
        cost_price: Number(payload.cost_price ?? payload.costPrice ?? 0),
        attributes_json: payload.attributes_json ?? payload.attributesJson ?? null,
        is_active: payload.is_active === false ? 0 : 1,
        updated_at: now,
      });
    } else {
      db.prepare(`
        INSERT INTO inventory_product_variants
          (parent_inventory_code, inventory_code, name, barcode_id, sku, price, cost_price, attributes_json, is_active, created_at, updated_at)
        VALUES (@parent_inventory_code, @inventory_code, @name, @barcode_id, @sku, @price, @cost_price, @attributes_json, @is_active, @created_at, @updated_at)
      `).run({
        parent_inventory_code: payload.parent_inventory_code ?? payload.parentInventoryCode,
        inventory_code: payload.inventory_code ?? payload.inventoryCode,
        name: payload.name,
        barcode_id: payload.barcode_id ?? payload.barcode ?? null,
        sku: payload.sku ?? null,
        price: Number(payload.price || 0),
        cost_price: Number(payload.cost_price ?? payload.costPrice ?? 0),
        attributes_json: payload.attributes_json ?? payload.attributesJson ?? null,
        is_active: payload.is_active === false ? 0 : 1,
        created_at: now,
        updated_at: now,
      });
    }
    publishChange({ shopId, entity: "inventory_operations", action: "variant-upsert", payload: {}, metadata: options.metadata || {}, actor: options.actor || null });
    return getInventoryOperations(shopId);
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
  getInventoryOperations,
  upsertSupplier,
  createPurchaseOrder,
  receiveGoods,
  createPurchaseReturn,
  adjustInventoryStock,
  createStockCount,
  upsertVariant,
};
