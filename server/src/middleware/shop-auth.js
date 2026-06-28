import { openShopDatabase, shopDatabaseExists, resolveShopIdByOwnerEmail } from "../utils/shop-database.js";
import { resolveShopContext, normalizeEmail, getMemberByEmail } from "../services/team-service.js";
import { scopeAllows, scopeAllowsAi } from "../services/member-scope.js";
import { validateTerminalToken } from "../services/terminal-service.js";

export function requireShopBody(req, res, next) {
  const shopId = req.body?.shopId || req.query?.shopId || resolveShopIdByOwnerEmail(req.body?.ownerEmail || req.query?.ownerEmail)?.shopId;
  const userEmail = req.userEmail || req.body?.userEmail || req.query?.userEmail;
  if (!shopId || !userEmail) {
    return res.status(400).json({ error: "shopId and userEmail are required" });
  }
  if (!shopDatabaseExists(shopId)) {
    return res.status(404).json({ error: "Shop not found" });
  }
  req.shopId = shopId;
  req.userEmail = normalizeEmail(userEmail);
  next();
}

export function loadShopAuth(req, res, next) {
  try {
    const terminalId = req.body?.terminalId || req.query?.terminalId || null;
    const terminalToken = req.body?.terminalToken || req.query?.terminalToken || null;

    const db = openShopDatabase(req.shopId);
    try {
      if (terminalId && terminalToken) {
        const check = validateTerminalToken(db, req.shopId, terminalId, terminalToken);
        if (!check.ok) {
          return res.status(401).json({ error: check.error });
        }
      }

      req.shopAuth = resolveShopContext(db, req.shopId, req.userEmail, terminalId || undefined);
      req.db = db;
      res.on("finish", () => {
        if (req.db) {
          try {
            req.db.close();
          } catch {
            // ignore
          }
          req.db = null;
        }
      });
      next();
    } catch (err) {
      db.close();
      return res.status(403).json({ error: err.message || "Forbidden" });
    }
  } catch (err) {
    return res.status(500).json({ error: "Auth resolution failed" });
  }
}

export function closeShopDb(req, res, next) {
  if (req.db) {
    try {
      req.db.close();
    } catch {
      // ignore
    }
    req.db = null;
  }
  next();
}

export function requireScope(moduleKey) {
  return (req, res, next) => {
    if (!scopeAllows(req.shopAuth?.scope, moduleKey)) {
      return res.status(403).json({ error: `Missing scope: ${moduleKey}` });
    }
    next();
  };
}

export function requireManagerOrOwner(req, res, next) {
  const role = req.shopAuth?.scope?.role;
  if (role !== "owner" && role !== "manager") {
    return res.status(403).json({ error: "Manager or owner access required" });
  }
  next();
}

export function requireOwner(req, res, next) {
  if (req.shopAuth?.scope?.role !== "owner") {
    return res.status(403).json({ error: "Owner access required" });
  }
  next();
}

export function requireAiAccess(req, res, next) {
  if (!scopeAllowsAi(req.shopAuth?.scope)) {
    return res.status(403).json({ error: "AI analytics not available for this account" });
  }
  next();
}

export function memberCanAccessShop(db, shopId, email) {
  const member = getMemberByEmail(db, shopId, email);
  if (member && member.status === "active") return true;
  const owner = db.prepare("SELECT owner_email FROM shop_meta WHERE shop_id = ?").get(shopId);
  return normalizeEmail(owner?.owner_email) === normalizeEmail(email);
}
