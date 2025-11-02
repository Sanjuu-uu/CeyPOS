import express from "express";
import { randomUUID } from "crypto";
import {
  createShopDb,
  dbPathForShop,
  upsertShopMeta,
  upsertOperatingHours,
  replacePaymentMethods,
  openDb,
  openDbIfExists,
  dbExists,
  getDbFileName,
  sanitizeForFilename,
} from "../utils/db.js";
import { getShopSnapshot } from "../services/shop-snapshot.js";

const router = express.Router();

// Backward-compatible lightweight registration (deprecated but kept for integrations)
router.post("/register", (req, res) => {
  try {
    const { shopId, shop_name, owner_email, location } = req.body || {};
    if (!shopId) {
      return res.status(400).json({ error: "shopId is required" });
    }

    if (dbExists(shopId)) {
      return res.status(409).json({ error: "Shop already exists", shopId });
    }

    const meta = {
      shop_name,
      owner_email,
      address: location,
    };

    const db = createShopDb(shopId, meta);
    db.close();

    return res.status(201).json({
      ok: true,
      shopId,
      dbFileName: getDbFileName(shopId),
      db_path: dbPathForShop(shopId),
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
router.post("/setup", (req, res) => {
  try {
    const { formData, shopId: existingShopId } = req.body || {};
    if (!formData) {
      return res.status(400).json({ error: "formData is required" });
    }

    const ownerEmail = (formData.email || req.body?.userEmail || "").trim();
    if (!ownerEmail) {
      return res.status(400).json({ error: "Owner email is required" });
    }

    const sanitizedEmail = sanitizeForFilename(ownerEmail);

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
          upsertOperatingHours(dbInstance, shopIdValue, formData.operatingHours);
        }
        if (formData.paymentMethods) {
          replacePaymentMethods(dbInstance, shopIdValue, formData.paymentMethods);
        }
      } catch (metaErr) {
        console.error("Failed to persist extended shop data", metaErr);
        throw metaErr;
      }
    };

    // Update existing shop database if identifier supplied
    if (existingShopId) {
      if (!dbExists(existingShopId)) {
        return res.status(404).json({
          error: "Shop database not found for provided identifier",
        });
      }

      const db = openDb(existingShopId);
      try {
        upsertShopMeta(db, existingShopId, meta);
        applyAdditionalData(db, existingShopId);
      } finally {
        db.close();
      }

      return res.status(200).json({
        ok: true,
        shopId: existingShopId,
        dbFileName: getDbFileName(existingShopId),
        db_path: dbPathForShop(existingShopId),
      });
    }

    // Create a brand-new database for this user
    let uniqueSuffix;
    let generatedShopId;
    do {
      uniqueSuffix = `id${randomUUID().replace(/-/g, "").slice(0, 12)}`;
      generatedShopId = `${sanitizedEmail}_${uniqueSuffix}`;
    } while (dbExists(generatedShopId));

    const db = createShopDb(generatedShopId, meta);
    try {
      applyAdditionalData(db, generatedShopId);
    } finally {
      db.close();
    }

    return res.status(201).json({
      ok: true,
      shopId: generatedShopId,
      dbFileName: getDbFileName(generatedShopId),
      db_path: dbPathForShop(generatedShopId),
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
router.get("/:shopId/meta", (req, res) => {
  try {
    const { shopId } = req.params;
    if (!shopId) {
      return res.status(400).json({ error: "shopId is required" });
    }

    const db = openDb(shopId);
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
      dbFileName: getDbFileName(shopId),
    });
  } catch (err) {
    console.error("GET /shop/:shopId/meta error", err);
    res.status(500).json({
      error: "Failed to read shop data",
      detail: String(err.message || err),
    });
  }
});

// Return consolidated snapshot for realtime clients
router.get("/:shopId/snapshot", (req, res) => {
  try {
    const { shopId } = req.params;
    if (!shopId) {
      return res.status(400).json({ error: "shopId is required" });
    }

    if (!dbExists(shopId)) {
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
router.get("/:shopId/exists", (req, res) => {
  try {
    const { shopId } = req.params;
    if (!shopId) {
      return res.status(400).json({ error: "shopId is required" });
    }

    const exists = dbExists(shopId);
    if (!exists) {
      return res.json({ exists: false });
    }

    const db = openDbIfExists(shopId);
    if (!db) {
      return res.json({ exists: false });
    }

    const meta = db
      .prepare("SELECT * FROM shop_meta WHERE shop_id = ?")
      .get(shopId);
    db.close();

    res.json({
      exists: true,
      hasMetadata: !!meta,
      meta: meta || null,
      dbFileName: getDbFileName(shopId),
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
