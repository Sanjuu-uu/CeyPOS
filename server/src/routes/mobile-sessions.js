import express from "express";
import { randomUUID } from "crypto";
import { openShopDatabase, shopDatabaseExists } from "../utils/shop-database.js";
import { publishChange } from "../realtime/change-bus.js";
import { memberCanAccessShop } from "../middleware/shop-auth.js";
import { getMemberByEmail, normalizeEmail } from "../services/team-service.js";
import { buildMemberScope, getShopPlanLimits, scopeAllows } from "../services/member-scope.js";
import { upsertProducts } from "../services/inventory-service.js";
import { lookupGlobalBarcodeProduct } from "../utils/global-barcode-database.js";

const router = express.Router();

const SESSION_TTL_MS = 5 * 60 * 1000;

const normalizeOrigin = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim().replace(/\/$/, "");
  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
};

const firstHeaderValue = (value) => {
  const candidate = Array.isArray(value) ? value[0] : value;
  return typeof candidate === "string" ? candidate.split(",")[0].trim() : "";
};

const getConfiguredAppOrigin = () => {
  const candidates = [
    process.env.PUBLIC_APP_URL,
    process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : "",
    process.env.RAILWAY_STATIC_URL,
    process.env.APP_URL,
  ];

  for (const candidate of candidates) {
    const value = normalizeOrigin(candidate);
    if (value) {
      return value;
    }
  }

  return "";
};

const resolveOrigin = (req) => {
  const configuredOrigin = getConfiguredAppOrigin();
  if (configuredOrigin) {
    return configuredOrigin;
  }

  const originHeader = req.get("origin");
  if (originHeader) {
    return normalizeOrigin(originHeader);
  }

  const forwardedProto = req.get("x-forwarded-proto");
  const forwardedHost = req.get("x-forwarded-host");
  const forwardedProtocol = firstHeaderValue(forwardedProto);
  const forwardedHostname = firstHeaderValue(forwardedHost);
  if (forwardedProtocol && forwardedHostname) {
    return normalizeOrigin(`${forwardedProtocol}://${forwardedHostname}`);
  }

  const host = req.get("host");
  if (host) {
    return normalizeOrigin(`${req.protocol}://${host}`);
  }

  return "";
};

const toIso = (value) => new Date(value).toISOString();

const normalizeBarcode = (value) => String(value || "").replace(/\s+/g, "").trim();

function getAuthorizedSession(db, { shopId, sessionId, token, sessionType, userEmail }) {
  const auth = authorizeMobileSession(db, shopId, userEmail, sessionType);
  if (!auth.ok) {
    return { ok: false, status: 403, error: auth.error };
  }

  const session = db
    .prepare(
      `SELECT session_id, session_type, status, auth_token, expires_at
       FROM mobile_sessions
       WHERE session_id = ? AND shop_id = ?`
    )
    .get(sessionId, shopId);

  if (!session) {
    return { ok: false, status: 404, error: "Session not found" };
  }
  if (String(session.auth_token) !== String(token)) {
    return { ok: false, status: 401, error: "Invalid session token" };
  }
  if (sessionType && String(session.session_type) !== String(sessionType)) {
    return { ok: false, status: 400, error: "Session type mismatch" };
  }
  const expiresAtMs = Date.parse(session.expires_at);
  if (Number.isFinite(expiresAtMs) && Date.now() > expiresAtMs) {
    return { ok: false, status: 410, error: "Session expired" };
  }

  return { ok: true, session, auth };
}

function lookupBarcodeInDb(db, barcode, { includeGlobal = true } = {}) {
  const clean = normalizeBarcode(barcode);
  if (!clean) return null;

  const inventory = db
    .prepare(
      `SELECT *
       FROM inventory
       WHERE barcode_id = ?
       LIMIT 1`
    )
    .get(clean);
  if (inventory) {
    return { source: "inventory", product: inventory };
  }

  if (includeGlobal) {
    const globalProduct = lookupGlobalBarcodeProduct(clean);
    if (globalProduct) {
      return { source: "global", product: globalProduct };
    }
  }

  return null;
}

function authorizeMobileSession(db, shopId, userEmail, sessionType) {
  if (!memberCanAccessShop(db, shopId, userEmail)) {
    return { ok: false, error: "User is not authorized for shop" };
  }

  const member = getMemberByEmail(db, shopId, userEmail);
  const shopMeta = db.prepare("SELECT * FROM shop_meta WHERE shop_id = ?").get(shopId);
  const scope = buildMemberScope(member, null, getShopPlanLimits(shopMeta));

  if (sessionType === "barcode" && !scopeAllows(scope, "inventory")) {
    return { ok: false, error: "Import sessions require inventory access" };
  }
  if (sessionType === "checkout" && !scopeAllows(scope, "pos")) {
    return { ok: false, error: "Checkout sessions require POS access" };
  }
  if (!scopeAllows(scope, "sessions") && scope.role !== "owner") {
    return { ok: false, error: "Mobile sessions not enabled for this account" };
  }

  return { ok: true, member, scope };
}

router.post("/sessions/create", (req, res) => {
  try {
    const { shopId, sessionType, userEmail, userId, deviceMeta } = req.body || {};
    if (!shopId || !sessionType || !userEmail) {
      return res
        .status(400)
        .json({ error: "shopId, sessionType, and userEmail are required" });
    }

    if (!shopDatabaseExists(shopId)) {
      return res.status(404).json({ error: "Shop database not found" });
    }

    const db = openShopDatabase(shopId);
    try {
      const auth = authorizeMobileSession(db, shopId, userEmail, sessionType);
      if (!auth.ok) {
        return res.status(403).json({ error: auth.error });
      }

      const now = Date.now();
      const sessionId = randomUUID();
      const authToken = randomUUID().replace(/-/g, "");
      const expiresAt = now + SESSION_TTL_MS;
      const origin = resolveOrigin(req);
      const scanUrl = origin
        ? `${origin}/mobilesessions/scan?session=${encodeURIComponent(
            sessionId
          )}&shopId=${encodeURIComponent(shopId)}&type=${encodeURIComponent(
            sessionType
          )}&token=${encodeURIComponent(authToken)}`
        : null;

      db.prepare(
        `INSERT INTO mobile_sessions (
           session_id, shop_id, session_type, status, auth_token,
           created_at, expires_at, created_by_email, created_by_user_id, device_meta, created_by_member_id, scan_url
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        sessionId,
        shopId,
        sessionType,
        "pending",
        authToken,
        toIso(now),
        toIso(expiresAt),
        userEmail,
        userId || null,
        deviceMeta ? JSON.stringify(deviceMeta) : null,
        auth.member?.member_id || null,
        scanUrl,
      );

      publishChange({
        shopId,
        entity: "sessions",
        action: "created",
        payload: {
          sessionId,
          sessionType,
          createdBy: userEmail,
          expiresAt: toIso(expiresAt),
        },
      });

      return res.json({
        ok: true,
        sessionId,
        sessionType,
        authToken,
        expiresAt: toIso(expiresAt),
        scanUrl,
      });
    } finally {
      db.close();
    }
  } catch (err) {
    console.error("/mobile/sessions/create error", err);
    return res.status(500).json({ error: "Failed to create session" });
  }
});

router.post("/sessions/validate", (req, res) => {
  try {
    const { sessionId, token, shopId, sessionType, userEmail, userId, deviceMeta } =
      req.body || {};
    if (!sessionId || !token || !shopId || !userEmail) {
      return res
        .status(400)
        .json({ error: "sessionId, token, shopId, and userEmail are required" });
    }

    if (!shopDatabaseExists(shopId)) {
      return res.status(404).json({ error: "Shop database not found" });
    }

    const db = openShopDatabase(shopId);
    try {
      const auth = authorizeMobileSession(db, shopId, userEmail, sessionType);
      if (!auth.ok) {
        return res.status(403).json({ error: auth.error });
      }

      const session = db
        .prepare(
          "SELECT session_id, session_type, status, auth_token, expires_at FROM mobile_sessions WHERE session_id = ? AND shop_id = ?"
        )
        .get(sessionId, shopId);

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (String(session.auth_token) !== String(token)) {
        return res.status(401).json({ error: "Invalid session token" });
      }

      if (sessionType && String(session.session_type) !== String(sessionType)) {
        return res.status(400).json({ error: "Session type mismatch" });
      }

      const now = Date.now();
      const expiresAtMs = Date.parse(session.expires_at);
      if (Number.isFinite(expiresAtMs) && now > expiresAtMs) {
        return res.status(410).json({ error: "Session expired" });
      }

      db.prepare(
        `UPDATE mobile_sessions
         SET status = ?, last_seen_at = ?, last_seen_email = ?, last_seen_user_id = ?, device_meta = ?
         WHERE session_id = ?`
      ).run(
        "active",
        toIso(now),
        userEmail,
        userId || null,
        deviceMeta ? JSON.stringify(deviceMeta) : null,
        sessionId
      );

      publishChange({
        shopId,
        entity: "sessions",
        action: "linked",
        payload: {
          sessionId,
          sessionType: session.session_type,
          linkedBy: userEmail,
        },
      });

      return res.json({
        ok: true,
        sessionId,
        shopId,
        sessionType: session.session_type,
        status: "active",
        expiresAt: session.expires_at,
      });
    } finally {
      db.close();
    }
  } catch (err) {
    console.error("/mobile/sessions/validate error", err);
    return res.status(500).json({ error: "Failed to validate session" });
  }
});

router.post("/barcode/lookup", (req, res) => {
  try {
    const { sessionId, token, shopId, sessionType, userEmail, barcode } =
      req.body || {};
    const cleanBarcode = normalizeBarcode(barcode);
    if (!sessionId || !token || !shopId || !userEmail || !cleanBarcode) {
      return res.status(400).json({
        error: "sessionId, token, shopId, userEmail, and barcode are required",
      });
    }
    if (!shopDatabaseExists(shopId)) {
      return res.status(404).json({ error: "Shop database not found" });
    }

    const db = openShopDatabase(shopId);
    try {
      const sessionCheck = getAuthorizedSession(db, {
        shopId,
        sessionId,
        token,
        sessionType,
        userEmail,
      });
      if (!sessionCheck.ok) {
        return res.status(sessionCheck.status).json({ error: sessionCheck.error });
      }

      const result = lookupBarcodeInDb(db, cleanBarcode, {
        includeGlobal: sessionCheck.session.session_type === "barcode",
      });
      return res.json({
        ok: true,
        barcode: cleanBarcode,
        found: Boolean(result),
        source: result?.source || null,
        product: result?.product || null,
      });
    } finally {
      db.close();
    }
  } catch (err) {
    console.error("/mobile/barcode/lookup error", err);
    return res.status(500).json({ error: "Failed to lookup barcode" });
  }
});

router.post("/import-product", (req, res) => {
  try {
    const {
      sessionId,
      token,
      shopId,
      sessionType = "barcode",
      userEmail,
      barcode,
      product = {},
    } = req.body || {};
    const cleanBarcode = normalizeBarcode(barcode || product.barcode_id || product.barcode);
    const name = String(product.name || "").trim();
    if (!sessionId || !token || !shopId || !userEmail || !cleanBarcode || !name) {
      return res.status(400).json({
        error: "sessionId, token, shopId, userEmail, barcode, and product name are required",
      });
    }
    if (!shopDatabaseExists(shopId)) {
      return res.status(404).json({ error: "Shop database not found" });
    }

    const db = openShopDatabase(shopId);
    try {
      const sessionCheck = getAuthorizedSession(db, {
        shopId,
        sessionId,
        token,
        sessionType,
        userEmail,
      });
      if (!sessionCheck.ok) {
        return res.status(sessionCheck.status).json({ error: sessionCheck.error });
      }
      if (sessionCheck.session.session_type !== "barcode") {
        return res.status(400).json({ error: "Only import sessions can save products" });
      }

      const existing = db
        .prepare("SELECT inventory_code FROM inventory WHERE barcode_id = ? LIMIT 1")
        .get(cleanBarcode);
      const inventoryCode =
        product.inventory_code ||
        product.inventoryCode ||
        existing?.inventory_code ||
        `MOB-${cleanBarcode}`.slice(0, 64);

      db.close();
      const rows = upsertProducts(shopId, [
        {
          inventory_code: inventoryCode,
          barcode_id: cleanBarcode,
          name,
          category: String(product.category || "Uncategorized").trim() || "Uncategorized",
          sku: product.sku ? String(product.sku).trim() : null,
          price:
            product.price === "" || product.price === null || product.price === undefined
              ? 0
              : Number(product.price),
          stock:
            product.stock === "" || product.stock === null || product.stock === undefined
              ? 0
              : Number(product.stock),
          image_url: product.image_url || product.imageUrl || null,
        },
      ], {
        metadata: { source: "mobile-import", sessionId },
        actor: userEmail,
      });

      return res.json({ ok: true, row: rows[0] || null });
    } finally {
      if (db.open) {
        db.close();
      }
    }
  } catch (err) {
    console.error("/mobile/import-product error", err);
    return res.status(500).json({ error: "Failed to save product" });
  }
});

// POST /api/mobile/sessions/revoke  — delete / deactivate any session by sessionId
router.post("/sessions/revoke", (req, res) => {
  try {
    const { sessionId, shopId, userEmail } = req.body || {};
    if (!sessionId || !shopId) {
      return res.status(400).json({ error: "sessionId and shopId are required" });
    }
    if (!shopDatabaseExists(shopId)) {
      return res.status(404).json({ error: "Shop not found" });
    }

    const db = openShopDatabase(shopId);
    try {
      const session = db
        .prepare(
          "SELECT session_id, session_type FROM mobile_sessions WHERE session_id = ? AND shop_id = ?"
        )
        .get(sessionId, shopId);

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      db.prepare("DELETE FROM mobile_sessions WHERE session_id = ?").run(sessionId);

      publishChange({
        shopId,
        entity: "sessions",
        action: "revoked",
        payload: {
          sessionId,
          sessionType: session.session_type,
          revokedBy: userEmail || null,
        },
      });

      return res.json({ ok: true });
    } finally {
      db.close();
    }
  } catch (err) {
    console.error("/mobile/sessions/revoke error", err);
    return res.status(500).json({ error: "Failed to revoke session" });
  }
});

router.get("/sessions/active", (req, res) => {
  try {
    const { shopId, userEmail } = req.query;
    if (!shopId || !userEmail) {
      return res.status(400).json({ error: "shopId and userEmail are required" });
    }
    if (!shopDatabaseExists(shopId)) {
      return res.status(404).json({ error: "Shop not found" });
    }

    const db = openShopDatabase(shopId);
    try {
      if (!memberCanAccessShop(db, shopId, userEmail)) {
        return res.status(403).json({ error: "User is not authorized for shop" });
      }

      const sessions = db
        .prepare(
          `SELECT session_id, session_type, status, created_at, expires_at, created_by_email, last_seen_at, scan_url
           FROM mobile_sessions
           WHERE shop_id = ? AND datetime(expires_at) > datetime('now')
           ORDER BY created_at DESC`,
        )
        .all(shopId);

      return res.json({ ok: true, sessions });
    } finally {
      db.close();
    }
  } catch (err) {
    return res.status(500).json({ error: "Failed to list sessions" });
  }
});

export default router;
