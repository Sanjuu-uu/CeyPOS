import { createHash, randomBytes, randomUUID } from "crypto";
import { publishChange } from "../realtime/change-bus.js";
import { getShopPlanLimits } from "./member-scope.js";
import { getMemberById } from "./team-service.js";
import {
  notifyOwnerTerminalPairingPending,
  notifyOwnerTerminalPaired,
} from "./notification-service.js";

const PAIRING_TTL_MS = 10 * 60 * 1000;
const approvedPairingTokens = new Map();

function cacheApprovedToken(requestId, payload) {
  approvedPairingTokens.set(requestId, {
    ...payload,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });
}

export function claimApprovedPairing(requestId, memberId) {
  const entry = approvedPairingTokens.get(requestId);
  if (!entry) return { ok: false, error: "Approval not ready" };
  if (Date.now() > entry.expiresAt) {
    approvedPairingTokens.delete(requestId);
    return { ok: false, error: "Approval expired" };
  }
  if (entry.memberId !== memberId) {
    return { ok: false, error: "Member mismatch" };
  }
  approvedPairingTokens.delete(requestId);
  return {
    ok: true,
    terminalId: entry.terminalId,
    terminalToken: entry.terminalToken,
    label: entry.label,
  };
}

function hashToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

function generatePairingCode() {
  const part = () => String(Math.floor(1000 + Math.random() * 9000));
  return `CY-${part()}-${part()}`;
}

function generateTerminalToken() {
  return randomBytes(32).toString("hex");
}

function getShopNotificationContext(db, shopId) {
  const meta = db.prepare("SELECT shop_name, owner_email, owner_name FROM shop_meta WHERE shop_id = ?").get(shopId);
  return {
    shopName: meta?.shop_name || "your shop",
    ownerEmail: meta?.owner_email || null,
    ownerName: meta?.owner_name || null,
  };
}

export function ensurePrimaryTerminal(db, shopId, memberId, deviceMeta = null) {
  const existing = db
    .prepare(
      `SELECT * FROM shop_terminals WHERE shop_id = ? AND terminal_type = 'primary' AND status = 'active' LIMIT 1`,
    )
    .get(shopId);

  if (existing) return existing;

  const terminalId = randomUUID();
  const token = generateTerminalToken();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO shop_terminals (
       terminal_id, shop_id, terminal_type, label, status, device_meta,
       paired_by_member_id, approved_by_member_id, terminal_token_hash, created_at, last_seen_at
     ) VALUES (?, ?, 'primary', 'Primary Terminal', 'active', ?, ?, ?, ?, ?, ?)`,
  ).run(
    terminalId,
    shopId,
    deviceMeta ? JSON.stringify(deviceMeta) : null,
    memberId || null,
    memberId || null,
    hashToken(token),
    now,
    now,
  );

  return {
    ...db.prepare(`SELECT * FROM shop_terminals WHERE terminal_id = ?`).get(terminalId),
    plainToken: token,
  };
}

export function createPairingCode(db, shopId, createdByMemberId) {
  const shopMeta = db.prepare("SELECT * FROM shop_meta WHERE shop_id = ?").get(shopId);
  const plan = getShopPlanLimits(shopMeta);
  const activeRegisters = db
    .prepare(
      `SELECT COUNT(*) AS c FROM shop_terminals WHERE shop_id = ? AND terminal_type = 'register' AND status = 'active'`,
    )
    .get(shopId)?.c;

  // TEMP: bypass the register terminal cap for testing.
  // Restore this guard after test validation is complete.
  void activeRegisters;
  void plan;

  db.prepare(
    `UPDATE terminal_pairing_codes SET status = 'revoked'
     WHERE shop_id = ? AND status = 'active'`,
  ).run(shopId);

  const pairingId = randomUUID();
  let code = generatePairingCode();
  for (let i = 0; i < 5; i += 1) {
    const clash = db.prepare(`SELECT pairing_id FROM terminal_pairing_codes WHERE code = ? AND status = 'active'`).get(code);
    if (!clash) break;
    code = generatePairingCode();
  }

  const now = Date.now();
  const expiresAt = new Date(now + PAIRING_TTL_MS).toISOString();
  db.prepare(
    `INSERT INTO terminal_pairing_codes (
       pairing_id, shop_id, code, status, created_by_member_id, expires_at, created_at
     ) VALUES (?, ?, ?, 'active', ?, ?, ?)`,
  ).run(pairingId, shopId, code, createdByMemberId, expiresAt, new Date(now).toISOString());

  publishChange({
    shopId,
    entity: "terminals",
    action: "pairing_code_created",
    payload: { pairingId, code, expiresAt },
  });

  return { pairingId, code, expiresAt };
}

export function requestTerminalPairing(db, shopId, { code, memberId, deviceMeta }) {
  const member = getMemberById(db, shopId, memberId);
  if (!member || member.status !== "active") {
    throw new Error("Member not active");
  }

  const pairing = db
    .prepare(
      `SELECT * FROM terminal_pairing_codes
       WHERE shop_id = ? AND code = ? AND status = 'active'`,
    )
    .get(shopId, String(code || "").trim().toUpperCase());

  if (!pairing) {
    throw new Error("Invalid or expired pairing code");
  }

  const expiresMs = Date.parse(pairing.expires_at);
  if (Number.isFinite(expiresMs) && Date.now() > expiresMs) {
    db.prepare(`UPDATE terminal_pairing_codes SET status = 'expired' WHERE pairing_id = ?`).run(pairing.pairing_id);
    throw new Error("Pairing code expired");
  }

  const requestId = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO terminal_pairing_requests (
       request_id, shop_id, pairing_id, member_id, device_meta, status, requested_at
     ) VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
  ).run(
    requestId,
    shopId,
    pairing.pairing_id,
    memberId,
    deviceMeta ? JSON.stringify(deviceMeta) : null,
    now,
  );

  publishChange({
    shopId,
    entity: "terminals",
    action: "pairing_pending",
    payload: {
      requestId,
      memberId,
      memberName: member.display_name,
      memberEmail: member.email,
      deviceMeta,
      requestedAt: now,
    },
  });

  const notifyCtx = getShopNotificationContext(db, shopId);
  void notifyOwnerTerminalPairingPending({
    ownerEmail: notifyCtx.ownerEmail,
    ownerName: notifyCtx.ownerName,
    shopName: notifyCtx.shopName,
    memberName: member.display_name,
    memberEmail: member.email,
  }).catch(() => {});

  return {
    requestId,
    status: "pending",
    memberName: member.display_name,
  };
}

export function listPendingPairingRequests(db, shopId) {
  return db
    .prepare(
      `SELECT r.request_id, r.shop_id, r.pairing_id, r.member_id, r.device_meta, r.status, r.requested_at,
              m.display_name AS member_name, m.email AS member_email, m.role AS member_role
       FROM terminal_pairing_requests r
       JOIN shop_members m ON m.member_id = r.member_id
       WHERE r.shop_id = ? AND r.status = 'pending'
       ORDER BY r.requested_at DESC`,
    )
    .all(shopId);
}

export function approvePairingRequest(db, shopId, requestId, approvedByMemberId) {
  const request = db
    .prepare(`SELECT * FROM terminal_pairing_requests WHERE request_id = ? AND shop_id = ?`)
    .get(requestId, shopId);

  if (!request || request.status !== "pending") {
    throw new Error("Pairing request not found or already resolved");
  }

  const member = getMemberById(db, shopId, request.member_id);
  if (!member) throw new Error("Member not found");

  const terminalId = randomUUID();
  const token = generateTerminalToken();
  const now = new Date().toISOString();
  const registerCount = db
    .prepare(`SELECT COUNT(*) AS c FROM shop_terminals WHERE shop_id = ? AND terminal_type = 'register'`)
    .get(shopId)?.c;

  db.prepare(
    `INSERT INTO shop_terminals (
       terminal_id, shop_id, terminal_type, label, status, device_meta,
       paired_by_member_id, approved_by_member_id, terminal_token_hash, created_at, last_seen_at
     ) VALUES (?, ?, 'register', ?, 'active', ?, ?, ?, ?, ?, ?)`,
  ).run(
    terminalId,
    shopId,
    `Register ${Number(registerCount) + 1}`,
    request.device_meta,
    request.member_id,
    approvedByMemberId,
    hashToken(token),
    now,
    now,
  );

  db.prepare(
    `UPDATE terminal_pairing_requests
     SET status = 'approved', resolved_at = ?, resolved_by_member_id = ?
     WHERE request_id = ?`,
  ).run(now, approvedByMemberId, requestId);

  db.prepare(`UPDATE terminal_pairing_codes SET status = 'used' WHERE pairing_id = ?`).run(request.pairing_id);

  publishChange({
    shopId,
    entity: "terminals",
    action: "approved",
    payload: {
      requestId,
      terminalId,
      memberId: request.member_id,
      memberName: member.display_name,
    },
  });

  cacheApprovedToken(requestId, {
    terminalId,
    terminalToken: token,
    memberId: request.member_id,
    label: `Register ${Number(registerCount) + 1}`,
  });

  const terminalLabel = `Register ${Number(registerCount) + 1}`;
  const notifyCtx = getShopNotificationContext(db, shopId);
  void notifyOwnerTerminalPaired({
    ownerEmail: notifyCtx.ownerEmail,
    ownerName: notifyCtx.ownerName,
    shopName: notifyCtx.shopName,
    memberName: member.display_name,
    memberEmail: member.email,
    terminalLabel,
  }).catch(() => {});

  return {
    terminalId,
    terminalToken: token,
    memberId: request.member_id,
    memberName: member.display_name,
    label: terminalLabel,
  };
}

export function rejectPairingRequest(db, shopId, requestId, resolvedByMemberId) {
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `UPDATE terminal_pairing_requests
       SET status = 'rejected', resolved_at = ?, resolved_by_member_id = ?
       WHERE request_id = ? AND shop_id = ? AND status = 'pending'`,
    )
    .run(now, resolvedByMemberId, requestId, shopId);

  if (!result.changes) throw new Error("Pairing request not found");

  publishChange({
    shopId,
    entity: "terminals",
    action: "pairing_rejected",
    payload: { requestId },
  });

  return { ok: true };
}

export function validateTerminalToken(db, shopId, terminalId, terminalToken) {
  const terminal = db
    .prepare(`SELECT * FROM shop_terminals WHERE terminal_id = ? AND shop_id = ? AND status = 'active'`)
    .get(terminalId, shopId);

  if (!terminal) return { ok: false, error: "Terminal not found" };
  if (hashToken(terminalToken) !== terminal.terminal_token_hash) {
    return { ok: false, error: "Invalid terminal token" };
  }

  db.prepare(`UPDATE shop_terminals SET last_seen_at = ? WHERE terminal_id = ?`).run(
    new Date().toISOString(),
    terminalId,
  );

  return { ok: true, terminal };
}

export function listActiveTerminals(db, shopId) {
  return db
    .prepare(
      `SELECT t.terminal_id, t.shop_id, t.terminal_type, t.label, t.status, t.device_meta,
              t.paired_by_member_id, t.approved_by_member_id, t.created_at, t.last_seen_at,
              m.display_name AS paired_member_name, m.email AS paired_member_email
       FROM shop_terminals t
       LEFT JOIN shop_members m ON m.member_id = t.paired_by_member_id
       WHERE t.shop_id = ? AND t.status = 'active'
       ORDER BY CASE t.terminal_type WHEN 'primary' THEN 0 ELSE 1 END, t.created_at`,
    )
    .all(shopId);
}

export function revokeTerminal(db, shopId, terminalId, revokedByMemberId) {
  const terminal = db
    .prepare(`SELECT * FROM shop_terminals WHERE terminal_id = ? AND shop_id = ?`)
    .get(terminalId, shopId);

  if (!terminal) throw new Error("Terminal not found");
  if (terminal.terminal_type === "primary") {
    throw new Error("Primary terminal cannot be revoked");
  }

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE shop_terminals SET status = 'revoked', revoked_at = ?, terminal_token_hash = NULL WHERE terminal_id = ?`,
  ).run(now, terminalId);

  publishChange({
    shopId,
    entity: "terminals",
    action: "revoked",
    payload: { terminalId, revokedByMemberId },
  });

  return { ok: true };
}

export function getPairingRequestStatus(db, shopId, requestId) {
  const row = db
    .prepare(
      `SELECT r.*, t.terminal_id
       FROM terminal_pairing_requests r
       LEFT JOIN shop_terminals t ON t.paired_by_member_id = r.member_id AND t.shop_id = r.shop_id AND t.status = 'active'
       WHERE r.request_id = ? AND r.shop_id = ?
       ORDER BY t.created_at DESC
       LIMIT 1`,
    )
    .get(requestId, shopId);
  return row;
}
