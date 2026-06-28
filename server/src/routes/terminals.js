import { Router } from "express";
import { openShopDatabase, shopDatabaseExists } from "../utils/shop-database.js";
import {
  requireShopBody,
  loadShopAuth,
  requireManagerOrOwner,
  requireScope,
} from "../middleware/shop-auth.js";
import {
  createPairingCode,
  requestTerminalPairing,
  listPendingPairingRequests,
  approvePairingRequest,
  rejectPairingRequest,
  listActiveTerminals,
  revokeTerminal,
  getPairingRequestStatus,
  claimApprovedPairing,
  ensurePrimaryTerminal,
} from "../services/terminal-service.js";
import { getEmployeeOfMonth, getMemberStats } from "../services/member-stats-service.js";
import { scopeAllows } from "../services/member-scope.js";

const router = Router();

router.post(
  "/pairing-code/create",
  requireShopBody,
  loadShopAuth,
  requireManagerOrOwner,
  (req, res) => {
    try {
      const result = createPairingCode(req.db, req.shopId, req.shopAuth.member.memberId);
      return res.json({ ok: true, ...result });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  },
);

router.post(
  "/pairing/request",
  requireShopBody,
  loadShopAuth,
  (req, res) => {
    try {
      const { code, deviceMeta } = req.body || {};
      const result = requestTerminalPairing(req.db, req.shopId, {
        code,
        memberId: req.shopAuth.member.memberId,
        deviceMeta,
      });
      return res.json({ ok: true, ...result });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  },
);

router.get(
  "/pairing/pending",
  requireShopBody,
  loadShopAuth,
  requireManagerOrOwner,
  (req, res) => {
    try {
      const pending = listPendingPairingRequests(req.db, req.shopId);
      return res.json({ ok: true, pending });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },
);

router.post("/pairing/claim", requireShopBody, loadShopAuth, (req, res) => {
  try {
    const { requestId } = req.body || {};
    const memberId = req.shopAuth?.member?.memberId;
    if (!requestId || !memberId) {
      return res.status(400).json({ error: "requestId and active member are required" });
    }
    const result = claimApprovedPairing(requestId, memberId);
    if (!result.ok) return res.status(400).json({ error: result.error });
    return res.json({ ok: true, ...result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/pairing/status/:requestId", (req, res) => {
  try {
    const { shopId } = req.query;
    if (!shopId) return res.status(400).json({ error: "shopId required" });
    if (!shopDatabaseExists(shopId)) return res.status(404).json({ error: "Shop not found" });

    const db = openShopDatabase(shopId);
    try {
      const row = getPairingRequestStatus(db, shopId, req.params.requestId);
      if (!row) return res.status(404).json({ error: "Request not found" });

      let terminalToken = null;
      let terminalId = null;
      if (row.status === "approved" && row.terminal_id) {
        terminalId = row.terminal_id;
      }

      return res.json({
        ok: true,
        status: row.status,
        requestId: row.request_id,
        terminalId,
        terminalToken,
      });
    } finally {
      db.close();
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post(
  "/pairing/approve",
  requireShopBody,
  loadShopAuth,
  requireManagerOrOwner,
  (req, res) => {
    try {
      const { requestId } = req.body || {};
      if (!requestId) return res.status(400).json({ error: "requestId required" });
      const result = approvePairingRequest(
        req.db,
        req.shopId,
        requestId,
        req.shopAuth.member.memberId,
      );
      return res.json({ ok: true, ...result });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  },
);

router.post(
  "/pairing/reject",
  requireShopBody,
  loadShopAuth,
  requireManagerOrOwner,
  (req, res) => {
    try {
      const { requestId } = req.body || {};
      if (!requestId) return res.status(400).json({ error: "requestId required" });
      rejectPairingRequest(req.db, req.shopId, requestId, req.shopAuth.member.memberId);
      return res.json({ ok: true });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  },
);

router.get(
  "/active",
  requireShopBody,
  loadShopAuth,
  requireScope("sessions"),
  (req, res) => {
    try {
      const terminals = listActiveTerminals(req.db, req.shopId);
      const mobileSessions = req.db
        .prepare(
          `SELECT session_id, session_type, status, created_at, expires_at, created_by_email, last_seen_at, scan_url
           FROM mobile_sessions
           WHERE shop_id = ? AND datetime(expires_at) > datetime('now')
           ORDER BY created_at DESC`,
        )
        .all(req.shopId);

      return res.json({ ok: true, terminals, mobileSessions });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },
);

router.post(
  "/revoke",
  requireShopBody,
  loadShopAuth,
  requireManagerOrOwner,
  (req, res) => {
    try {
      const { terminalId } = req.body || {};
      if (!terminalId) return res.status(400).json({ error: "terminalId required" });
      revokeTerminal(req.db, req.shopId, terminalId, req.shopAuth.member.memberId);
      return res.json({ ok: true });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  },
);

router.post(
  "/primary/ensure",
  requireShopBody,
  loadShopAuth,
  (req, res) => {
    try {
      const terminal = ensurePrimaryTerminal(
        req.db,
        req.shopId,
        req.shopAuth.member.memberId,
        req.body?.deviceMeta,
      );
      return res.json({
        ok: true,
        terminal: {
          terminalId: terminal.terminal_id,
          terminalType: terminal.terminal_type,
          label: terminal.label,
        },
        terminalToken: terminal.plainToken || null,
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  },
);

router.get(
  "/member-stats",
  requireShopBody,
  loadShopAuth,
  (req, res) => {
    try {
      const { memberId, fromDate, toDate } = req.query;
      const scope = req.shopAuth?.scope;
      let scopedMemberId = memberId || null;

      if (scope?.role === "cashier") {
        scopedMemberId = scope.memberId;
      } else if (!scopeAllows(scope, "analytics")) {
        return res.status(403).json({ error: "Missing scope: analytics" });
      } else if (memberId && scope?.role !== "owner" && scope?.role !== "manager") {
        scopedMemberId = scope.memberId;
      }

      const stats = getMemberStats(req.db, req.shopId, {
        memberId: scopedMemberId,
        fromDate,
        toDate,
      });
      const employeeOfMonth =
        scope?.role === "cashier"
          ? null
          : getEmployeeOfMonth(req.db, req.shopId);
      return res.json({ ok: true, stats, employeeOfMonth });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },
);

export default router;
