import { Router } from "express";
import {
  openShopDatabase,
  resolveShopIdByOwnerEmail,
  shopDatabaseExists,
  getShopDatabaseFileName,
} from "../utils/shop-database.js";
import {
  requireShopBody,
  loadShopAuth,
  requireManagerOrOwner,
  requireOwner,
} from "../middleware/shop-auth.js";
import {
  listMembers,
  registerTeamMember,
  resolveShopContext,
  updateMember,
  ensureOwnerMember,
} from "../services/team-service.js";
import { ensurePrimaryTerminal, validateTerminalToken } from "../services/terminal-service.js";

const router = Router();

router.get("/context", (req, res) => {
  try {
    const shopId = req.query.shopId;
    const userEmail = req.query.userEmail;
    const terminalId = req.query.terminalId || null;
    const terminalToken = req.query.terminalToken || null;
    if (!shopId || !userEmail) {
      return res.status(400).json({ error: "shopId and userEmail are required" });
    }
    if (!shopDatabaseExists(shopId)) {
      return res.status(404).json({ error: "Shop not found" });
    }

    const db = openShopDatabase(shopId);
    try {
      if (terminalId && terminalToken) {
        const terminalCheck = validateTerminalToken(db, shopId, terminalId, terminalToken);
        if (!terminalCheck.ok) {
          return res.status(401).json({ error: terminalCheck.error });
        }
      } else if (terminalId && !terminalToken) {
        return res.status(401).json({ error: "terminalToken is required when terminalId is provided" });
      }

      const context = resolveShopContext(db, shopId, userEmail, terminalId || undefined);
      return res.json({
        ok: true,
        dbFileName: getShopDatabaseFileName(shopId),
        ...context,
      });
    } finally {
      db.close();
    }
  } catch (err) {
    return res.status(403).json({ error: err.message || "Forbidden" });
  }
});

router.post(
  "/register",
  requireShopBody,
  (req, res, next) => {
    req.shopId = req.body.shopId;
    req.userEmail = req.body.userEmail;
    next();
  },
  (req, res) => {
    try {
      const { shopId, ownerEmail, userEmail, displayName, clerkUserId, accountType } = req.body || {};
      if (!displayName) {
        return res.status(400).json({ error: "displayName is required" });
      }

      const resolvedShopId = shopId || resolveShopIdByOwnerEmail(ownerEmail)?.shopId;
      if (!resolvedShopId) {
        return res.status(404).json({ error: "Shop not found for the provided main terminal email" });
      }

      const db = openShopDatabase(resolvedShopId);
      try {
        if (accountType === "owner") {
          const shopMeta = db.prepare("SELECT * FROM shop_meta WHERE shop_id = ?").get(resolvedShopId);
          const owner = ensureOwnerMember(db, resolvedShopId, shopMeta);
          ensurePrimaryTerminal(db, resolvedShopId, owner.member_id, req.body.deviceMeta);
          const context = resolveShopContext(db, resolvedShopId, userEmail);
          return res.json({
            ok: true,
            dbFileName: getShopDatabaseFileName(resolvedShopId),
            ...context,
          });
        }

        const member = registerTeamMember(db, resolvedShopId, {
          email: userEmail,
          displayName,
          clerkUserId,
        });
        const context = resolveShopContext(db, resolvedShopId, userEmail);
        return res.status(201).json({
          ok: true,
          dbFileName: getShopDatabaseFileName(resolvedShopId),
          member,
          ...context,
        });
      } finally {
        db.close();
      }
    } catch (err) {
      return res.status(400).json({ error: err.message || "Registration failed" });
    }
  },
);

router.get(
  "/members",
  requireShopBody,
  loadShopAuth,
  requireManagerOrOwner,
  (req, res) => {
    try {
      const members = listMembers(req.db, req.shopId);
      return res.json({ ok: true, members });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },
);

router.patch(
  "/members/:memberId",
  requireShopBody,
  loadShopAuth,
  requireOwner,
  (req, res) => {
    try {
      const updated = updateMember(
        req.db,
        req.shopId,
        req.params.memberId,
        {
          role: req.body?.role,
          status: req.body?.status,
          displayName: req.body?.displayName,
          proTeamSeat: req.body?.proTeamSeat,
        },
        req.shopAuth.member,
      );
      return res.json({ ok: true, member: updated });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  },
);

export default router;
