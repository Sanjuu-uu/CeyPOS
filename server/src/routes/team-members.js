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
import { requireClerkSession } from "../middleware/clerk-auth.js";
import {
  listMembers,
  registerTeamMember,
  resolveShopContext,
  updateMember,
  ensureOwnerMember,
} from "../services/team-service.js";
import { ensurePrimaryTerminal, validateTerminalToken } from "../services/terminal-service.js";
import {
  sendEmployeePhoneCode,
  verifyEmployeePhoneCode,
} from "../services/employee-verification.js";

const router = Router();

router.use(requireClerkSession);

router.post("/verify/send-code", async (req, res) => {
  try {
    const phone = req.body?.phone;
    const userEmail = req.userEmail;
    if (!userEmail || !phone) {
      return res.status(400).json({ error: "userEmail and phone are required" });
    }
    const result = await sendEmployeePhoneCode({ userEmail, phone });
    return res.json(result);
  } catch (err) {
    const status =
      err.code === "invalid_phone" || err.code === "invalid_request" ? 400 : 503;
    return res.status(status).json({ error: err.message || "Failed to send code" });
  }
});

router.post("/verify/check-code", (req, res) => {
  try {
    const { phone, code } = req.body || {};
    const userEmail = req.userEmail;
    if (!userEmail || !phone || !code) {
      return res.status(400).json({ error: "userEmail, phone, and code are required" });
    }
    const result = verifyEmployeePhoneCode({ userEmail, phone, code });
    return res.json(result);
  } catch (err) {
    const status =
      err.code === "invalid_code" || err.code === "invalid_request" ? 400 : 429;
    return res.status(status).json({ error: err.message || "Verification failed" });
  }
});

router.post("/lookup-owner", (req, res) => {
  try {
    const { ownerEmail } = req.body || {};
    if (!ownerEmail) {
      return res.status(400).json({ error: "ownerEmail is required" });
    }
    const resolved = resolveShopIdByOwnerEmail(ownerEmail);
    if (!resolved?.shopId) {
      return res.status(404).json({ error: "No shop found for this main terminal email" });
    }
    return res.json({ ok: true, shopId: resolved.shopId });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Lookup failed" });
  }
});

router.get("/context", requireShopBody, (req, res) => {
  try {
    const shopId = req.shopId;
    const userEmail = req.userEmail;
    const terminalId = req.query.terminalId || null;
    const terminalToken = req.query.terminalToken || null;

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

router.post("/register", requireShopBody, (req, res) => {
  try {
    const { ownerEmail, displayName, accountType } = req.body || {};
    const userEmail = req.userEmail;
    const clerkUserId = req.clerkUserId || req.body?.clerkUserId;

    if (!displayName) {
      return res.status(400).json({ error: "displayName is required" });
    }

    const resolvedShopId =
      req.shopId || resolveShopIdByOwnerEmail(ownerEmail)?.shopId;
    if (!resolvedShopId) {
      return res.status(404).json({
        error: "Shop not found for the provided main terminal email",
      });
    }

    const db = openShopDatabase(resolvedShopId);
    try {
      if (accountType === "owner") {
        const shopMeta = db
          .prepare("SELECT * FROM shop_meta WHERE shop_id = ?")
          .get(resolvedShopId);
        const owner = ensureOwnerMember(db, resolvedShopId, shopMeta);
        ensurePrimaryTerminal(db, resolvedShopId, owner.member_id, req.body.deviceMeta);
        const context = resolveShopContext(db, resolvedShopId, userEmail);
        return res.json({
          ok: true,
          shopId: resolvedShopId,
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
        shopId: resolvedShopId,
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
});

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
