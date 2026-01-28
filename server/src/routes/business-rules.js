import express from "express";
import { openShopDatabase } from "../utils/shop-database.js";

const router = express.Router();

router.put("/:shopId", (req, res) => {
  const { shopId } = req.params;
  const { loyalty, discounts, taxes, surcharges } = req.body;

  try {
    const db = openShopDatabase(shopId);
    
    const updateRules = db.transaction(() => {
      // 1. Loyalty
      if (loyalty) {
        db.prepare(`
          INSERT INTO business_rules_loyalty (shop_id, enabled, earn_rate, redeem_rate, min_points)
          VALUES (@shopId, @enabled, @earnRate, @redeemRate, @minPoints)
          ON CONFLICT(shop_id) DO UPDATE SET
            enabled=excluded.enabled,
            earn_rate=excluded.earn_rate,
            redeem_rate=excluded.redeem_rate,
            min_points=excluded.min_points
        `).run({
          shopId,
          enabled: loyalty.enabled ? 1 : 0,
          earnRate: loyalty.earnRate,
          redeemRate: loyalty.redeemRate,
          minPoints: loyalty.minPointsToRedeem
        });
      }

      // 2. Discounts (Full Replace)
      db.prepare("DELETE FROM business_rules_discounts WHERE shop_id = ?").run(shopId);
      const insertDiscount = db.prepare(`
        INSERT INTO business_rules_discounts (shop_id, name, type, value)
        VALUES (@shopId, @name, @type, @value)
      `);
      if (Array.isArray(discounts)) {
        for (const d of discounts) {
          insertDiscount.run({
            shopId,
            name: d.name,
            type: d.type,
            value: d.value
          });
        }
      }

      // 3. Taxes (Full Replace)
      db.prepare("DELETE FROM business_rules_taxes WHERE shop_id = ?").run(shopId);
      const insertTax = db.prepare(`
        INSERT INTO business_rules_taxes (shop_id, name, rate, is_default)
        VALUES (@shopId, @name, @rate, @isDefault)
      `);
      if (Array.isArray(taxes)) {
        for (const t of taxes) {
          insertTax.run({
            shopId,
            name: t.name,
            rate: t.rate,
            isDefault: t.isDefault ? 1 : 0
          });
        }
      }

      // 4. Surcharges (Full Replace)
      db.prepare("DELETE FROM business_rules_surcharges WHERE shop_id = ?").run(shopId);
      const insertSurcharge = db.prepare(`
        INSERT INTO business_rules_surcharges (shop_id, min_amount, type, value)
        VALUES (@shopId, @minAmount, @type, @value)
      `);
      if (Array.isArray(surcharges)) {
        for (const s of surcharges) {
          insertSurcharge.run({
            shopId,
            minAmount: s.minAmount,
            type: s.type,
            value: s.value
          });
        }
      }
    });

    updateRules();
    res.json({ ok: true });
    
  } catch (error) {
    console.error("Failed to save business rules:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;