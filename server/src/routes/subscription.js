import express from "express";
import crypto from "crypto";
import { openShopDatabase, shopDatabaseExists } from "../utils/shop-database.js";
import { requireShopBody, loadShopAuth, requireOwner } from "../middleware/shop-auth.js";
import { resolvePublicBaseUrl } from "../services/receipt-snapshot.js";
import {
  BILLING_CURRENCY,
  applyPlanToShop,
  getPlanPricing,
  isValidBillingPeriod,
  isValidPlanId,
  listPlans,
  revertShopToFree,
} from "../services/plan-catalog.js";
import {
  PAYHERE_CHECKOUT_URL,
  PAYHERE_MERCHANT_ID,
  cancelSubscription,
  formatAmount,
  generateCheckoutHash,
  isPayHereApiConfigured,
  isPayHereConfigured,
  isSandbox,
  retrySubscription,
  verifyNotification,
} from "../services/payhere.js";

const router = express.Router();

const nowIso = () => new Date().toISOString();

function readSubscription(db, shopId) {
  return db.prepare("SELECT * FROM shop_subscriptions WHERE shop_id = ?").get(shopId) || null;
}

function serializeSubscription(row) {
  if (!row) return null;
  return {
    planId: row.plan_id,
    billingPeriod: row.billing_period,
    status: row.status,
    currency: row.currency,
    amount: row.amount,
    subscriptionId: row.subscription_id,
    nextChargeDate: row.next_charge_date,
    installmentsPaid: row.installments_paid,
    startedAt: row.started_at,
    cancelledAt: row.cancelled_at,
    statusMessage: row.last_status_message,
    // Only ever the PayHere-masked PAN (e.g. ************4564) — a full card
    // number never reaches this server.
    card: row.card_no
      ? {
          maskedNumber: row.card_no,
          holderName: row.card_holder_name,
          expiry: row.card_expiry,
          method: row.card_method,
        }
      : null,
  };
}

function readBillingHistory(db, shopId, limit = 50) {
  return db
    .prepare(
      `SELECT payment_id, order_id, plan_id, description, currency, amount,
              status, card_no, card_method, paid_at
         FROM shop_billing_history
        WHERE shop_id = ?
        ORDER BY paid_at DESC
        LIMIT ?`,
    )
    .all(shopId, limit)
    .map((row) => ({
      id: String(row.payment_id || row.order_id),
      orderId: row.order_id,
      planId: row.plan_id,
      description: row.description,
      currency: row.currency,
      amount: row.amount,
      status: row.status,
      cardNo: row.card_no,
      cardMethod: row.card_method,
      paidAt: row.paid_at,
    }));
}

/** GET /api/subscription/plans — public plan catalog for the pricing UI. */
router.get("/plans", (req, res) => {
  res.json({
    currency: BILLING_CURRENCY,
    sandbox: isSandbox(),
    configured: isPayHereConfigured(),
    plans: listPlans(),
  });
});

/** GET /api/subscription/status — current subscription, card on file, invoices. */
router.get("/status", requireShopBody, loadShopAuth, (req, res) => {
  try {
    const subscription = readSubscription(req.db, req.shopId);
    res.json({
      subscription: serializeSubscription(subscription),
      billingHistory: readBillingHistory(req.db, req.shopId),
      canManage: req.shopAuth?.scope?.role === "owner",
    });
  } catch (error) {
    console.error("[subscription] status failed", error);
    res.status(500).json({ error: "Failed to load subscription" });
  }
});

/**
 * POST /api/subscription/checkout
 *
 * Returns the signed field set for the PayHere Recurring checkout form. The
 * hash is generated here because it depends on the merchant secret, which must
 * never be exposed to the browser.
 */
router.post("/checkout", requireShopBody, loadShopAuth, requireOwner, (req, res) => {
  try {
    if (!isPayHereConfigured()) {
      return res.status(503).json({
        error: "PAYMENTS_NOT_CONFIGURED",
        message:
          "Online subscription checkout is not configured on this server. Add PayHere merchant credentials before starting paid-plan checkout.",
      });
    }

    const { planId, billingPeriod } = req.body || {};
    if (!isValidPlanId(planId) || !isValidBillingPeriod(billingPeriod)) {
      return res.status(400).json({ error: "A valid planId and billingPeriod are required" });
    }

    const existing = readSubscription(req.db, req.shopId);
    if (existing?.status === "active" && existing.plan_id === planId && existing.billing_period === billingPeriod) {
      return res.status(409).json({ error: "This plan is already active" });
    }

    const { plan, amount, currency, recurrence, duration } = getPlanPricing(planId, billingPeriod);
    const shop = req.db
      .prepare("SELECT shop_name, owner_name, owner_email, phone, address, city, country FROM shop_meta WHERE shop_id = ?")
      .get(req.shopId);

    // Unique per attempt so a retried checkout never collides with a prior order.
    const orderId = `SUB-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
    const baseUrl = resolvePublicBaseUrl(req);

    const [firstName, ...restName] = String(shop?.owner_name || "Shop Owner").trim().split(/\s+/);
    const description = `CeyPOS ${plan.title} (${billingPeriod})`;

    req.db
      .prepare(
        `INSERT INTO shop_subscriptions (
            shop_id, plan_id, billing_period, status, currency, amount,
            order_id, recurrence, duration, updated_at
         ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)
         ON CONFLICT(shop_id) DO UPDATE SET
            plan_id = excluded.plan_id,
            billing_period = excluded.billing_period,
            status = CASE WHEN shop_subscriptions.status = 'active'
                          THEN shop_subscriptions.status ELSE 'pending' END,
            currency = excluded.currency,
            amount = excluded.amount,
            order_id = excluded.order_id,
            recurrence = excluded.recurrence,
            duration = excluded.duration,
            updated_at = excluded.updated_at`,
      )
      .run(
        req.shopId,
        planId,
        billingPeriod,
        currency,
        amount,
        orderId,
        recurrence,
        duration,
        nowIso(),
      );

    res.json({
      actionUrl: PAYHERE_CHECKOUT_URL,
      sandbox: isSandbox(),
      // Posted verbatim as an HTML form by the client.
      fields: {
        merchant_id: PAYHERE_MERCHANT_ID,
        return_url: `${baseUrl}/?module=Subscription&payhere=return`,
        cancel_url: `${baseUrl}/?module=Subscription&payhere=cancel`,
        notify_url: `${baseUrl}/api/subscription/notify`,
        order_id: orderId,
        items: description,
        currency,
        amount: formatAmount(amount),
        recurrence,
        duration,
        first_name: firstName || "Shop",
        last_name: restName.join(" ") || "Owner",
        email: shop?.owner_email || req.userEmail,
        phone: shop?.phone || "",
        address: shop?.address || "",
        city: shop?.city || "",
        country: shop?.country || "Sri Lanka",
        // custom_1 carries the tenant identity back to the unauthenticated
        // notify callback — it is the only way to reach the right shop DB.
        custom_1: req.shopId,
        custom_2: `${planId}:${billingPeriod}`,
        hash: generateCheckoutHash({ orderId, amount, currency }),
      },
    });
  } catch (error) {
    console.error("[subscription] checkout failed", error);
    res.status(500).json({ error: "Failed to start checkout" });
  }
});

/**
 * POST /api/subscription/notify
 *
 * PayHere server-to-server callback. Deliberately unauthenticated — PayHere
 * sends no credentials. Authenticity comes solely from the md5sig checksum,
 * which is verified before anything is written or any plan is granted.
 *
 * Body is application/x-www-form-urlencoded, not JSON.
 */
router.post("/notify", express.urlencoded({ extended: false }), (req, res) => {
  // Always ack fast; PayHere retries on non-2xx and we must not double-charge
  // ourselves into a retry loop over an internal error.
  const body = req.body || {};

  try {
    if (!verifyNotification(body)) {
      console.warn("[subscription] rejected notification with invalid signature", {
        orderId: body.order_id,
      });
      return res.status(403).end();
    }

    const shopId = String(body.custom_1 || "").trim();
    if (!shopId || !shopDatabaseExists(shopId)) {
      console.warn("[subscription] notification for unknown shop", { shopId });
      return res.status(200).end();
    }

    const [planIdFromCustom, periodFromCustom] = String(body.custom_2 || "").split(":");
    const statusCode = Number(body.status_code);
    const messageType = String(body.message_type || "");
    const db = openShopDatabase(shopId);

    try {
      const existing = readSubscription(db, shopId);
      const planId = isValidPlanId(planIdFromCustom)
        ? planIdFromCustom
        : existing?.plan_id;
      const billingPeriod = isValidBillingPeriod(periodFromCustom)
        ? periodFromCustom
        : existing?.billing_period;

      if (!planId) {
        console.warn("[subscription] notification without resolvable plan", { shopId });
        return res.status(200).end();
      }

      const succeeded =
        statusCode === 2 &&
        (messageType === "AUTHORIZATION_SUCCESS" ||
          messageType === "RECURRING_INSTALLMENT_SUCCESS" ||
          messageType === "");

      let status = existing?.status || "pending";
      if (succeeded) status = "active";
      else if (messageType === "RECURRING_INSTALLMENT_FAILED") status = "past_due";
      else if (messageType === "RECURRING_COMPLETE") status = "completed";
      else if (messageType === "RECURRING_STOPPED") status = "cancelled";
      else if (messageType === "AUTHORIZATION_FAILED" || statusCode === -2) status = "failed";
      else if (statusCode === -1) status = "cancelled";
      else if (statusCode === -3) status = "chargedback";
      else if (statusCode === 0) status = "pending";

      const applyChanges = db.transaction(() => {
        db.prepare(
          `INSERT INTO shop_subscriptions (
              shop_id, plan_id, billing_period, status, currency, amount,
              order_id, subscription_id, payhere_payment_id,
              card_holder_name, card_no, card_expiry, card_method,
              recurrence, duration, next_charge_date, installments_paid,
              last_message_type, last_status_message, started_at, updated_at
           ) VALUES (
              @shopId, @planId, @billingPeriod, @status, @currency, @amount,
              @orderId, @subscriptionId, @paymentId,
              @cardHolderName, @cardNo, @cardExpiry, @cardMethod,
              @recurrence, @duration, @nextChargeDate, @installmentsPaid,
              @messageType, @statusMessage, @startedAt, @updatedAt
           )
           ON CONFLICT(shop_id) DO UPDATE SET
              plan_id = excluded.plan_id,
              billing_period = excluded.billing_period,
              status = excluded.status,
              currency = excluded.currency,
              amount = excluded.amount,
              order_id = excluded.order_id,
              subscription_id = COALESCE(excluded.subscription_id, shop_subscriptions.subscription_id),
              payhere_payment_id = COALESCE(excluded.payhere_payment_id, shop_subscriptions.payhere_payment_id),
              card_holder_name = COALESCE(excluded.card_holder_name, shop_subscriptions.card_holder_name),
              card_no = COALESCE(excluded.card_no, shop_subscriptions.card_no),
              card_expiry = COALESCE(excluded.card_expiry, shop_subscriptions.card_expiry),
              card_method = COALESCE(excluded.card_method, shop_subscriptions.card_method),
              next_charge_date = COALESCE(excluded.next_charge_date, shop_subscriptions.next_charge_date),
              installments_paid = COALESCE(excluded.installments_paid, shop_subscriptions.installments_paid),
              last_message_type = excluded.last_message_type,
              last_status_message = excluded.last_status_message,
              started_at = COALESCE(shop_subscriptions.started_at, excluded.started_at),
              updated_at = excluded.updated_at`,
        ).run({
          shopId,
          planId,
          billingPeriod: billingPeriod || "monthly",
          status,
          currency: body.payhere_currency || BILLING_CURRENCY,
          amount: Number(body.payhere_amount) || existing?.amount || 0,
          orderId: body.order_id || existing?.order_id || null,
          subscriptionId: body.subscription_id || null,
          paymentId: body.payment_id || null,
          cardHolderName: body.card_holder_name || null,
          cardNo: body.card_no || null,
          cardExpiry: body.card_expiry || null,
          cardMethod: body.method || null,
          recurrence: body.item_recurrence || existing?.recurrence || null,
          duration: body.item_duration || existing?.duration || null,
          nextChargeDate: body.item_rec_date_next || null,
          installmentsPaid:
            body.item_rec_install_paid !== undefined
              ? Number(body.item_rec_install_paid)
              : null,
          messageType: messageType || null,
          statusMessage: body.status_message || null,
          startedAt: succeeded ? nowIso() : null,
          updatedAt: nowIso(),
        });

        // Record the invoice. UNIQUE(shop_id, payment_id) makes a redelivered
        // notification a no-op rather than a duplicate line item.
        if (body.payment_id) {
          db.prepare(
            `INSERT OR IGNORE INTO shop_billing_history (
                shop_id, order_id, payment_id, subscription_id, plan_id,
                description, currency, amount, status, status_code,
                message_type, card_no, card_method, paid_at, created_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ).run(
            shopId,
            body.order_id || null,
            String(body.payment_id),
            body.subscription_id || null,
            planId,
            body.items || `CeyPOS ${planId} (${billingPeriod || "monthly"})`,
            body.payhere_currency || BILLING_CURRENCY,
            Number(body.payhere_amount) || 0,
            statusCode === 2 ? "paid" : status,
            statusCode,
            messageType || null,
            body.card_no || null,
            body.method || null,
            nowIso(),
            nowIso(),
          );
        }

        // Entitlements follow the verified payment, never the client.
        if (status === "active") {
          applyPlanToShop(db, shopId, planId);
        } else if (status === "cancelled" || status === "completed" || status === "chargedback") {
          revertShopToFree(db, shopId);
        }
      });

      applyChanges();
      console.info("[subscription] notification applied", {
        shopId,
        orderId: body.order_id,
        messageType,
        status,
      });
    } finally {
      db.close();
    }

    return res.status(200).end();
  } catch (error) {
    console.error("[subscription] notification handling failed", error);
    // 500 asks PayHere to retry, which is what we want for a transient fault.
    return res.status(500).end();
  }
});

/** POST /api/subscription/cancel — stops future charges and drops to free. */
router.post("/cancel", requireShopBody, loadShopAuth, requireOwner, async (req, res) => {
  try {
    const subscription = readSubscription(req.db, req.shopId);
    if (!subscription?.subscription_id) {
      return res.status(404).json({ error: "No active subscription to cancel" });
    }
    if (!isPayHereApiConfigured()) {
      return res.status(503).json({ error: "Subscription management is not configured" });
    }

    const result = await cancelSubscription(subscription.subscription_id);
    if (result?.status !== 1) {
      return res.status(400).json({ error: result?.msg || "PayHere declined the cancellation" });
    }

    req.db
      .prepare(
        `UPDATE shop_subscriptions
            SET status = 'cancelled', cancelled_at = ?, updated_at = ?
          WHERE shop_id = ?`,
      )
      .run(nowIso(), nowIso(), req.shopId);
    revertShopToFree(req.db, req.shopId);

    res.json({ ok: true, subscription: serializeSubscription(readSubscription(req.db, req.shopId)) });
  } catch (error) {
    console.error("[subscription] cancel failed", error);
    res.status(500).json({ error: error.message || "Failed to cancel subscription" });
  }
});

/** POST /api/subscription/retry — re-attempts a failed recurring installment. */
router.post("/retry", requireShopBody, loadShopAuth, requireOwner, async (req, res) => {
  try {
    const subscription = readSubscription(req.db, req.shopId);
    if (!subscription?.subscription_id) {
      return res.status(404).json({ error: "No subscription to retry" });
    }
    if (!isPayHereApiConfigured()) {
      return res.status(503).json({ error: "Subscription management is not configured" });
    }

    const result = await retrySubscription(subscription.subscription_id);
    if (result?.status !== 1) {
      return res.status(400).json({ error: result?.msg || "PayHere declined the retry" });
    }
    // The resulting charge arrives asynchronously on notify_url, which is what
    // actually flips the status back to active.
    res.json({ ok: true, message: result.msg });
  } catch (error) {
    console.error("[subscription] retry failed", error);
    res.status(500).json({ error: error.message || "Failed to retry subscription" });
  }
});

export default router;
