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
import { requireClerkSession } from "../middleware/clerk-auth.js";
import crypto from "crypto";

const router = Router();

router.use(requireClerkSession);

const toCents = (value) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return 0;
  return Math.round(Math.max(0, numberValue) * 100);
};

const fromCents = (value) => Number((Number(value || 0) / 100).toFixed(2));

const cleanText = (value, max = 500) =>
  value === undefined || value === null ? null : String(value).trim().slice(0, max) || null;

const isManagerRole = (scope) => scope?.role === "owner" || scope?.role === "manager";

const mapShift = (row, movements = []) => {
  if (!row) return null;
  let report = null;
  try {
    report = row.end_of_day_report_json ? JSON.parse(row.end_of_day_report_json) : null;
  } catch {
    report = null;
  }
  return {
    shiftId: row.shift_id,
    shopId: row.shop_id,
    terminalId: row.terminal_id,
    memberId: row.member_id,
    memberName: row.member_name || row.display_name || null,
    status: row.status || (row.ended_at ? "closed" : "open"),
    startedAt: row.started_at,
    endedAt: row.ended_at,
    openingFloat: fromCents(row.opening_float_cents),
    cashPaidIn: fromCents(row.cash_paid_in_cents),
    cashPaidOut: fromCents(row.cash_paid_out_cents),
    expectedCash: fromCents(row.expected_cash_cents),
    actualClosingCash:
      row.actual_closing_cash_cents === null || row.actual_closing_cash_cents === undefined
        ? null
        : fromCents(row.actual_closing_cash_cents),
    variance:
      row.variance_cents === null || row.variance_cents === undefined
        ? null
        : fromCents(row.variance_cents),
    closingNotes: row.closing_notes || "",
    managerApprovalStatus: row.manager_approval_status || "not_required",
    managerApprovedByMemberId: row.manager_approved_by_member_id || null,
    managerApprovedAt: row.manager_approved_at || null,
    report,
    movements: movements.map((movement) => ({
      movementId: movement.movement_id,
      type: movement.movement_type,
      amount: fromCents(movement.amount_cents),
      reason: movement.reason || "",
      notes: movement.notes || "",
      memberId: movement.member_id,
      memberName: movement.member_name || null,
      managerApprovalStatus: movement.manager_approval_status || "not_required",
      createdAt: movement.created_at,
    })),
  };
};

const getOpenShift = (db, shopId, terminalId) =>
  db
    .prepare(
      `SELECT s.*, m.display_name AS member_name
         FROM member_shifts s
         LEFT JOIN shop_members m ON m.member_id = s.member_id
        WHERE s.shop_id = ? AND s.terminal_id = ? AND s.status = 'open'
        ORDER BY datetime(s.started_at) DESC
        LIMIT 1`,
    )
    .get(shopId, terminalId);

const getShiftMovements = (db, shiftId) =>
  db
    .prepare(
      `SELECT cm.*, m.display_name AS member_name
         FROM register_cash_movements cm
         LEFT JOIN shop_members m ON m.member_id = cm.member_id
        WHERE cm.shift_id = ?
        ORDER BY datetime(cm.created_at) DESC`,
    )
    .all(shiftId);

const calculateShiftCash = (db, shift) => {
  const sales = db
    .prepare(
      `SELECT
          COALESCE(SUM(CASE
            WHEN COALESCE(total_cents, 0) > 0 THEN total_cents
            ELSE CAST(ROUND(COALESCE(total, 0) * 100) AS INTEGER)
          END), 0) AS cash_sales_cents,
          COUNT(*) AS cash_transactions
         FROM transactions
        WHERE (terminal_id = ? OR (? = 'primary' AND terminal_id IS NULL))
          AND payment_method = 'cash'
          AND datetime(created_at) >= datetime(?)
          AND (? IS NULL OR datetime(created_at) <= datetime(?))`,
    )
    .get(shift.terminal_id, shift.terminal_id, shift.started_at, shift.ended_at || null, shift.ended_at || null);

  const openingFloatCents = Number(shift.opening_float_cents || 0);
  const paidInCents = Number(shift.cash_paid_in_cents || 0);
  const paidOutCents = Number(shift.cash_paid_out_cents || 0);
  const cashSalesCents = Number(sales?.cash_sales_cents || 0);
  const expectedCashCents = openingFloatCents + paidInCents + cashSalesCents - paidOutCents;

  return {
    openingFloatCents,
    paidInCents,
    paidOutCents,
    cashSalesCents,
    cashTransactions: Number(sales?.cash_transactions || 0),
    expectedCashCents,
  };
};

const fetchShiftSnapshot = (db, shopId, terminalId, limit = 20) => {
  const open = getOpenShift(db, shopId, terminalId);
  const history = db
    .prepare(
      `SELECT s.*, m.display_name AS member_name
         FROM member_shifts s
         LEFT JOIN shop_members m ON m.member_id = s.member_id
        WHERE s.shop_id = ? AND s.terminal_id = ?
        ORDER BY datetime(s.started_at) DESC
        LIMIT ?`,
    )
    .all(shopId, terminalId, limit);
  return {
    openShift: open ? mapShift(open, getShiftMovements(db, open.shift_id)) : null,
    history: history.map((shift) => mapShift(shift, getShiftMovements(db, shift.shift_id))),
  };
};

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
      if (!code || String(code).trim().length === 0) {
        return res.status(400).json({ error: "Pairing code is required" });
      }
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

router.get(
  "/shifts",
  requireShopBody,
  loadShopAuth,
  requireScope("sessions"),
  (req, res) => {
    try {
      const terminalId =
        req.query.terminalId ||
        req.shopAuth?.terminal?.terminalId ||
        req.shopAuth?.member?.terminal_id ||
        "primary";
      return res.json({
        ok: true,
        terminalId,
        ...fetchShiftSnapshot(req.db, req.shopId, String(terminalId)),
      });
    } catch (err) {
      return res.status(500).json({ error: err.message || "Failed to load shifts" });
    }
  },
);

router.post(
  "/shifts/open",
  requireShopBody,
  loadShopAuth,
  requireScope("sessions"),
  (req, res) => {
    try {
      const terminalId = cleanText(req.body?.terminalId || req.shopAuth?.terminal?.terminalId || "primary", 120);
      const memberId = req.shopAuth?.member?.memberId;
      if (!terminalId || !memberId) {
        return res.status(400).json({ error: "terminalId and active member are required" });
      }
      const existing = getOpenShift(req.db, req.shopId, terminalId);
      if (existing) {
        return res.status(409).json({ error: "Register already has an open shift" });
      }
      const now = new Date().toISOString();
      const openingFloatCents = toCents(req.body?.openingFloat);
      const shiftId = `shift_${crypto.randomUUID()}`;
      req.db
        .prepare(
          `INSERT INTO member_shifts (
             shift_id, shop_id, terminal_id, member_id, started_at, status,
             opening_float_cents, expected_cash_cents, manager_approval_status,
             opened_by_member_id
           ) VALUES (?, ?, ?, ?, ?, 'open', ?, ?, 'not_required', ?)`,
        )
        .run(shiftId, req.shopId, terminalId, memberId, now, openingFloatCents, openingFloatCents, memberId);
      return res.json({
        ok: true,
        ...fetchShiftSnapshot(req.db, req.shopId, terminalId),
      });
    } catch (err) {
      return res.status(400).json({ error: err.message || "Failed to open shift" });
    }
  },
);

router.post(
  "/shifts/movement",
  requireShopBody,
  loadShopAuth,
  requireScope("sessions"),
  (req, res) => {
    try {
      const terminalId = cleanText(req.body?.terminalId || req.shopAuth?.terminal?.terminalId || "primary", 120);
      const movementType = String(req.body?.type || "").trim();
      if (!["paid_in", "paid_out"].includes(movementType)) {
        return res.status(400).json({ error: "Movement type must be paid_in or paid_out" });
      }
      const shift = getOpenShift(req.db, req.shopId, terminalId);
      if (!shift) return res.status(409).json({ error: "Open register shift required" });
      const memberId = req.shopAuth?.member?.memberId;
      const amountCents = toCents(req.body?.amount);
      if (amountCents <= 0) return res.status(400).json({ error: "Amount must be greater than zero" });
      const requiresApproval = movementType === "paid_out" && amountCents >= 500000;
      const managerApproved = isManagerRole(req.shopAuth?.scope);
      if (requiresApproval && !managerApproved) {
        return res.status(403).json({ error: "Manager approval required for this cash paid out" });
      }
      const approvalStatus = requiresApproval ? "approved" : "not_required";
      const now = new Date().toISOString();
      req.db.transaction(() => {
        req.db
          .prepare(
            `INSERT INTO register_cash_movements (
               movement_id, shift_id, shop_id, terminal_id, member_id,
               movement_type, amount_cents, reason, notes,
               manager_approval_status, manager_approved_by_member_id, manager_approved_at, created_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            `cash_${crypto.randomUUID()}`,
            shift.shift_id,
            req.shopId,
            terminalId,
            memberId,
            movementType,
            amountCents,
            cleanText(req.body?.reason, 180),
            cleanText(req.body?.notes, 1000),
            approvalStatus,
            requiresApproval ? memberId : null,
            requiresApproval ? now : null,
            now,
          );
        req.db
          .prepare(
            `UPDATE member_shifts
                SET cash_paid_in_cents = cash_paid_in_cents + ?,
                    cash_paid_out_cents = cash_paid_out_cents + ?,
                    expected_cash_cents = expected_cash_cents + ?
              WHERE shift_id = ?`,
          )
          .run(
            movementType === "paid_in" ? amountCents : 0,
            movementType === "paid_out" ? amountCents : 0,
            movementType === "paid_in" ? amountCents : -amountCents,
            shift.shift_id,
          );
      })();
      return res.json({ ok: true, ...fetchShiftSnapshot(req.db, req.shopId, terminalId) });
    } catch (err) {
      return res.status(400).json({ error: err.message || "Failed to add cash movement" });
    }
  },
);

router.post(
  "/shifts/close",
  requireShopBody,
  loadShopAuth,
  requireScope("sessions"),
  (req, res) => {
    try {
      const terminalId = cleanText(req.body?.terminalId || req.shopAuth?.terminal?.terminalId || "primary", 120);
      const shift = getOpenShift(req.db, req.shopId, terminalId);
      if (!shift) return res.status(409).json({ error: "Open register shift required" });

      const memberId = req.shopAuth?.member?.memberId;
      const actualClosingCashCents = toCents(req.body?.actualClosingCash);
      const notes = cleanText(req.body?.closingNotes, 1500);
      const now = new Date().toISOString();
      const cash = calculateShiftCash(req.db, { ...shift, ended_at: now });
      const varianceCents = actualClosingCashCents - cash.expectedCashCents;
      const requiresApproval = Math.abs(varianceCents) > 0;
      const managerApproved = isManagerRole(req.shopAuth?.scope);
      if (requiresApproval && !managerApproved) {
        return res.status(403).json({ error: "Manager approval required to close a shift with variance" });
      }
      const report = {
        terminalId,
        openedAt: shift.started_at,
        closedAt: now,
        openedByMemberId: shift.opened_by_member_id || shift.member_id,
        closedByMemberId: memberId,
        openingFloat: fromCents(cash.openingFloatCents),
        cashSales: fromCents(cash.cashSalesCents),
        cashTransactions: cash.cashTransactions,
        cashPaidIn: fromCents(cash.paidInCents),
        cashPaidOut: fromCents(cash.paidOutCents),
        expectedCash: fromCents(cash.expectedCashCents),
        actualClosingCash: fromCents(actualClosingCashCents),
        variance: fromCents(varianceCents),
      };

      req.db
        .prepare(
          `UPDATE member_shifts
              SET status = 'closed',
                  ended_at = ?,
                  expected_cash_cents = ?,
                  actual_closing_cash_cents = ?,
                  variance_cents = ?,
                  closing_notes = ?,
                  manager_approval_status = ?,
                  manager_approved_by_member_id = ?,
                  manager_approved_at = ?,
                  closed_by_member_id = ?,
                  end_of_day_report_json = ?
            WHERE shift_id = ?`,
        )
        .run(
          now,
          cash.expectedCashCents,
          actualClosingCashCents,
          varianceCents,
          notes,
          requiresApproval ? "approved" : "not_required",
          requiresApproval ? memberId : null,
          requiresApproval ? now : null,
          memberId,
          JSON.stringify(report),
          shift.shift_id,
        );

      return res.json({ ok: true, report, ...fetchShiftSnapshot(req.db, req.shopId, terminalId) });
    } catch (err) {
      return res.status(400).json({ error: err.message || "Failed to close shift" });
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
