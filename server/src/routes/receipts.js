// General-purpose receipt routes. Right now this hosts the token-mint
// endpoint used by the print path (we need a public /r/<token> URL for the
// QR code, but we don't want to send email/SMS just to get one).
//
// Other delivery channels (email, SMS) live in their own route files but
// share the same underlying receipt-token store, so a mint + email + SMS
// for the same sale all reuse one token.

import { Router } from "express";
import { findOrCreateReceiptToken } from "../services/receipt-tokens.js";
import {
  buildReceiptSnapshot,
  resolvePublicBaseUrl,
} from "../services/receipt-snapshot.js";
import { requireClerkSession } from "../middleware/clerk-auth.js";
import {
  requireShopBody,
  loadShopAuth,
} from "../middleware/shop-auth.js";
import { scopeAllows } from "../services/member-scope.js";
import { WEB_ROUTES } from "./paths.js";

const router = Router();

function requirePosOrReceipts(req, res, next) {
  if (
    scopeAllows(req.shopAuth?.scope, "pos") ||
    scopeAllows(req.shopAuth?.scope, "receipts")
  ) {
    return next();
  }
  return res.status(403).json({ error: "Missing scope: pos_or_receipts" });
}

router.post(
  "/mint-token",
  requireClerkSession,
  requireShopBody,
  loadShopAuth,
  requirePosOrReceipts,
  (req, res) => {
  try {
    const { shopId, sale } = req.body || {};

    if (!shopId || typeof shopId !== "string") {
      return res.status(400).json({ ok: false, error: "missing_shop_id" });
    }
    if (!sale || typeof sale !== "object") {
      return res.status(400).json({ ok: false, error: "missing_sale" });
    }

    const snapshot = buildReceiptSnapshot(sale, shopId);

    const token = findOrCreateReceiptToken({
      shopId,
      transactionCode: sale.transactionCode || sale.id || null,
      receiptId: sale.receiptId || null,
      snapshot,
    });

    const publicUrl = `${resolvePublicBaseUrl(req)}${WEB_ROUTES.publicReceipt(token)}`;
    res.json({ ok: true, token, url: publicUrl });
  } catch (err) {
    console.error("receipts/mint-token failed:", err?.message || err);
    res.status(500).json({
      ok: false,
      error: "mint_failed",
      message: err?.message || "Unknown error",
    });
  }
});

export default router;
