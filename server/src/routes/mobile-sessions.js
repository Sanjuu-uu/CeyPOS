import express from "express";
import { randomUUID } from "crypto";
import { openShopDatabase, shopDatabaseExists } from "../utils/shop-database.js";
import { publishChange } from "../realtime/change-bus.js";
import { memberCanAccessShop } from "../middleware/shop-auth.js";
import { getMemberByEmail, normalizeEmail } from "../services/team-service.js";
import { buildMemberScope, getShopPlanLimits, scopeAllows } from "../services/member-scope.js";

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
