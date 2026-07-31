import { Router } from "express";
import { openShopDatabase, shopDatabaseExists } from "../utils/shop-database.js";
import { publishChange } from "../realtime/change-bus.js";
import { notifySaleCompleted } from "../services/notification-service.js";
import { recordMemberSaleStats } from "../services/member-stats-service.js";
import { requireClerkSession } from "../middleware/clerk-auth.js";
import crypto from "crypto";

const router = Router();

router.use(requireClerkSession);

const CHECKOUT_DISCOUNT_MANAGER_THRESHOLD_BPS = 1500; // 15%

const validatePayload = (body) => {
  const errors = [];
  if (!body.shopId || typeof body.shopId !== "string") errors.push("Invalid shopId");
  if (!body.idempotencyKey || typeof body.idempotencyKey !== "string") {
    errors.push("Missing idempotencyKey");
  }
  if (!Array.isArray(body.items) || body.items.length === 0) errors.push("Items array is empty");
  if (body.items?.length > 500) errors.push("Too many items (limit 500)");
  return errors;
};

const configureConnection = (db) => {
  db.pragma("busy_timeout = 5000");
  db.pragma("synchronous = NORMAL");
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

const safeInteger = (v, min = 0) => Math.trunc(safeNumber(v, min));
const toCents = (v) => Math.round(safeNumber(v, 0) * 100);
const fromCents = (v) => Number((Number(v || 0) / 100).toFixed(2));
const centsFromRate = (baseCents, rate) => Math.round(baseCents * (safeNumber(rate, 0) / 100));

const cleanIdempotencyKey = (value) => {
  const key = String(value || "").trim();
  if (!key || key.length > 120) return null;
  return key;
};

const stringifySafe = (value) => {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

const writeCheckoutAudit = (db, {
  shopId,
  idempotencyKey,
  transactionId = null,
  invoiceNumber = null,
  action,
  status,
  servedBy = {},
  request,
  result,
  message = null,
  req,
}) => {
  try {
    db.prepare(`
      INSERT INTO checkout_audit_records (
        shop_id, idempotency_key, transaction_id, invoice_number,
        action, status, actor_member_id, actor_role, terminal_id,
        request_json, result_json, message, ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      shopId,
      idempotencyKey || null,
      transactionId,
      invoiceNumber,
      action,
      status,
      servedBy.memberId || null,
      servedBy.role || null,
      servedBy.terminalId || null,
      stringifySafe(request),
      stringifySafe(result),
      message,
      req?.ip || null,
      req?.headers?.["user-agent"] || null,
      new Date().toISOString(),
    );
  } catch (auditErr) {
    console.warn("checkout audit write failed", auditErr);
  }
};

const getExistingSaleByIdempotency = (db, idempotencyKey) => {
  if (!idempotencyKey) return null;
  return db.prepare(`
    SELECT transaction_id, invoice_number, receipt_id, transaction_code, customer_id, total, total_cents, created_at
      FROM transactions
     WHERE idempotency_key = ?
  `).get(idempotencyKey);
};

const issueInvoiceNumber = (db, shopId, now) => {
  const row = db
    .prepare("SELECT next_sequence FROM checkout_invoice_sequences WHERE shop_id = ?")
    .get(shopId);
  const sequence = Math.max(1, safeInteger(row?.next_sequence, 1));
  if (row) {
    db.prepare(`
      UPDATE checkout_invoice_sequences
         SET next_sequence = ?, updated_at = ?
       WHERE shop_id = ?
    `).run(sequence + 1, now, shopId);
  } else {
    db.prepare(`
      INSERT INTO checkout_invoice_sequences (shop_id, next_sequence, updated_at)
      VALUES (?, ?, ?)
    `).run(shopId, sequence + 1, now);
  }
  return {
    invoiceSequence: sequence,
    invoiceNumber: `INV-${String(sequence).padStart(8, "0")}`,
  };
};

router.post("/complete", (req, res) => {
  const validationErrors = validatePayload(req.body);
  if (validationErrors.length) {
    return res.status(400).json({
      ok: false,
      error: "validation_error",
      details: validationErrors,
    });
  }

  const {
    shopId,
    customer = {},
    items = [],
    paymentMethod = "cash",
    createdAt,
    selectedDiscountId = null,
    activeTaxIds = [],
    managerApproval = null,
  } = req.body;
  const servedBy = req.body?.servedBy || {};
  const idempotencyKey = cleanIdempotencyKey(req.body.idempotencyKey);
  const reservationSequence = safeInteger(req.body?.reservationSequence, 0);

  if (!idempotencyKey) {
    return res.status(400).json({ ok: false, error: "invalid_idempotency_key" });
  }

  if (!shopDatabaseExists(shopId)) {
    return res.status(404).json({ ok: false, error: "shop_not_configured" });
  }

  const pointsEarned = Math.min(5000, safeNumber(req.body.pointsEarned, 0));
  const pointsRedeemed = safeNumber(req.body.pointsRedeemed, 0);
  const effectiveDate = createdAt || new Date().toISOString();
  const cleanCustomer = normalizeCustomer(customer);

  const cleanItems = items.map((item) => {
    const quantity = safeInteger(item.quantity, 0);
    const inventoryCode = cleanString(item.inventory_code ?? item.inventoryCode ?? item.id);
    return {
      ...item,
      quantity,
      inventoryCode,
      clientUnitPriceCents: toCents(item.unit_price ?? item.price),
    };
  });

  if (cleanItems.some((it) => !it.inventoryCode || it.quantity <= 0)) {
    return res.status(400).json({
      ok: false,
      error: "invalid_item",
      message: "Each checkout item must have inventory_code and a positive integer quantity.",
    });
  }

  let db;
  try {
    db = openShopDatabase(shopId);
    configureConnection(db);
  } catch (err) {
    console.error("complete sale failed: db error", err);
    return res.status(500).json({ ok: false, error: "database_unavailable" });
  }

  try {
    const replay = getExistingSaleByIdempotency(db, idempotencyKey);
    if (replay) {
      writeCheckoutAudit(db, {
        shopId,
        idempotencyKey,
        transactionId: replay.transaction_id,
        invoiceNumber: replay.invoice_number,
        action: "checkout_replay",
        status: "ok",
        servedBy,
        request: { items: cleanItems, paymentMethod },
        result: replay,
        req,
      });
      db.close();
      return res.json({
        ok: true,
        duplicate: true,
        transactionId: replay.transaction_id,
        invoiceNumber: replay.invoice_number,
        customerId: replay.customer_id ?? null,
        date: String(replay.created_at || effectiveDate).split("T")[0],
      });
    }

    const result = db.transaction(() => {
      const alreadyCreated = getExistingSaleByIdempotency(db, idempotencyKey);
      if (alreadyCreated) {
        return { duplicate: true, replay: alreadyCreated };
      }

      const now = new Date().toISOString();
      const productByCode = new Map();
      const requestedQtyByCode = new Map();
      const fetchProduct = db.prepare(`
        SELECT item_id, inventory_code, name, price, cost_price, stock
          FROM inventory
         WHERE inventory_code = ?
      `);

      for (const it of cleanItems) {
        if (!productByCode.has(it.inventoryCode)) {
          const row = fetchProduct.get(it.inventoryCode);
          if (!row) throw new Error(`UNKNOWN_PRODUCT:${it.inventoryCode}`);
          productByCode.set(it.inventoryCode, row);
        }
        requestedQtyByCode.set(
          it.inventoryCode,
          (requestedQtyByCode.get(it.inventoryCode) || 0) + it.quantity,
        );
      }

      let subtotalCents = 0;
      const savedItems = cleanItems.map((it) => {
        const product = productByCode.get(it.inventoryCode);
        const unitPriceCents = toCents(product.price);
        const lineSubtotalCents = unitPriceCents * it.quantity;
        subtotalCents += lineSubtotalCents;
        return {
          transaction_id: null,
          item_id: product.item_id ?? null,
          inventory_code: it.inventoryCode,
          name: product.name || it.name || it.inventoryCode,
          quantity: it.quantity,
          unit_price: fromCents(unitPriceCents),
          subtotal: fromCents(lineSubtotalCents),
          unit_price_cents: unitPriceCents,
          subtotal_cents: lineSubtotalCents,
        };
      });

      const discounts = db
        .prepare("SELECT id, name, type, value FROM business_rules_discounts WHERE shop_id = ?")
        .all(shopId);
      const discountRule = selectedDiscountId
        ? discounts.find((d) => String(d.id) === String(selectedDiscountId))
        : null;
      if (selectedDiscountId && !discountRule) {
        throw new Error("INVALID_DISCOUNT_RULE");
      }
      let discountCents = 0;
      if (discountRule) {
        discountCents =
          discountRule.type === "percent"
            ? centsFromRate(subtotalCents, discountRule.value)
            : toCents(discountRule.value);
        discountCents = Math.min(discountCents, subtotalCents);
      }

      const discountBps = subtotalCents > 0 ? Math.round((discountCents / subtotalCents) * 10000) : 0;
      const managerApproved =
        ["owner", "manager"].includes(String(servedBy.role || "").toLowerCase()) ||
        ["owner", "manager"].includes(String(managerApproval?.approvedByRole || "").toLowerCase());
      if (discountCents > 0 && discountBps > CHECKOUT_DISCOUNT_MANAGER_THRESHOLD_BPS && !managerApproved) {
        throw new Error("MANAGER_APPROVAL_REQUIRED");
      }

      const taxableCents = Math.max(0, subtotalCents - discountCents);
      const selectedTaxIds = Array.isArray(activeTaxIds)
        ? activeTaxIds.map((id) => String(id))
        : [];
      const allTaxes = db
        .prepare("SELECT id, name, rate, is_default FROM business_rules_taxes WHERE shop_id = ?")
        .all(shopId);
      const appliedTaxes = selectedTaxIds.length
        ? allTaxes.filter((tax) => selectedTaxIds.includes(String(tax.id)))
        : allTaxes.filter((tax) => Number(tax.is_default) === 1);
      if (selectedTaxIds.length && appliedTaxes.length !== selectedTaxIds.length) {
        throw new Error("INVALID_TAX_RULE");
      }
      const taxCents = appliedTaxes.reduce(
        (sum, tax) => sum + centsFromRate(taxableCents, tax.rate),
        0,
      );

      const surchargeRule =
        paymentMethod === "card"
          ? db.prepare(`
              SELECT id, min_amount, type, value
                FROM business_rules_surcharges
               WHERE shop_id = ? AND min_amount <= ?
               ORDER BY id ASC
               LIMIT 1
            `).get(shopId, fromCents(taxableCents))
          : null;
      const surchargeCents = surchargeRule
        ? surchargeRule.type === "percent"
          ? centsFromRate(taxableCents, surchargeRule.value)
          : toCents(surchargeRule.value)
        : 0;

      const loyaltyRow = db
        .prepare("SELECT redeem_rate FROM business_rules_loyalty WHERE shop_id = ?")
        .get(shopId);
      const redeemRate = Number.isFinite(Number(loyaltyRow?.redeem_rate))
        ? Number(loyaltyRow.redeem_rate)
        : 0.01;
      const redemptionCents = Math.min(
        toCents(pointsRedeemed * redeemRate),
        Math.max(0, taxableCents + taxCents + surchargeCents),
      );
      const finalTotalCents = Math.max(0, taxableCents + taxCents + surchargeCents - redemptionCents);

      const submittedChecks = [
        ["subtotal", req.body.subtotal, subtotalCents],
        ["discount", req.body.discount, discountCents],
        ["tax", req.body.tax, taxCents],
        ["surcharge", req.body.surcharge, surchargeCents],
        ["total", req.body.total, finalTotalCents],
      ];
      for (const [field, submitted, expectedCents] of submittedChecks) {
        if (submitted === undefined || submitted === null) continue;
        if (Math.abs(toCents(submitted) - expectedCents) > 1) {
          throw new Error(`CHECKOUT_TOTAL_MISMATCH:${field}`);
        }
      }

      let localCustomerId = null;
      let customerRow = null;
      if (cleanCustomer.email || cleanCustomer.phone || cleanCustomer.name) {
        let existing = null;
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
          if (pointsRedeemed > currentBalance) throw new Error("INSUFFICIENT_POINTS");

          db.prepare(`
            UPDATE customers
               SET name = COALESCE(?, name),
                   email = COALESCE(?, email),
                   phone = COALESCE(?, phone),
                   total_spent = COALESCE(total_spent, 0) + ?,
                   visit_count = COALESCE(visit_count, 0) + 1,
                   points_balance = MAX(0, COALESCE(points_balance, 0) + ?),
                   last_visit = ?
             WHERE customer_id = ?
          `).run(
            cleanCustomer.name,
            cleanCustomer.email,
            cleanCustomer.phone,
            fromCents(finalTotalCents),
            netPointsChange,
            effectiveDate,
            localCustomerId,
          );
          customerRow = db.prepare("SELECT * FROM customers WHERE customer_id = ?").get(localCustomerId);
        } else {
          if (pointsRedeemed > 0) throw new Error("NEW_CUSTOMER_CANNOT_REDEEM");
          const info = db.prepare(`
            INSERT INTO customers (
              name, email, phone, total_spent, visit_count, last_visit,
              points_balance, created_at
            ) VALUES (?, ?, ?, ?, 1, ?, ?, ?)
          `).run(
            cleanCustomer.name,
            cleanCustomer.email,
            cleanCustomer.phone,
            fromCents(finalTotalCents),
            effectiveDate,
            pointsEarned,
            effectiveDate,
          );
          localCustomerId = Number(info.lastInsertRowid);
          customerRow = db.prepare("SELECT * FROM customers WHERE customer_id = ?").get(localCustomerId);
        }
      } else if (pointsRedeemed > 0) {
        throw new Error("GUEST_CANNOT_REDEEM");
      }

      const { invoiceSequence, invoiceNumber } = issueInvoiceNumber(db, shopId, now);
      const receiptId = crypto.randomUUID();
      const transactionCode = invoiceNumber;

      const txInfo = db.prepare(`
        INSERT INTO transactions (
          receipt_id, transaction_code, idempotency_key, invoice_number, invoice_sequence, customer_id,
          subtotal, discount, tax, surcharge, total,
          subtotal_cents, discount_cents, tax_cents, surcharge_cents, redemption_cents, total_cents,
          payment_method, created_at,
          terminal_id, served_by_member_id, served_by_display_name, served_by_role
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        receiptId,
        transactionCode,
        idempotencyKey,
        invoiceNumber,
        invoiceSequence,
        localCustomerId,
        fromCents(subtotalCents),
        fromCents(discountCents),
        fromCents(taxCents),
        fromCents(surchargeCents),
        fromCents(finalTotalCents),
        subtotalCents,
        discountCents,
        taxCents,
        surchargeCents,
        redemptionCents,
        finalTotalCents,
        paymentMethod,
        effectiveDate,
        servedBy.terminalId || null,
        servedBy.memberId || null,
        servedBy.displayName || null,
        servedBy.role || null,
      );

      const transactionId = Number(txInfo.lastInsertRowid);
      const insertItem = db.prepare(`
        INSERT INTO transaction_items (
          transaction_id, item_id, inventory_code, quantity, unit_price, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const item of savedItems) {
        item.transaction_id = transactionId;
        insertItem.run(
          transactionId,
          item.item_id,
          item.inventory_code,
          item.quantity,
          item.unit_price,
          item.subtotal,
        );
      }

      const updateStock = db.prepare(`
        UPDATE inventory
           SET stock = COALESCE(stock, 0) - ?,
               updated_at = ?
         WHERE inventory_code = ?
           AND COALESCE(stock, 0) >= ?
      `);
      const readStock = db.prepare("SELECT inventory_code, stock, cost_price FROM inventory WHERE inventory_code = ?");
      const inventoryRows = [];
      for (const [code, requestedQty] of requestedQtyByCode.entries()) {
        const info = updateStock.run(requestedQty, now, code, requestedQty);
        if (info.changes !== 1) {
          const row = readStock.get(code);
          throw new Error(`OUT_OF_STOCK:${code}:${Number(row?.stock || 0)}`);
        }
        const row = readStock.get(code);
        inventoryRows.push(row);
        db.prepare(`
          INSERT INTO inventory_movements (
            inventory_code, movement_type, stock_type, quantity_delta, quantity_after,
            unit_cost, source_type, source_id, reason, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          code,
          "sale",
          "sellable",
          -requestedQty,
          Number(row?.stock || 0),
          Number(row?.cost_price || 0),
          "transaction",
          String(transactionId),
          "POS sale",
          invoiceNumber,
          now,
        );
      }

      let topItemName = null;
      let topQty = -1;
      for (const item of savedItems) {
        if (item.quantity > topQty) {
          topQty = item.quantity;
          topItemName = item.name || item.inventory_code;
        }
      }

      const day = effectiveDate.split("T")[0];
      db.prepare(`
        INSERT INTO daily_sales (shop_id, date, total_sales, transactions_count, top_item)
        VALUES (?, ?, ?, 1, ?)
        ON CONFLICT(shop_id, date) DO UPDATE SET
          total_sales = COALESCE(total_sales, 0) + ?,
          transactions_count = COALESCE(transactions_count, 0) + 1,
          top_item = excluded.top_item
      `).run(shopId, day, fromCents(finalTotalCents), topItemName, fromCents(finalTotalCents));

      const dailySalesRow = db
        .prepare("SELECT * FROM daily_sales WHERE shop_id = ? AND date = ?")
        .get(shopId, day);

      if (servedBy.memberId) {
        recordMemberSaleStats(db, shopId, servedBy.memberId, {
          total: fromCents(finalTotalCents),
          itemsSold: cleanItems.reduce((sum, item) => sum + item.quantity, 0),
          date: day,
        });
      }

      const transactionRow = {
        transaction_id: transactionId,
        receipt_id: receiptId,
        transaction_code: transactionCode,
        idempotency_key: idempotencyKey,
        invoice_number: invoiceNumber,
        invoice_sequence: invoiceSequence,
        customer_id: localCustomerId,
        subtotal: fromCents(subtotalCents),
        discount: fromCents(discountCents),
        tax: fromCents(taxCents),
        surcharge: fromCents(surchargeCents),
        total: fromCents(finalTotalCents),
        payment_method: paymentMethod,
        created_at: effectiveDate,
        terminal_id: servedBy.terminalId || null,
        reservation_sequence: reservationSequence,
        served_by_member_id: servedBy.memberId || null,
        served_by_display_name: servedBy.displayName || null,
        served_by_role: servedBy.role || null,
      };

      writeCheckoutAudit(db, {
        shopId,
        idempotencyKey,
        transactionId,
        invoiceNumber,
        action: "checkout_complete",
        status: "ok",
        servedBy,
        request: {
          items: cleanItems,
          selectedDiscountId,
          activeTaxIds,
          paymentMethod,
          submittedTotals: {
            subtotal: req.body.subtotal,
            discount: req.body.discount,
            tax: req.body.tax,
            surcharge: req.body.surcharge,
            total: req.body.total,
          },
        },
        result: {
          invoiceNumber,
          subtotalCents,
          discountCents,
          taxCents,
          surchargeCents,
          redemptionCents,
          totalCents: finalTotalCents,
        },
        req,
      });

      return {
        transactionId,
        invoiceNumber,
        transactionRow,
        transactionItems: savedItems,
        dailySalesRow,
        inventoryRows,
        customerRow,
        date: day,
      };
    })();

    if (result.duplicate) {
      db.close();
      return res.json({
        ok: true,
        duplicate: true,
        transactionId: result.replay.transaction_id,
        invoiceNumber: result.replay.invoice_number,
        customerId: result.replay.customer_id ?? null,
        date: String(result.replay.created_at || effectiveDate).split("T")[0],
      });
    }

    db.close();

    res.json({
      ok: true,
      transactionId: result.transactionId,
      invoiceNumber: result.invoiceNumber,
      customerId: result.customerRow ? result.customerRow.customer_id : null,
      date: result.date,
    });

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

    try {
      if (db?.open) {
        writeCheckoutAudit(db, {
          shopId,
          idempotencyKey,
          action: "checkout_complete",
          status: "failed",
          servedBy,
          request: { items: cleanItems, paymentMethod, selectedDiscountId, activeTaxIds },
          result: null,
          message: err?.message || "sale_failed",
          req,
        });
      }
    } finally {
      if (db?.open) db.close();
    }

    if (err.message === "INSUFFICIENT_POINTS") {
      return res.status(400).json({ ok: false, error: "insufficient_points", message: "Insufficient points balance." });
    }
    if (err.message === "NEW_CUSTOMER_CANNOT_REDEEM") {
      return res.status(400).json({ ok: false, error: "invalid_points_redemption", message: "Cannot redeem points for a new customer." });
    }
    if (err.message === "GUEST_CANNOT_REDEEM") {
      return res.status(400).json({ ok: false, error: "invalid_points_redemption", message: "Guest checkout cannot redeem points." });
    }
    if (err.message === "INVALID_DISCOUNT_RULE") {
      return res.status(400).json({ ok: false, error: "invalid_discount", message: "Selected discount is no longer available." });
    }
    if (err.message === "INVALID_TAX_RULE") {
      return res.status(400).json({ ok: false, error: "invalid_tax", message: "Selected tax is no longer available." });
    }
    if (err.message === "MANAGER_APPROVAL_REQUIRED") {
      return res.status(403).json({ ok: false, error: "manager_approval_required", message: "This discount requires manager approval." });
    }
    if (String(err.message || "").startsWith("CHECKOUT_TOTAL_MISMATCH:")) {
      const field = String(err.message).split(":")[1] || "total";
      return res.status(409).json({
        ok: false,
        error: "checkout_total_mismatch",
        field,
        message: "Checkout totals changed. Refresh the cart and try again.",
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
