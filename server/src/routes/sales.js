import { Router } from "express";
import { openDb, dbExists } from "../utils/db.js";
import {
  adjustStockLevels,
  normalizeProduct,
} from "../services/inventory-service.js";
import { publishChange } from "../realtime/change-bus.js";

const router = Router();

// --- 1. SECURITY: Input Validation Helper ---
const validateSalePayload = (body) => {
  const errors = [];
  if (!body.shopId || typeof body.shopId !== 'string') errors.push("Invalid shopId");
  if (!Array.isArray(body.items) || body.items.length === 0) errors.push("Items array is empty");
  if (typeof body.total !== 'number' || body.total < 0) errors.push("Invalid total amount");
  
  // Security: Max limit to prevent payload flooding
  if (body.items.length > 500) errors.push("Too many items in one transaction");
  
  return errors;
};

// --- 2. PERFORMANCE: Database Optimization Helper ---
const optimizeDb = (db) => {
  // WAL mode allows simultaneous readers/writers (Huge speed boost)
  db.pragma('journal_mode = WAL'); 
  // Sync NORMAL is safe for WAL and much faster than FULL
  db.pragma('synchronous = NORMAL');
  // Cache size increased for memory speed
  db.pragma('cache_size = -64000'); // ~64MB cache
  
  // Ensure Indices exist for fast lookups (Idempotent)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
    CREATE INDEX IF NOT EXISTS idx_inventory_code ON inventory(inventory_code);
    CREATE INDEX IF NOT EXISTS idx_daily_sales_date ON daily_sales(shop_id, date);
  `);
};

router.post("/complete", (req, res) => {
  // 1. Validate Inputs (Security Layer)
  const validationErrors = validateSalePayload(req.body);
  if (validationErrors.length > 0) {
    return res.status(400).json({ ok: false, error: "validation_error", details: validationErrors });
  }

  const {
    shopId,
    customer = {},
    items = [],
    subtotal = 0,
    discount = 0,
    tax = 0,
    total = 0,
    pointsEarned = 0,
    paymentMethod = "cash",
    createdAt,
  } = req.body;

  if (!dbExists(shopId)) {
    return res.status(404).json({ ok: false, error: "shop_not_configured" });
  }

  let db;
  try {
    db = openDb(shopId);
    // 2. Apply Speed Optimizations immediately upon opening
    optimizeDb(db);
  } catch (err) {
    console.error("complete sale failed: unable to open shop db", err);
    return res.status(500).json({ ok: false, error: "database_unavailable" });
  }

  let transactionId = null;
  let customerId = null;
  let transactionDate = null;
  let inventoryRows = [];

  try {
    // 3. The Transaction (Atomic & Fast)
    const result = db.transaction(() => {
      // --- A. Customer Upsert (with Points) ---
      let localCustomerId = null;

      if (customer?.email || customer?.phone || customer?.name) {
        // High-speed lookup using the INDEX we created
        const found = db.prepare(`
            SELECT customer_id FROM customers
            WHERE (email = ? AND email IS NOT NULL)
               OR (phone = ? AND phone IS NOT NULL)
            LIMIT 1
          `).get(customer.email ?? null, customer.phone ?? null);

        const effectiveDate = createdAt || new Date().toISOString();

        if (found?.customer_id) {
          localCustomerId = found.customer_id;
          db.prepare(`
            UPDATE customers
            SET name = COALESCE(?, name),
                email = COALESCE(?, email),
                phone = COALESCE(?, phone),
                total_spent = COALESCE(total_spent, 0) + ?,
                visit_count = COALESCE(visit_count, 0) + 1,
                points_balance = COALESCE(points_balance, 0) + ?,
                last_visit = ?
            WHERE customer_id = ?
          `).run(
            customer.name ?? null, 
            customer.email ?? null, 
            customer.phone ?? null, 
            total, 
            pointsEarned, 
            effectiveDate, 
            localCustomerId
          );
        } else {
          const info = db.prepare(`
              INSERT INTO customers (
                name, email, phone,
                total_spent, visit_count, last_visit,
                points_balance, created_at
              )
              VALUES (?, ?, ?, ?, 1, ?, ?, ?)
            `).run(
              customer.name ?? null, 
              customer.email ?? null, 
              customer.phone ?? null, 
              total, 
              effectiveDate, 
              pointsEarned, 
              effectiveDate
            );
          localCustomerId = Number(info.lastInsertRowid);
        }
      }

      customerId = localCustomerId;

      // --- B. Create Transaction Header ---
      const txInfo = db.prepare(`
          INSERT INTO transactions (
            receipt_id, transaction_code, customer_id,
            subtotal, discount, tax, total, payment_method, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          cryptoRandom(), 
          cryptoRandom(), 
          localCustomerId, 
          subtotal, discount, tax, total, paymentMethod, 
          createdAt || new Date().toISOString()
        );

      const newTransactionId = Number(txInfo.lastInsertRowid);
      transactionId = newTransactionId;

      // --- C. Insert Items & Calculate Stock ---
      const insertItem = db.prepare(`
        INSERT INTO transaction_items (
          transaction_id, item_id, inventory_code, quantity, unit_price, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      let topItemName = null;
      let topQty = -1;
      const stockAdjustments = [];

      // Pre-compile normalization to save CPU cycles inside loop
      for (const it of items) {
        const qty = Number(it.quantity ?? 0);
        const unit = Number(it.unit_price ?? it.price ?? 0);
        const line = unit * qty;

        // Use supplied code or normalize (CPU intensive, so check first)
        const inventoryCode = it.inventory_code ?? it.inventoryCode ?? normalizeProduct(it).inventory_code;

        insertItem.run(newTransactionId, it.item_id ?? null, inventoryCode ?? null, qty, unit, line);

        if (qty > topQty) {
          topQty = qty;
          topItemName = it.name ?? inventoryCode ?? "N/A";
        }
        
        if (inventoryCode && qty > 0) {
          stockAdjustments.push({ inventory_code: inventoryCode, delta: -qty });
        }
      }

      // --- D. Update Stock (Inventory Service) ---
      let updatedInventoryRows = []; // <--- FIXED: Declared variable here
      if (stockAdjustments.length) {
        updatedInventoryRows = adjustStockLevels(db, stockAdjustments) || [];
      }
      inventoryRows = updatedInventoryRows;

      // --- E. Update Daily Sales (Aggregated) ---
      const day = (createdAt ? new Date(createdAt) : new Date()).toISOString().slice(0, 10);
      transactionDate = day;

      db.prepare(`
        INSERT INTO daily_sales (shop_id, date, total_sales, transactions_count, top_item)
        VALUES (?, ?, ?, 1, ?)
        ON CONFLICT(shop_id, date) DO UPDATE SET
          total_sales = COALESCE(total_sales, 0) + ?,
          transactions_count = COALESCE(transactions_count, 0) + 1,
          top_item = COALESCE(top_item, excluded.top_item)
      `).run(shopId, day, total, topItemName, total);

      return { transactionId: newTransactionId, customerId: localCustomerId, date: day };
    })();

    // 4. Quick Response (Don't wait for Realtime Publish)
    res.json({
      ok: true,
      transactionId: result.transactionId,
      customerId: result.customerId,
      date: result.date,
    });

    // 5. Background Process: Realtime Updates (Non-blocking)
    setImmediate(() => {
      try {
        // Fetch fresh data for UI updates
        const transactionRow = db.prepare("SELECT * FROM transactions WHERE transaction_id = ?").get(result.transactionId);
        const transactionItems = db.prepare("SELECT * FROM transaction_items WHERE transaction_id = ?").all(result.transactionId);
        const dailySalesRow = db.prepare("SELECT * FROM daily_sales WHERE shop_id = ? AND date = ?").get(shopId, result.date);
        
        publishChange({
          shopId,
          entity: "transactions",
          action: "created",
          payload: { transaction: transactionRow, items: transactionItems },
        });

        if (inventoryRows.length) {
          publishChange({
            shopId,
            entity: "inventory",
            action: "stock-adjust",
            payload: { rows: inventoryRows },
            metadata: { source: "sale" },
          });
        }

        if (dailySalesRow) {
          publishChange({
            shopId,
            entity: "daily_sales",
            action: "upsert",
            payload: { row: dailySalesRow },
          });
        }

        if (result.customerId) {
          const customerRow = db.prepare("SELECT * FROM customers WHERE customer_id = ?").get(result.customerId);
          if (customerRow) {
            publishChange({
              shopId,
              entity: "customers",
              action: "upsert",
              payload: { row: customerRow },
            });
          }
        }
      } catch (notifyErr) {
        console.warn("Background realtime update failed (Sale was successful though):", notifyErr);
      } finally {
        if(db && db.open) db.close(); // Close DB connection after background work is done
      }
    });

  } catch (err) {
    console.error("complete sale failed", err);
    if(db && db.open) db.close(); // Ensure close on error
    res.status(500).json({ ok: false, error: "sale_failed" });
  }
});

function cryptoRandom() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export default router;