import express from "express";
import { randomUUID } from "crypto";
import {
  createShopDatabase,
  getShopDatabasePath,
  upsertShopMetadata,
  upsertShopOperatingHours,
  replaceShopPaymentMethods,
  openShopDatabase,
  openShopDatabaseIfExists,
  shopDatabaseExists,
  getShopDatabaseFileName,
  sanitizeShopIdentifier,
  resolveShopIdByOwnerEmail,
} from "../utils/shop-database.js";
import { getShopSnapshot } from "../services/shop-snapshot.js";
import { ensureOwnerMember, normalizeEmail } from "../services/team-service.js";
import { ensurePrimaryTerminal } from "../services/terminal-service.js";
import { requireClerkSession } from "../middleware/clerk-auth.js";
import {
  loadShopAuth,
  memberCanAccessShop,
  requireScope,
  requireShopBody,
} from "../middleware/shop-auth.js";

const router = express.Router();

function requireShopReadAccess(req, res, next) {
  const { shopId } = req.params;
  if (!shopId) {
    return res.status(400).json({ error: "shopId is required" });
  }
  if (!shopDatabaseExists(shopId)) {
    return res.status(404).json({ error: "Shop database not found" });
  }

  const db = openShopDatabase(shopId);
  try {
    if (!memberCanAccessShop(db, shopId, req.userEmail)) {
      return res.status(403).json({ error: "Shop access denied" });
    }
    next();
  } finally {
    db.close();
  }
}

// Backward-compatible lightweight registration (deprecated but kept for integrations)
router.post("/register", requireClerkSession, (req, res) => {
  try {
    const { shopId, shop_name, owner_email, location } = req.body || {};
    if (!shopId) {
      return res.status(400).json({ error: "shopId is required" });
    }

    if (shopDatabaseExists(shopId)) {
      return res.status(409).json({ error: "Shop already exists", shopId });
    }

    const meta = {
      shop_name,
      owner_email,
      address: location,
    };

    const db = createShopDatabase(shopId, meta);
    db.close();

    return res.status(201).json({
      ok: true,
      shopId,
      dbFileName: getShopDatabaseFileName(shopId),
      db_path: getShopDatabasePath(shopId),
    });
  } catch (err) {
    console.error("/shop/register error", err);
    res
      .status(500)
      .json({
        error: "Failed to register shop",
        detail: String(err.message || err),
      });
  }
});

// Persist full ShopWizard payload, creating or updating the dedicated shop database
router.get("/setup", (req, res) => {
  return res.status(405).json({
    error: "Method not allowed",
    message: "Use POST /api/shop/setup to create or update a shop.",
  });
});

router.post("/setup", requireClerkSession, (req, res) => {
  try {
    const { formData, shopId: existingShopId } = req.body || {};
    if (!formData) {
      return res.status(400).json({ error: "formData is required" });
    }

    const ownerEmail = normalizeEmail(formData.email || req.userEmail || "");
    if (!ownerEmail) {
      return res.status(400).json({ error: "Owner email is required" });
    }
    if (req.userEmail && ownerEmail !== req.userEmail) {
      return res.status(403).json({
        error: "Shop owner email must match your signed-in account",
      });
    }

    const sanitizedEmail = sanitizeShopIdentifier(ownerEmail);
    const existingShopMatch = !existingShopId ? resolveShopIdByOwnerEmail(ownerEmail) : null;
    const preferredShopId = existingShopId || existingShopMatch?.shopId;

    // Map frontend fields -> DB columns
    const meta = {
      shop_name: formData.shopName,
      owner_name: formData.ownerName,
      owner_email: ownerEmail,
      phone: formData.phone,
      shop_type: formData.shopType,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      zip_code: formData.zipCode,
      country: formData.country,
      business_license: formData.businessLicense,
      tax_id: formData.taxId,
      registration_number: formData.registrationNumber,
      currency: formData.currency,
      timezone: formData.timezone,
    };

    const applyAdditionalData = (dbInstance, shopIdValue) => {
      try {
        if (formData.operatingHours) {
          upsertShopOperatingHours(dbInstance, shopIdValue, formData.operatingHours);
        }
        if (formData.paymentMethods) {
          replaceShopPaymentMethods(dbInstance, shopIdValue, formData.paymentMethods);
        }
      } catch (metaErr) {
        console.error("Failed to persist extended shop data", metaErr);
        throw metaErr;
      }
    };

    // Update existing shop database if identifier supplied
    if (existingShopId) {
      if (!shopDatabaseExists(existingShopId)) {
        return res.status(404).json({
          error: "Shop database not found for provided identifier",
        });
      }

      const db = openShopDatabase(existingShopId);
      try {
        upsertShopMetadata(db, existingShopId, meta);
        applyAdditionalData(db, existingShopId);
        const ownerMember = ensureOwnerMember(db, existingShopId, { ...meta, shop_id: existingShopId });
        ensurePrimaryTerminal(db, existingShopId, ownerMember.member_id);
      } finally {
        db.close();
      }

      return res.status(200).json({
        ok: true,
        shopId: existingShopId,
        dbFileName: getShopDatabaseFileName(existingShopId),
        db_path: getShopDatabasePath(existingShopId),
      });
    }

    // Create a brand-new database for this user
    let uniqueSuffix;
    let generatedShopId;
    do {
      uniqueSuffix = `id${randomUUID().replace(/-/g, "").slice(0, 12)}`;
      generatedShopId = `${sanitizedEmail}_${uniqueSuffix}`;
    } while (shopDatabaseExists(generatedShopId));

    const db = createShopDatabase(generatedShopId, meta);
    try {
      applyAdditionalData(db, generatedShopId);
      const ownerMember = ensureOwnerMember(db, generatedShopId, { ...meta, shop_id: generatedShopId });
      ensurePrimaryTerminal(db, generatedShopId, ownerMember.member_id);
    } finally {
      db.close();
    }

    return res.status(201).json({
      ok: true,
      shopId: generatedShopId,
      dbFileName: getShopDatabaseFileName(generatedShopId),
      db_path: getShopDatabasePath(generatedShopId),
    });
  } catch (err) {
    console.error("/shop/setup error", err);
    res
      .status(500)
      .json({
        error: "Failed to setup shop",
        detail: String(err.message || err),
      });
  }
});

// Retrieve stored shop data for verification
router.get("/:shopId/meta", requireClerkSession, requireShopReadAccess, (req, res) => {
  try {
    const { shopId } = req.params;
    if (!shopId) {
      return res.status(400).json({ error: "shopId is required" });
    }

    if (!shopDatabaseExists(shopId)) {
      return res.status(404).json({ error: "Shop database not found" });
    }

    const db = openShopDatabase(shopId);
    const meta = db
      .prepare("SELECT * FROM shop_meta WHERE shop_id = ?")
      .get(shopId);
    const hours = db
      .prepare(
        "SELECT day, open, close, closed FROM shop_operating_hours WHERE shop_id = ? ORDER BY day"
      )
      .all(shopId);
    const methods = db
      .prepare(
        "SELECT method FROM shop_payment_methods WHERE shop_id = ?"
      )
      .all(shopId)
      .map((r) => r.method);
    db.close();

    res.json({
      ok: true,
      meta,
      operatingHours: hours,
      paymentMethods: methods,
      dbFileName: getShopDatabaseFileName(shopId),
    });
  } catch (err) {
    console.error("GET /shop/:shopId/meta error", err);
    res.status(500).json({
      error: "Failed to read shop data",
      detail: String(err.message || err),
    });
  }
});

router.put(
  "/:shopId/meta",
  requireClerkSession,
  requireShopBody,
  loadShopAuth,
  requireScope("settings"),
  (req, res) => {
    try {
      const shopId = req.shopId || req.params.shopId;
      if (!shopId) {
        return res.status(400).json({ error: "shopId is required" });
      }

      const existing = req.db
        .prepare("SELECT * FROM shop_meta WHERE shop_id = ?")
        .get(shopId);

      if (!existing) {
        return res.status(404).json({ error: "Shop metadata not found" });
      }

      const body = req.body || {};
      const merged = {
        ...existing,
        shop_name: String(body.shopName ?? body.shop_name ?? existing.shop_name ?? "").trim(),
        phone: String(body.phone ?? body.contact ?? existing.phone ?? "").trim(),
        address: String(body.address ?? existing.address ?? "").trim(),
        city: String(body.city ?? existing.city ?? "").trim(),
        state: String(body.state ?? existing.state ?? "").trim(),
        zip_code: String(body.zipCode ?? body.zip_code ?? existing.zip_code ?? "").trim(),
        country: String(body.country ?? existing.country ?? "").trim(),
        shop_type: String(body.shopType ?? body.shop_type ?? existing.shop_type ?? "").trim(),
        business_license: String(body.businessLicense ?? body.business_license ?? existing.business_license ?? "").trim(),
        tax_id: String(body.taxId ?? body.tax_id ?? existing.tax_id ?? "").trim(),
        registration_number: String(body.registrationNumber ?? body.registration_number ?? existing.registration_number ?? "").trim(),
        currency: String(body.currency ?? existing.currency ?? "").trim(),
        timezone: String(body.timezone ?? existing.timezone ?? "").trim(),
        owner_name: existing.owner_name,
        owner_email: existing.owner_email,
        created_at: existing.created_at,
      };

      if (!merged.shop_name) {
        return res.status(400).json({ error: "Shop name is required" });
      }

      upsertShopMetadata(req.db, shopId, merged);

      const meta = req.db
        .prepare("SELECT * FROM shop_meta WHERE shop_id = ?")
        .get(shopId);

      res.json({
        ok: true,
        meta,
        dbFileName: getShopDatabaseFileName(shopId),
      });
    } catch (err) {
      console.error("PUT /shop/:shopId/meta error", err);
      res.status(500).json({
        error: "Failed to update shop metadata",
        detail: String(err.message || err),
      });
    }
  },
);

// Return consolidated snapshot for realtime clients
router.get("/:shopId/snapshot", requireClerkSession, requireShopReadAccess, (req, res) => {
  try {
    const { shopId } = req.params;
    if (!shopId) {
      return res.status(400).json({ error: "shopId is required" });
    }

    if (!shopDatabaseExists(shopId)) {
      return res.status(404).json({ error: "Shop database not found" });
    }

    const snapshot = getShopSnapshot(shopId);
    res.json({ ok: true, snapshot });
  } catch (err) {
    console.error("GET /shop/:shopId/snapshot error", err);
    res.status(500).json({ error: "Failed to load snapshot", detail: String(err.message || err) });
  }
});

// Check if shop database exists without creating it
router.get("/:shopId/exists", requireClerkSession, requireShopReadAccess, (req, res) => {
  try {
    const { shopId } = req.params;
    const expectedOwnerEmail = normalizeEmail(req.query.ownerEmail || "");
    if (!shopId) {
      return res.status(400).json({ error: "shopId is required" });
    }

    const exists = shopDatabaseExists(shopId);
    if (!exists) {
      return res.json({ exists: false });
    }

    const db = openShopDatabaseIfExists(shopId);
    if (!db) {
      return res.json({ exists: false });
    }

    const meta = db
      .prepare("SELECT * FROM shop_meta WHERE shop_id = ?")
      .get(shopId);
    db.close();

    const actualOwnerEmail = normalizeEmail(meta?.owner_email || "");
    if (expectedOwnerEmail && actualOwnerEmail && expectedOwnerEmail !== actualOwnerEmail) {
      return res.json({
        exists: false,
        hasMetadata: false,
        meta: null,
        dbFileName: getShopDatabaseFileName(shopId),
        reason: "owner-email-mismatch",
      });
    }

    res.json({
      exists: true,
      hasMetadata: !!meta,
      meta: meta || null,
      dbFileName: getShopDatabaseFileName(shopId),
    });
  } catch (err) {
    console.error("GET /shop/:shopId/exists error", err);
    res.status(500).json({
      error: "Failed to check shop existence",
      detail: String(err.message || err),
    });
  }
});

export default router;
