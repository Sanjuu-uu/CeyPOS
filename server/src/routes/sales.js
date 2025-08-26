const { Router } = require("express");
const { openDb } = require("../db/db"); // adjust path if different
const router = Router();

router.post("/complete", (req, res) => {
  const {
    shopId,
    customer = {}, // { name, email, phone } optional
    items = [], // [{ item_id, inventory_code, name, unit_price, quantity }]
    subtotal = 0,
    discount = 0,
    tax = 0,
    total = 0,
    paymentMethod = "cash", // 'cash' | 'card' | 'qr' | ...
    createdAt, // optional ISO string
  } = req.body;

  if (!shopId || !items.length || total === undefined) {
    return res.status(400).json({ ok: false, error: "invalid_payload" });
  }

  const db = openDb(shopId);
  try {
    const result = db.transaction(() => {
      // 1) upsert customer (by email or phone if present)
      let customerId = null;
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
          customerId = found.customer_id;
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
            customerId
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
          customerId = Number(info.lastInsertRowid);
        }
      }

      // 2) insert into transactions
      const txInfo = db
        .prepare(
          `
        INSERT INTO transactions (receipt_id, transaction_code, customer_id,
                                  subtotal, discount, tax, total, payment_method, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
        )
        .run(
          cryptoRandom(), // receipt_id
          cryptoRandom(), // transaction_code
          customerId,
          subtotal,
          discount,
          tax,
          total,
          paymentMethod,
          createdAt || new Date().toISOString()
        );
      const transactionId = Number(txInfo.lastInsertRowid);

      // 3) insert line items
      const insItem = db.prepare(`
        INSERT INTO transaction_items (transaction_id, item_id, inventory_code, quantity, unit_price, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      let topItemName = null;
      let topQty = -1;

      for (const it of items) {
        const qty = Number(it.quantity);
        const unit = Number(it.unit_price ?? it.price ?? 0);
        const line = unit * qty;

        insItem.run(
          transactionId,
          it.item_id ?? null,
          it.inventory_code ?? null,
          qty,
          unit,
          line
        );

        if (qty > topQty) {
          topQty = qty;
          topItemName = it.name ?? it.inventory_code ?? "N/A";
        }

        // optional: decrement inventory stock here if you want
        // db.prepare(`UPDATE inventory SET stock = COALESCE(stock,0) - ? WHERE item_id = ?`)
        //   .run(qty, it.item_id);
      }

      // 4) update daily_sales aggregate for that calendar day
      const day = (createdAt ? new Date(createdAt) : new Date())
        .toISOString()
        .slice(0, 10); // YYYY-MM-DD

      const existing = db
        .prepare(
          `SELECT rowid AS rid, total_sales, transactions_count FROM daily_sales WHERE date = ?`
        )
        .get(day);
      if (existing?.rid) {
        db.prepare(
          `
          UPDATE daily_sales
             SET total_sales = COALESCE(total_sales,0) + ?,
                 transactions_count = COALESCE(transactions_count,0) + 1,
                 top_item = COALESCE(top_item, ?) -- keep existing if already set; or replace with ? to update
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

      return { transactionId, customerId, date: day };
    })();

    res.json({ ok: true, ...result });
  } catch (e) {
    console.error("complete sale failed:", e);
    res.status(500).json({ ok: false, error: "sale_failed" });
  } finally {
    db.close();
  }
});

function cryptoRandom() {
  return (
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  );
}

module.exports = router;
