import { Router } from "express";
import {
  openShopDatabase,
  resolveShopIdByOwnerEmail,
  shopDatabaseExists,
  getShopDatabaseFileName,
} from "../utils/shop-database.js";
import { openGlobalVerificationDatabase } from "../utils/global-verification-database.js";
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
  removeTeamMemberByEmail,
  resolveShopContext,
  updateMember,
  ensureOwnerMember,
} from "../services/team-service.js";
import { ensurePrimaryTerminal, validateTerminalToken } from "../services/terminal-service.js";
import {
  sendPhoneVerificationCode,
  verifyPhoneCode,
  isPhoneVerified,
} from "../services/phone-verification-service.js";

const router = Router();

router.use(requireClerkSession);

/**
 * Send phone verification code (OTP)
 *
 * POST /api/team/verify/send-code
 * Body: { phone: string }
 * Returns: { ok: boolean, phone: string, devCode?: string }
 */
router.post("/verify/send-code", async (req, res) => {
  let db = null;
  try {
    const phone = req.body?.phone;
    const userEmail = req.userEmail;

    if (!userEmail || !phone) {
      return res.status(400).json({
        error: "Missing required fields",
        details: "userEmail and phone are required",
      });
    }

    db = openGlobalVerificationDatabase();

    const result = await sendPhoneVerificationCode(db, {
      shopId: null, // Not associated with a shop yet
      userEmail,
      phone,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.json(result);
  } catch (err) {
    // Map error codes to appropriate HTTP status codes
    const statusMap = {
      INVALID_EMAIL: 400,
      INVALID_PHONE_FORMAT: 400,
      RATE_LIMIT_EXCEEDED: 429,
      SMS_PROVIDER_UNCONFIGURED: 503,
      SMS_PROVIDER_AUTH_FAILED: 503,
      SMS_SENDING_FAILED: 503,
      OTP_GENERATION_FAILED: 500,
      UNKNOWN_ERROR: 500,
    };

    const status = statusMap[err.code] || 500;
    const errorResponse = {
      error: err.message || "Failed to send verification code",
      code: err.code,
    };

    if (err.retryAfterSeconds) {
      errorResponse.retryAfter = err.retryAfterSeconds;
      res.set("Retry-After", String(Math.ceil(err.retryAfterSeconds)));
    }

    return res.status(status).json(errorResponse);
  } finally {
    if (db) {
      try {
        db.close();
      } catch {
        // ignore
      }
    }
  }
});

/**
 * Verify phone verification code
 *
 * POST /api/team/verify/check-code
 * Body: { phone: string, code: string }
 * Returns: { ok: boolean, phone: string }
 */
router.post("/verify/check-code", async (req, res) => {
  let db = null;
  try {
    const { phone, code } = req.body || {};
    const userEmail = req.userEmail;

    if (!userEmail || !phone || !code) {
      return res.status(400).json({
        error: "Missing required fields",
        details: "userEmail, phone, and code are required",
      });
    }

    db = openGlobalVerificationDatabase();

    const result = await verifyPhoneCode(db, {
      shopId: null, // Not associated with a shop yet
      userEmail,
      phone,
      code,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.json(result);
  } catch (err) {
    // Map error codes to appropriate HTTP status codes
    const statusMap = {
      INVALID_EMAIL: 400,
      INVALID_PHONE_FORMAT: 400,
      INVALID_CODE_FORMAT: 400,
      OTP_NOT_FOUND: 404,
      OTP_EXPIRED: 410,
      ALREADY_VERIFIED: 200, // Not an error, already verified
      INVALID_CODE: 400,
      TOO_MANY_ATTEMPTS: 429,
      UNKNOWN_ERROR: 500,
    };

    const status = statusMap[err.code] || 500;

    if (err.code === "ALREADY_VERIFIED") {
      return res.status(200).json({
        ok: true,
        message: "Phone number already verified",
      });
    }

    const errorResponse = {
      error: err.message || "Verification failed",
      code: err.code,
    };

    if (err.attemptsRemaining !== undefined) {
      errorResponse.attemptsRemaining = err.attemptsRemaining;
    }

    return res.status(status).json(errorResponse);
  } finally {
    if (db) {
      try {
        db.close();
      } catch {
        // ignore
      }
    }
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
  let verificationDb = null;
  try {
    const { ownerEmail, displayName, accountType, phone } = req.body || {};
    const userEmail = req.userEmail;
    const clerkUserId = req.clerkUserId || req.body?.clerkUserId;

    if (!displayName) {
      return res.status(400).json({ error: "displayName is required" });
    }

    if (accountType === "team") {
      if (!phone) {
        return res.status(400).json({ error: "phone is required" });
      }
      const { phoneVerificationSkipped } = req.body || {};
      verificationDb = openGlobalVerificationDatabase();
      if (!phoneVerificationSkipped && !isPhoneVerified(verificationDb, userEmail, phone)) {
        return res.status(403).json({
          error: "Phone number must be verified before completing registration",
          code: "PHONE_NOT_VERIFIED",
        });
      }
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
  } finally {
    if (verificationDb) {
      try {
        verificationDb.close();
      } catch {
        // ignore
      }
    }
  }
});

router.post("/cancel-onboard", requireShopBody, (req, res) => {
  try {
    const userEmail = req.userEmail;
    const shopId = req.shopId;
    const db = openShopDatabase(shopId);
    try {
      const result = removeTeamMemberByEmail(db, shopId, userEmail);
      return res.json({ ok: true, ...result });
    } finally {
      db.close();
    }
  } catch (err) {
    return res.status(400).json({ error: err.message || "Cancel failed" });
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
