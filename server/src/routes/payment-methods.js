import { Router } from "express";
import {
  shopDatabaseExists,
  openShopDatabase,
  replaceShopPaymentMethods,
} from "../utils/shop-database.js";
import { publishChange } from "../realtime/change-bus.js";
import { requireClerkSession } from "../middleware/clerk-auth.js";
import {
  requireShopBody,
  loadShopAuth,
  requireScope,
} from "../middleware/shop-auth.js";

const router = Router();

router.use("/:shopId", requireClerkSession, requireShopBody, loadShopAuth);

router.get("/:shopId", requireScope("pos"), (req, res) => {
  const { shopId } = req.params;
  if (!shopId) {
    return res.status(400).json({ ok: false, error: "shop_id_required" });
  }
  if (!shopDatabaseExists(shopId)) {
    return res.status(404).json({ ok: false, error: "shop_not_found" });
  }

  const db = openShopDatabase(shopId);
  try {
    const methods = db
      .prepare("SELECT method FROM shop_payment_methods WHERE shop_id = ?")
      .all(shopId)
      .map((row) => row.method);
    res.json({ ok: true, methods });
  } catch (error) {
    console.error("GET /payment-methods error", error);
    res.status(500).json({ ok: false, error: "failed_to_read_methods" });
  } finally {
    db.close();
  }
});

router.put("/:shopId", requireScope("payments"), (req, res) => {
  const { shopId } = req.params;
  const { methods = [], actor = null } = req.body || {};

  if (!shopId) {
    return res.status(400).json({ ok: false, error: "shop_id_required" });
  }
  if (!shopDatabaseExists(shopId)) {
    return res.status(404).json({ ok: false, error: "shop_not_found" });
  }
  if (!Array.isArray(methods)) {
    return res.status(400).json({ ok: false, error: "methods_must_be_array" });
  }

  const db = openShopDatabase(shopId);
  try {
    replaceShopPaymentMethods(db, shopId, methods);
    publishChange({
      shopId,
      entity: "payment_methods",
      action: "replace",
      payload: { methods: methods.map((m) => String(m)) },
      actor: actor ? String(actor) : null,
    });
    res.json({ ok: true, methods });
  } catch (error) {
    console.error("PUT /payment-methods error", error);
    res.status(500).json({ ok: false, error: "failed_to_save_methods" });
  } finally {
    db.close();
  }
});

export default router;
