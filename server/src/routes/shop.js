const express = require("express");
const {
  createOrOpenShopDb,
  dbPathForShop,
  upsertShopMeta,
  upsertOperatingHours,
  replacePaymentMethods,
  openDb,
} = require("../utils/db");

const router = express.Router();

// Backward-compatible lightweight registration
router.post("/register", (req, res) => {
  try {
    const { shopId, shop_name, owner_email, location } = req.body || {};
    if (!shopId) return res.status(400).json({ error: "shopId is required" });
    const db = createOrOpenShopDb(shopId, { shop_name, owner_email, address: location });
    db.close();
    return res.json({ ok: true, db_path: dbPathForShop(shopId) });
  } catch (err) {
    console.error("/shop/register error", err);
    res.status(500).json({ error: "Failed to register shop", detail: String(err.message || err) });
  }
});

// New: Persist full ShopWizard payload
router.post("/setup", (req, res) => {
  try {
    const { shopId, formData } = req.body || {};
    if (!shopId) return res.status(400).json({ error: "shopId is required" });
    if (!formData) return res.status(400).json({ error: "formData is required" });

    // Map frontend fields -> DB columns
    const meta = {
      shop_name: formData.shopName,
      owner_name: formData.ownerName,
      owner_email: formData.email,
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

    const db = createOrOpenShopDb(shopId);
    upsertShopMeta(db, shopId, meta);
    if (formData.operatingHours) {
      upsertOperatingHours(db, shopId, formData.operatingHours);
    }
    if (formData.paymentMethods) {
      replacePaymentMethods(db, shopId, formData.paymentMethods);
    }
    db.close();

    return res.json({ ok: true, db_path: dbPathForShop(shopId) });
  } catch (err) {
    console.error("/shop/setup error", err);
    res.status(500).json({ error: "Failed to setup shop", detail: String(err.message || err) });
  }
});

// Retrieve stored shop data for verification
router.get("/:shopId/meta", (req, res) => {
  try {
    const { shopId } = req.params;
    if (!shopId) return res.status(400).json({ error: "shopId is required" });
    const db = openDb(shopId);
    const meta = db.prepare("SELECT * FROM shop_meta WHERE shop_id = ?").get(shopId);
    const hours = db.prepare("SELECT day, open, close, closed FROM shop_operating_hours WHERE shop_id = ? ORDER BY day").all(shopId);
    const methods = db.prepare("SELECT method FROM shop_payment_methods WHERE shop_id = ?").all(shopId).map((r) => r.method);
    db.close();
    res.json({ ok: true, meta, operatingHours: hours, paymentMethods: methods });
  } catch (err) {
    console.error("GET /shop/:shopId/meta error", err);
    res.status(500).json({ error: "Failed to read shop data", detail: String(err.message || err) });
  }
});

module.exports = router;
