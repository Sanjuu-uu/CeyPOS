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
import {
  buildReceiptSnapshot,
  resolvePublicBaseUrl,
} from "../services/receipt-snapshot.js";

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

function isValidEmail(value) {
  return (
    typeof value === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) &&
    value.length <= 254
  );
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

    const snapshot = buildReceiptSnapshot(sale, shopId);

    const token = findOrCreateReceiptToken({
      shopId,
      transactionCode: sale.transactionCode || sale.id || null,
      receiptId: sale.receiptId || null,
      snapshot,
    });

    const publicUrl = `${resolvePublicBaseUrl(req)}/r/${token}`;

    const { subject, html, text } = buildReceiptEmail({
      shopName: snapshot.shop?.name,
      shopAddress: snapshot.shop?.address,
      shopContact: snapshot.shop?.contact,
      customerName: snapshot.customerInfo?.name,
      receiptNumber: snapshot.receiptNumber,
      total: snapshot.total,
      subtotal: snapshot.subtotal,
      tax: snapshot.tax,
      discount: snapshot.discount,
      paymentMethod: snapshot.paymentMethod,
      timestamp: snapshot.timestamp,
      items: snapshot.items,
      currency: snapshot.currency,
      publicReceiptUrl: publicUrl,
    });

    await sendZeptoMailEmail({
      to: email,
      toName: snapshot.customerInfo?.name || "",
      subject,
      htmlBody: html,
      textBody: text,
      replyTo: (process.env.ZEPTOMAIL_REPLY_TO || "").trim() || undefined,
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
