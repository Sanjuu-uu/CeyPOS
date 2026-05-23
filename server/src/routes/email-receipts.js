import { Router } from "express";
import {
  findOrCreateReceiptToken,
  recordSend,
  getReceiptByToken,
  recordView,
} from "../services/receipt-tokens.js";
import {
  isZeptoMailConfigured,
  sendZeptoMailEmail,
} from "../services/zeptomail.js";
import { buildReceiptEmail } from "../services/email/templates/receipt-email.js";

const router = Router();

// Simple in-memory throttle: max 6 sends per minute per (shop, recipient).
// Production-friendly first line of defense; pair with provider-side limits.
const recentSends = new Map();
const THROTTLE_WINDOW_MS = 60 * 1000;
const THROTTLE_LIMIT = 6;

function throttleKey(shopId, email) {
  return `${shopId}::${email.toLowerCase()}`;
}

function isThrottled(key) {
  const now = Date.now();
  const hits = (recentSends.get(key) || []).filter(
    (t) => now - t < THROTTLE_WINDOW_MS,
  );
  recentSends.set(key, hits);
  return hits.length >= THROTTLE_LIMIT;
}

function recordHit(key) {
  const hits = recentSends.get(key) || [];
  hits.push(Date.now());
  recentSends.set(key, hits);
}

function publicBaseUrl(req) {
  const fromEnv = (process.env.PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  const proto = req.get("x-forwarded-proto") || req.protocol || "http";
  const host = req.get("x-forwarded-host") || req.get("host");
  return `${proto}://${host}`;
}

function isValidEmail(value) {
  return (
    typeof value === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) &&
    value.length <= 254
  );
}

function buildSnapshot(sale, shopId) {
  const items = Array.isArray(sale.items)
    ? sale.items.slice(0, 500).map((it) => ({
        name: String(it.name || "").slice(0, 200),
        quantity: Number(it.quantity) || 0,
        price: Number(it.price ?? it.unit_price) || 0,
      }))
    : [];

  return {
    shopId,
    shop: sale.shop
      ? {
          name: sale.shop.name ? String(sale.shop.name).slice(0, 200) : "",
          address: sale.shop.address
            ? String(sale.shop.address).slice(0, 300)
            : "",
          contact: sale.shop.contact
            ? String(sale.shop.contact).slice(0, 200)
            : "",
        }
      : null,
    customerInfo: sale.customerInfo
      ? {
          name: sale.customerInfo.name
            ? String(sale.customerInfo.name).slice(0, 200)
            : "",
          email: sale.customerInfo.email
            ? String(sale.customerInfo.email).toLowerCase().slice(0, 254)
            : "",
          phone: sale.customerInfo.phone
            ? String(sale.customerInfo.phone).slice(0, 40)
            : "",
        }
      : null,
    items,
    subtotal: Number(sale.subtotal ?? sale.total) || 0,
    tax: Number(sale.tax) || 0,
    discount: Number(sale.discount) || 0,
    total: Number(sale.total) || 0,
    paymentMethod: String(sale.paymentMethod || "cash").slice(0, 32),
    currency: String(sale.currency || "$").slice(0, 8),
    timestamp: sale.timestamp || new Date().toISOString(),
    receiptNumber: String(
      sale.receiptNumber || sale.transactionCode || sale.id || "",
    ).slice(0, 64),
    pointsEarned: Number(sale.pointsEarned) || 0,
    pointsRedeemed: Number(sale.pointsRedeemed) || 0,
  };
}

router.post("/send", async (req, res) => {
  try {
    const { shopId, sale, recipientEmail } = req.body || {};

    if (!shopId || typeof shopId !== "string") {
      return res.status(400).json({ ok: false, error: "missing_shop_id" });
    }
    if (!sale || typeof sale !== "object") {
      return res.status(400).json({ ok: false, error: "missing_sale" });
    }

    const email = String(
      recipientEmail || sale?.customerInfo?.email || "",
    )
      .trim()
      .toLowerCase();
    if (!isValidEmail(email)) {
      return res.status(400).json({ ok: false, error: "invalid_email" });
    }

    if (!isZeptoMailConfigured()) {
      return res
        .status(503)
        .json({ ok: false, error: "email_provider_unconfigured" });
    }

    const tKey = throttleKey(shopId, email);
    if (isThrottled(tKey)) {
      return res.status(429).json({ ok: false, error: "rate_limited" });
    }

    const snapshot = buildSnapshot(sale, shopId);

    const token = findOrCreateReceiptToken({
      shopId,
      transactionCode: sale.transactionCode || sale.id || null,
      receiptId: sale.receiptId || null,
      snapshot,
    });

    const publicUrl = `${publicBaseUrl(req)}/r/${token}`;

    const { subject, html, text } = buildReceiptEmail({
      shopName: snapshot.shop?.name,
      shopAddress: snapshot.shop?.address,
      shopContact: snapshot.shop?.contact,
      customerName: snapshot.customerInfo?.name,
      receiptNumber: snapshot.receiptNumber.slice(-12) || "—",
      total: snapshot.total,
      currency: snapshot.currency,
      paymentMethod: snapshot.paymentMethod,
      timestamp: snapshot.timestamp,
      publicReceiptUrl: publicUrl,
    });

    await sendZeptoMailEmail({
      to: email,
      toName: snapshot.customerInfo?.name || "",
      subject,
      htmlBody: html,
      textBody: text,
    });

    recordHit(tKey);
    recordSend({ token, recipientEmail: email });

    res.json({ ok: true, token, url: publicUrl });
  } catch (err) {
    console.error("email-receipts/send failed:", err?.message || err);
    if (err?.providerBody) {
      console.error("provider response:", err.providerBody);
    }
    res.status(500).json({
      ok: false,
      error: err?.code || "send_failed",
      message: err?.message || "Unknown error",
    });
  }
});

router.get("/public/:token", (req, res) => {
  try {
    const token = String(req.params.token || "");
    if (!token || token.length < 16 || token.length > 64) {
      return res.status(404).json({ ok: false, error: "not_found" });
    }
    const row = getReceiptByToken(token);
    if (!row) return res.status(404).json({ ok: false, error: "not_found" });

    // Fire-and-forget view counter — do not let an analytics write block delivery.
    try {
      recordView({ token });
    } catch (logErr) {
      console.warn("recordView failed:", logErr?.message || logErr);
    }

    res.json({
      ok: true,
      receipt: row.snapshot,
      sentAt: row.sent_at,
      createdAt: row.created_at,
    });
  } catch (err) {
    console.error("email-receipts/public failed:", err?.message || err);
    res.status(500).json({ ok: false, error: "lookup_failed" });
  }
});

router.get("/status", (req, res) => {
  res.json({ ok: true, configured: isZeptoMailConfigured() });
});

export default router;
