import { Router } from "express";
import { openShopDatabase, shopDatabaseExists } from "../utils/shop-database.js";
import { adjustStockLevels, normalizeProduct } from "../services/inventory-service.js";
import { publishChange } from "../realtime/change-bus.js";
import { notifySaleCompleted } from "../services/notification-service.js";
import { recordMemberSaleStats } from "../services/member-stats-service.js";
import { requireClerkSession } from "../middleware/clerk-auth.js";
import crypto from "crypto";

const router = Router();

router.use(requireClerkSession);

// --- 1) SECURITY: Validate inputs ---
const validatePayload = (body) => {
  const errors = [];
  if (!body.shopId || typeof body.shopId !== "string") errors.push("Invalid shopId");
  if (!Array.isArray(body.items) || body.items.length === 0) errors.push("Items array is empty");
  if (body.items?.length > 500) errors.push("Too many items (limit 500)");
  return errors;
};

// --- 2) PERFORMANCE: Connection tuning only (safe to run per request) ---
const configureConnection = (db) => {
  db.pragma("busy_timeout = 5000");
  db.pragma("synchronous = NORMAL");
  // NOTE: journal_mode=WAL should be enabled at DB init/startup ideally.
};

const cleanString = (v) => (v === undefined || v === null ? null : String(v).trim());

const normalizeCustomer = (customer = {}) => ({
  name: customer.name ? cleanString(customer.name) : null,
  email: customer.email ? cleanString(customer.email).toLowerCase() : null,
  phone: customer.phone ? cleanString(customer.phone).replace(/\s+/g, "") : null,
});

const safeNumber = (v, min = 0) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, n);
};

router.post("/complete", (req, res) => {
  // 1) Fast validation
  const validationErrors = validatePayload(req.body);
  if (validationErrors.length) {
    return res.status(400).json({
      ok: false,
      error: "validation_error",
      details: validationErrors,
    });
  }

  const { shopId, customer = {}, items = [], paymentMethod = "cash", createdAt } = req.body;
  const servedBy = req.body?.servedBy || {};

  if (!shopDatabaseExists(shopId)) {
    return res.status(404).json({ ok: false, error: "shop_not_configured" });
  }

  // 2) Sanitize numeric inputs
  const discount = safeNumber(req.body.discount, 0);
  const tax = safeNumber(req.body.tax, 0);

  // Prevent abuse (still better if you compute points from total)
  const pointsEarned = Math.min(5000, safeNumber(req.body.pointsEarned, 0));
  const pointsRedeemed = safeNumber(req.body.pointsRedeemed, 0);

  const effectiveDate = createdAt || new Date().toISOString();

  // 3) Backend recalculation (trust no frontend totals)
  let calculatedSubtotal = 0;

  const cleanItems = items.map((item) => {
    const qty = safeNumber(item.quantity, 0);
    const price = safeNumber(item.unit_price ?? item.price, 0);
    const lineTotal = qty * price;
    calculatedSubtotal += lineTotal;

    const inventoryCode =
      item.inventory_code ?? item.inventoryCode ?? normalizeProduct(item).inventory_code ?? null;

    return {
      ...item,
      quantity: qty,
      unit_price: price,
      subtotal: lineTotal,
      inventoryCode,
    };
  });

  // Strict rule: inventoryCode required
  const missingCodes = cleanItems.filter((it) => !it.inventoryCode);
  if (missingCodes.length) {
    return res.status(400).json({
      ok: false,
      error: "invalid_item",
      message: "One or more items are missing inventory_code",
    });
  }

  const cleanCustomer = normalizeCustomer(customer);

  let db;
  try {
    db = openShopDatabase(shopId);
    configureConnection(db);
  } catch (err) {
    console.error("complete sale failed: db error", err);
    return res.status(500).json({ ok: false, error: "database_unavailable" });
  }

  // Convert redeemed points into a monetary discount using the shop's redeem
  // rate, so the recorded total matches what the customer actually pays.
  // (Previously redemption reduced the customer's points but not the total.)
  let redeemRate = 0.01;
  try {
    const loyaltyRow = db
      .prepare("SELECT redeem_rate FROM business_rules_loyalty WHERE shop_id = ?")
      .get(shopId);
    if (loyaltyRow && Number.isFinite(Number(loyaltyRow.redeem_rate))) {
      redeemRate = Number(loyaltyRow.redeem_rate);
    }
  } catch (err) {
    console.warn("Failed to read redeem rate, using default", err);
  }
  const redemptionValue = pointsRedeemed * redeemRate;
  const finalTotal = Math.max(
    0,
    calculatedSubtotal - discount + tax - redemptionValue,
  );

  try {
    const result = db.transaction(() => {
      // --- A) CUSTOMER UPSERT (NO RETURNING, compatible) ---
      let localCustomerId = null;
      let customerRow = null;

      if (cleanCustomer.email || cleanCustomer.phone || cleanCustomer.name) {
        let existing = null;

        // Email priority (safer)
        if (cleanCustomer.email) {
          existing = db.prepare("SELECT * FROM customers WHERE email = ?").get(cleanCustomer.email);
        }
        if (!existing && cleanCustomer.phone) {
          existing = db.prepare("SELECT * FROM customers WHERE phone = ?").get(cleanCustomer.phone);
        }

        const netPointsChange = pointsEarned - pointsRedeemed;

        if (existing) {
          localCustomerId = existing.customer_id;

          const currentBalance = Number(existing.points_balance) || 0;
          if (pointsRedeemed > currentBalance) {
            throw new Error("INSUFFICIENT_POINTS");
          }

          db.prepare(
            `
            UPDATE customers
               SET name = COALESCE(?, name),
                   email = COALESCE(?, email),
                   phone = COALESCE(?, phone),
                   total_spent = COALESCE(total_spent, 0) + ?,
                   visit_count = COALESCE(visit_count, 0) + 1,
                   points_balance = MAX(0, COALESCE(points_balance, 0) + ?),
                   last_visit = ?
             WHERE customer_id = ?
          `
          ).run(
            cleanCustomer.name,
            cleanCustomer.email,
            cleanCustomer.phone,
            finalTotal,
            netPointsChange,
            effectiveDate,
            localCustomerId
          );

          customerRow = db
            .prepare("SELECT * FROM customers WHERE customer_id = ?")
            .get(localCustomerId);
        } else {
          // New customer cannot redeem
          if (pointsRedeemed > 0) throw new Error("NEW_CUSTOMER_CANNOT_REDEEM");

          const info = db
            .prepare(
              `
              INSERT INTO customers (
                name, email, phone,
                total_spent, visit_count, last_visit,
                points_balance, created_at
              )
              VALUES (?, ?, ?, ?, 1, ?, ?, ?)
            `
            )
            .run(
              cleanCustomer.name,
              cleanCustomer.email,
              cleanCustomer.phone,
              finalTotal,
              effectiveDate,
              pointsEarned,
              effectiveDate
            );

          localCustomerId = Number(info.lastInsertRowid);
          customerRow = db
            .prepare("SELECT * FROM customers WHERE customer_id = ?")
            .get(localCustomerId);
        }
      } else {
        // Guest cannot redeem points
        if (pointsRedeemed > 0) throw new Error("GUEST_CANNOT_REDEEM");
      }

      // --- B) TRANSACTION HEADER ---
      const receiptId = crypto.randomUUID();
      const transactionCode = crypto.randomUUID().split("-")[0].toUpperCase();

      const txInfo = db
        .prepare(
          `
          INSERT INTO transactions (
            receipt_id, transaction_code, customer_id,
            subtotal, discount, tax, total, payment_method, created_at,
            terminal_id, served_by_member_id, served_by_display_name, served_by_role
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        )
        .run(
          receiptId,
          transactionCode,
          localCustomerId,
          calculatedSubtotal,
          discount,
          tax,
          finalTotal,
          paymentMethod,
          effectiveDate,
          servedBy.terminalId || null,
          servedBy.memberId || null,
          servedBy.displayName || null,
          servedBy.role || null,
        );

      const transactionId = Number(txInfo.lastInsertRowid);

      const transactionRow = {
        transaction_id: transactionId,
        receipt_id: receiptId,
        transaction_code: transactionCode,
        customer_id: localCustomerId,
        subtotal: calculatedSubtotal,
        discount,
        tax,
        total: finalTotal,
        payment_method: paymentMethod,
        created_at: effectiveDate,
        terminal_id: servedBy.terminalId || null,
        served_by_member_id: servedBy.memberId || null,
        served_by_display_name: servedBy.displayName || null,
        served_by_role: servedBy.role || null,
      };

      // --- C) ITEMS + STOCK ---
      const insertItem = db.prepare(`
        INSERT INTO transaction_items (
          transaction_id, item_id, inventory_code, quantity, unit_price, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      const requestedQtyByCode = new Map();
      for (const it of cleanItems) {
        requestedQtyByCode.set(
          it.inventoryCode,
          (requestedQtyByCode.get(it.inventoryCode) || 0) + it.quantity,
        );
      }

      const stockCheck = db.prepare(
        "SELECT inventory_code, stock FROM inventory WHERE inventory_code = ?"
      );
      for (const [code, requestedQty] of requestedQtyByCode.entries()) {
        const row = stockCheck.get(code);
        if (!row) {
          throw new Error(`UNKNOWN_PRODUCT:${code}`);
        }
        const available = Number(row.stock || 0);
        if (requestedQty > available) {
          throw new Error(`OUT_OF_STOCK:${code}:${available}`);
        }
      }

      let topItemName = null;
      let topQty = -1;
      const stockAdjustments = [];
      const savedItems = [];

      for (const it of cleanItems) {
        insertItem.run(
          transactionId,
          it.item_id ?? null,
          it.inventoryCode,
          it.quantity,
          it.unit_price,
          it.subtotal
        );

        savedItems.push({
          transaction_id: transactionId,
          item_id: it.item_id ?? null,
          inventory_code: it.inventoryCode,
          quantity: it.quantity,
          unit_price: it.unit_price,
          subtotal: it.subtotal,
        });

        if (it.quantity > topQty) {
          topQty = it.quantity;
          topItemName = it.name ?? it.inventoryCode ?? "N/A";
        }

        if (it.quantity > 0) {
          stockAdjustments.push({ inventory_code: it.inventoryCode, delta: -it.quantity });
        }
      }

      let inventoryRows = [];
      if (stockAdjustments.length) {
        inventoryRows = adjustStockLevels(db, stockAdjustments) || [];
      }

      // --- D) DAILY SALES (NO RETURNING) ---
      const day = effectiveDate.split("T")[0];

      db.prepare(
        `
        INSERT INTO daily_sales (shop_id, date, total_sales, transactions_count, top_item)
        VALUES (?, ?, ?, 1, ?)
        ON CONFLICT(shop_id, date) DO UPDATE SET
          total_sales = COALESCE(total_sales, 0) + ?,
          transactions_count = COALESCE(transactions_count, 0) + 1,
          top_item = excluded.top_item
      `
      ).run(shopId, day, finalTotal, topItemName, finalTotal);

      const dailySalesRow = db
        .prepare("SELECT * FROM daily_sales WHERE shop_id = ? AND date = ?")
        .get(shopId, day);

      if (servedBy.memberId) {
        recordMemberSaleStats(db, shopId, servedBy.memberId, {
          total: finalTotal,
          itemsSold: cleanItems.reduce((sum, item) => sum + item.quantity, 0),
          date: day,
        });
      }

      return {
        transactionId,
        transactionRow,
        transactionItems: savedItems,
        dailySalesRow,
        inventoryRows,
        customerRow,
        date: day,
      };
    })();

    // ✅ Close DB immediately (fast)
    if (db) db.close();

    // ✅ Response
    res.json({
      ok: true,
      transactionId: result.transactionId,
      customerId: result.customerRow ? result.customerRow.customer_id : null,
      date: result.date,
    });

    // ✅ Realtime updates (no DB reads)
    setImmediate(() => {
      try {
        publishChange({
          shopId,
          entity: "transactions",
          action: "created",
          payload: {
            transaction: result.transactionRow,
            items: result.transactionItems,
          },
        });

        if (result.inventoryRows?.length) {
          publishChange({
            shopId,
            entity: "inventory",
            action: "stock-adjust",
            payload: { rows: result.inventoryRows },
            metadata: { source: "sale" },
          });
        }

        if (result.dailySalesRow) {
          publishChange({
            shopId,
            entity: "daily_sales",
            action: "upsert",
            payload: { row: result.dailySalesRow },
          });
        }

        if (result.customerRow) {
          publishChange({
            shopId,
            entity: "customers",
            action: "upsert",
            payload: { row: result.customerRow },
          });
        }

        notifySaleCompleted({
          shopId,
          transactionId: result.transactionId,
          total: result.transactionRow?.total,
          itemCount: result.transactionItems?.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
          servedBy: result.transactionRow?.served_by_display_name,
        });
      } catch (notifyErr) {
        console.warn("Realtime update failed:", notifyErr);
      }
    });
  } catch (err) {
    console.error("complete sale failed", err);
    if (db && db.open) db.close();

    if (err.message === "INSUFFICIENT_POINTS") {
      return res.status(400).json({
        ok: false,
        error: "insufficient_points",
        message: "Insufficient points balance.",
      });
    }

    if (err.message === "NEW_CUSTOMER_CANNOT_REDEEM") {
      return res.status(400).json({
        ok: false,
        error: "invalid_points_redemption",
        message: "Cannot redeem points for a new customer.",
      });
    }

    if (err.message === "GUEST_CANNOT_REDEEM") {
      return res.status(400).json({
        ok: false,
        error: "invalid_points_redemption",
        message: "Guest checkout cannot redeem points.",
      });
    }

    if (String(err.message || "").startsWith("OUT_OF_STOCK:")) {
      const [, inventoryCode, available] = String(err.message).split(":");
      return res.status(409).json({
        ok: false,
        error: "out_of_stock",
        inventoryCode,
        available: Number(available || 0),
        message: `Not enough stock for ${inventoryCode}. Available: ${available || 0}.`,
      });
    }

    if (String(err.message || "").startsWith("UNKNOWN_PRODUCT:")) {
      const [, inventoryCode] = String(err.message).split(":");
      return res.status(400).json({
        ok: false,
        error: "unknown_product",
        inventoryCode,
        message: `Product ${inventoryCode} no longer exists.`,
      });
    }

    res.status(500).json({ ok: false, error: "sale_failed" });
  }
});

export default router;
