import { Router } from "express";
import { openDb, dbExists } from "../utils/db.js";
import {
  adjustStockLevels,
  normalizeProduct,
} from "../services/inventory-service.js";
import { publishChange } from "../realtime/change-bus.js";

const router = Router();

router.post("/complete", (req, res) => {
  const {
    shopId,
    customer = {},
    items = [],
    subtotal = 0,
    discount = 0,
    tax = 0,
    total = 0,
    paymentMethod = "cash",
    createdAt,
  } = req.body;

  if (!shopId || !items.length || total === undefined) {
    return res.status(400).json({ ok: false, error: "invalid_payload" });
  }

  if (!dbExists(shopId)) {
    return res.status(404).json({ ok: false, error: "shop_not_configured" });
  }

  let db;

  try {
    db = openDb(shopId);
  } catch (err) {
    console.error("complete sale failed: unable to open shop db", err);
    return res
      .status(500)
      .json({ ok: false, error: "database_unavailable" });
  }

  let transactionId = null;
  let customerId = null;
  let transactionDate = null;
  let inventoryRows = [];

  try {
    const result = db.transaction(() => {
      let localCustomerId = null;
      if (customer?.email || customer?.phone) {
        const found = db
          .prepare(
            `
          SELECT customer_id FROM customers
          WHERE (email = ? AND email IS NOT NULL) OR (phone = ? AND phone IS NOT NULL)
          LIMIT 1
        `
          )
          .get(customer.email ?? null, customer.phone ?? null);

        if (found?.customer_id) {
          localCustomerId = found.customer_id;
          db.prepare(
            `
            UPDATE customers
               SET name = COALESCE(?, name),
                   email = COALESCE(?, email),
                   phone = COALESCE(?, phone),
                   total_spent = COALESCE(total_spent,0) + ?,
                   visit_count = COALESCE(visit_count,0) + 1,
                   last_visit = ?
             WHERE customer_id = ?
          `
          ).run(
            customer.name ?? null,
            customer.email ?? null,
            customer.phone ?? null,
            total,
            createdAt || new Date().toISOString(),
            localCustomerId
          );
        } else {
          const info = db
            .prepare(
              `
            INSERT INTO customers (name, email, phone, total_spent, visit_count, last_visit, created_at)
            VALUES (?, ?, ?, ?, 1, ?, ?)
          `
            )
            .run(
              customer.name ?? null,
              customer.email ?? null,
              customer.phone ?? null,
              total,
              createdAt || new Date().toISOString(),
              createdAt || new Date().toISOString()
            );
          localCustomerId = Number(info.lastInsertRowid);
        }
      }

      const txInfo = db
        .prepare(
          `
        INSERT INTO transactions (receipt_id, transaction_code, customer_id,
                                  subtotal, discount, tax, total, payment_method, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
        )
        .run(
          cryptoRandom(),
          cryptoRandom(),
          localCustomerId,
          subtotal,
          discount,
          tax,
          total,
          paymentMethod,
          createdAt || new Date().toISOString()
        );

      const newTransactionId = Number(txInfo.lastInsertRowid);

      const insertItem = db.prepare(`
        INSERT INTO transaction_items (transaction_id, item_id, inventory_code, quantity, unit_price, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      let topItemName = null;
      let topQty = -1;
      const stockAdjustments = [];

      for (const it of items) {
        const qty = Number(it.quantity);
        const unit = Number(it.unit_price ?? it.price ?? 0);
        const line = unit * qty;
        const inventoryCode =
          it.inventory_code ?? it.inventoryCode ?? normalizeProduct(it).inventory_code;

        insertItem.run(
          newTransactionId,
          it.item_id ?? null,
          inventoryCode ?? null,
          qty,
          unit,
          line
        );

        if (qty > topQty) {
          topQty = qty;
          topItemName = it.name ?? inventoryCode ?? "N/A";
        }

        if (inventoryCode) {
          stockAdjustments.push({ inventory_code: inventoryCode, delta: -qty });
        }
      }

      let updatedInventoryRows = [];
      if (stockAdjustments.length) {
        updatedInventoryRows = adjustStockLevels(db, stockAdjustments);
      }

      const day = (createdAt ? new Date(createdAt) : new Date())
        .toISOString()
        .slice(0, 10);

      const existingDaily = db
        .prepare(
          `SELECT rowid AS rid, total_sales, transactions_count FROM daily_sales WHERE date = ?`
        )
        .get(day);

      if (existingDaily?.rid) {
        db.prepare(
          `
          UPDATE daily_sales
             SET total_sales = COALESCE(total_sales,0) + ?,
                 transactions_count = COALESCE(transactions_count,0) + 1,
                 top_item = COALESCE(top_item, ?)
           WHERE date = ?
        `
        ).run(total, topItemName, day);
      } else {
        db.prepare(
          `
          INSERT INTO daily_sales (date, total_sales, transactions_count, top_item)
          VALUES (?, ?, 1, ?)
        `
        ).run(day, total, topItemName);
      }

      return {
        transactionId: newTransactionId,
        customerId: localCustomerId,
        date: day,
        inventoryRows: updatedInventoryRows,
      };
    })();

    transactionId = result.transactionId;
    customerId = result.customerId;
    transactionDate = result.date;
    inventoryRows = result.inventoryRows ?? [];

    let transactionRow = null;
    let transactionItems = [];
    let dailySalesRow = null;

    try {
      transactionRow = db
        .prepare("SELECT * FROM transactions WHERE transaction_id = ?")
        .get(transactionId);
      transactionItems = db
        .prepare("SELECT * FROM transaction_items WHERE transaction_id = ?")
        .all(transactionId);
      dailySalesRow = db
        .prepare("SELECT * FROM daily_sales WHERE date = ?")
        .get(transactionDate);
    } catch (lookupErr) {
      console.error("sale lookup failed", lookupErr);
    }

    res.json({
      ok: true,
      transactionId,
      customerId,
      date: transactionDate,
    });

    try {
      publishChange({
        shopId,
        entity: "transactions",
        action: "created",
        payload: {
          transaction: transactionRow,
          items: transactionItems,
        },
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

      if (customerId) {
        const customerRow = db
          .prepare("SELECT * FROM customers WHERE customer_id = ?")
          .get(customerId);

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
      console.warn("Failed to publish realtime updates after sale", notifyErr);
    }
  } catch (err) {
    console.error("complete sale failed", err);
    res.status(500).json({ ok: false, error: "sale_failed" });
  } finally {
    if (db) {
      db.close();
    }
  }
});

function cryptoRandom() {
  return (
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  );
}

export default router;
