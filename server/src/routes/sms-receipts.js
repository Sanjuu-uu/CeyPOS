import { Router } from "express";
import {
  findOrCreateReceiptToken,
  recordSend,
} from "../services/receipt-tokens.js";
import {
  isFitSmsConfigured,
  sendFitSmsMessage,
  normalizePhoneNumber,
  getFitSmsBalance,
} from "../services/fitsms.js";
import { buildReceiptSms } from "../services/sms/templates/receipt-sms.js";
import {
  buildReceiptSnapshot,
  formatInvoiceNumber,
  resolvePublicBaseUrl,
} from "../services/receipt-snapshot.js";

const router = Router();

// In-memory throttle: max 4 sends per minute per (shop, recipient).
// SMS is more expensive and more easily flagged by carriers than email,
// so the limit is tighter than the email route.
const recentSends = new Map();
const THROTTLE_WINDOW_MS = 60 * 1000;
const THROTTLE_LIMIT = 4;

function throttleKey(shopId, phone) {
  return `${shopId}::${phone}`;
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

router.post("/send", async (req, res) => {
  try {
    const { shopId, sale, recipientPhone } = req.body || {};

    if (!shopId || typeof shopId !== "string") {
      return res.status(400).json({ ok: false, error: "missing_shop_id" });
    }
    if (!sale || typeof sale !== "object") {
      return res.status(400).json({ ok: false, error: "missing_sale" });
    }

    const normalized = normalizePhoneNumber(
      recipientPhone || sale?.customerInfo?.phone || "",
    );
    if (!normalized) {
      return res.status(400).json({ ok: false, error: "invalid_phone" });
    }

    if (!isFitSmsConfigured()) {
      return res
        .status(503)
        .json({ ok: false, error: "sms_provider_unconfigured" });
    }

    const tKey = throttleKey(shopId, normalized);
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

    const { message, estimatedSegments } = buildReceiptSms({
      customerName: snapshot.customerInfo?.name,
      shopName: snapshot.shop?.name,
      total: snapshot.total,
      currency: snapshot.currency,
      invoiceNumber: formatInvoiceNumber(snapshot.receiptNumber),
      publicReceiptUrl: publicUrl,
    });

    const providerResult = await sendFitSmsMessage({
      recipient: normalized,
      message,
      // Expire after 23h59m — must be < 24h, >= 60s per the API.
      expirySeconds: 24 * 60 * 60 - 60,
    });

    recordHit(tKey);
    recordSend({ token, recipientPhone: normalized });

    res.json({
      ok: true,
      token,
      url: publicUrl,
      providerId: providerResult?.ruid || null,
      estimatedSegments,
      status: providerResult?.status || "pending",
    });
  } catch (err) {
    console.error("sms-receipts/send failed:", err?.message || err);
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

router.get("/status", async (_req, res) => {
  if (!isFitSmsConfigured()) {
    return res.json({ ok: true, configured: false });
  }
  try {
    const data = await getFitSmsBalance();
    res.json({ ok: true, configured: true, balance: data ?? null });
  } catch (err) {
    res.json({
      ok: true,
      configured: true,
      balance: null,
      balanceError: err?.message || "balance_unavailable",
    });
  }
});

export default router;
