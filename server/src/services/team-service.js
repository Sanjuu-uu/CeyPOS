import { randomUUID } from "crypto";
import { buildMemberScope, getShopPlanLimits } from "./member-scope.js";

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function getMemberByEmail(db, shopId, email) {
  return db
    .prepare(
      `SELECT * FROM shop_members WHERE shop_id = ? AND lower(email) = lower(?) LIMIT 1`,
    )
    .get(shopId, email);
}

export function getMemberById(db, shopId, memberId) {
  return db
    .prepare(`SELECT * FROM shop_members WHERE shop_id = ? AND member_id = ? LIMIT 1`)
    .get(shopId, memberId);
}

export function listMembers(db, shopId) {
  return db
    .prepare(
      `SELECT member_id, shop_id, clerk_user_id, email, display_name, role, status,
              pro_team_seat, invited_by_email, created_at, updated_at, last_login_at
       FROM shop_members
       WHERE shop_id = ?
       ORDER BY
         CASE role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1 ELSE 2 END,
         display_name`,
    )
    .all(shopId);
}

export function ensureOwnerMember(db, shopId, shopMeta = {}) {
  const ownerEmail = normalizeEmail(shopMeta.owner_email);
  if (!ownerEmail) return null;

  const existing = getMemberByEmail(db, shopId, ownerEmail);
  const now = new Date().toISOString();
  if (existing) {
    if (existing.role !== "owner" || existing.status !== "active") {
      db.prepare(
        `UPDATE shop_members SET role = 'owner', status = 'active', display_name = COALESCE(?, display_name), updated_at = ?
         WHERE member_id = ?`,
      ).run(shopMeta.owner_name || existing.display_name, now, existing.member_id);
    }
    return getMemberById(db, shopId, existing.member_id);
  }

  const memberId = randomUUID();
  db.prepare(
    `INSERT INTO shop_members (
       member_id, shop_id, email, display_name, role, status, pro_team_seat, created_at, updated_at
     ) VALUES (?, ?, ?, ?, 'owner', 'active', 1, ?, ?)`,
  ).run(
    memberId,
    shopId,
    ownerEmail,
    shopMeta.owner_name || ownerEmail.split("@")[0],
    now,
    now,
  );
  return getMemberById(db, shopId, memberId);
}

export function registerTeamMember(db, shopId, { email, displayName, clerkUserId, invitedByEmail }) {
  const normalized = normalizeEmail(email);
  if (!normalized || !displayName) {
    throw new Error("email and displayName are required");
  }

  const existing = getMemberByEmail(db, shopId, normalized);
  const now = new Date().toISOString();
  if (existing) {
    if (existing.status === "suspended") {
      throw new Error("Member account is suspended");
    }
    db.prepare(
      `UPDATE shop_members
       SET display_name = ?, clerk_user_id = COALESCE(?, clerk_user_id), status = 'active', updated_at = ?, last_login_at = ?
       WHERE member_id = ?`,
    ).run(displayName, clerkUserId || null, now, now, existing.member_id);
    return getMemberById(db, shopId, existing.member_id);
  }

  const shopMeta = db.prepare("SELECT * FROM shop_meta WHERE shop_id = ?").get(shopId);
  const plan = getShopPlanLimits(shopMeta);
  const count = db
    .prepare(`SELECT COUNT(*) AS c FROM shop_members WHERE shop_id = ? AND status != 'suspended'`)
    .get(shopId)?.c;
  // TEMP: bypass team member limit for onboarding/testing.
  void count;
  void plan;

  const memberId = randomUUID();
  db.prepare(
    `INSERT INTO shop_members (
       member_id, shop_id, clerk_user_id, email, display_name, role, status,
       pro_team_seat, invited_by_email, created_at, updated_at, last_login_at
     ) VALUES (?, ?, ?, ?, ?, 'cashier', 'active', 0, ?, ?, ?, ?)`,
  ).run(
    memberId,
    shopId,
    clerkUserId || null,
    normalized,
    displayName,
    invitedByEmail || null,
    now,
    now,
    now,
  );
  return getMemberById(db, shopId, memberId);
}

export function removeTeamMemberByEmail(db, shopId, email) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    throw new Error("email is required");
  }

  const member = getMemberByEmail(db, shopId, normalized);
  if (!member) {
    return { removed: false };
  }
  if (member.role === "owner") {
    throw new Error("Cannot remove shop owner");
  }

  db.prepare(`DELETE FROM shop_members WHERE shop_id = ? AND member_id = ?`).run(
    shopId,
    member.member_id,
  );
  return { removed: true, memberId: member.member_id };
}

export function resolveShopContext(db, shopId, email, terminalId = null) {
  const shopMeta = db.prepare("SELECT * FROM shop_meta WHERE shop_id = ?").get(shopId);
  if (!shopMeta) {
    throw new Error("Shop not found");
  }

  const normalizedEmail = normalizeEmail(email);
  let member = getMemberByEmail(db, shopId, normalizedEmail);

  if (!member && normalizedEmail === normalizeEmail(shopMeta.owner_email)) {
    member = ensureOwnerMember(db, shopId, shopMeta);
  }

  if (!member || member.status === "suspended") {
    throw new Error("Member not authorized for this shop");
  }

  let terminal = null;
  if (terminalId) {
    terminal = db
      .prepare(`SELECT * FROM shop_terminals WHERE terminal_id = ? AND shop_id = ? AND status = 'active'`)
      .get(terminalId, shopId);
  } else if (member.role === "owner") {
    terminal = db
      .prepare(
        `SELECT * FROM shop_terminals WHERE shop_id = ? AND terminal_type = 'primary' AND status = 'active' ORDER BY created_at LIMIT 1`,
      )
      .get(shopId);
  }

  const plan = getShopPlanLimits(shopMeta);
  const scope = buildMemberScope(member, terminal, plan);

  return {
    shopId,
    shopName: shopMeta.shop_name,
    member: {
      memberId: member.member_id,
      email: member.email,
      displayName: member.display_name,
      role: member.role,
      status: member.status,
      proTeamSeat: Boolean(Number(member.pro_team_seat || 0)),
    },
    terminal: terminal
      ? {
          terminalId: terminal.terminal_id,
          terminalType: terminal.terminal_type,
          label: terminal.label,
          status: terminal.status,
          lastSeenAt: terminal.last_seen_at,
        }
      : null,
    plan,
    scope,
  };
}

export function updateMember(db, shopId, memberId, patch, actorMember) {
  const member = getMemberById(db, shopId, memberId);
  if (!member) throw new Error("Member not found");
  if (member.role === "owner" && actorMember?.role !== "owner") {
    throw new Error("Cannot modify owner account");
  }

  const role = patch.role ? String(patch.role).toLowerCase() : member.role;
  if (!["manager", "cashier"].includes(role) && member.role !== "owner") {
    throw new Error("Invalid role");
  }
  if (member.role === "owner") {
    // owner role immutable
  }

  const proTeamSeat =
    patch.proTeamSeat !== undefined ? (patch.proTeamSeat ? 1 : 0) : Number(member.pro_team_seat || 0);

  if (member.role !== "owner" && proTeamSeat === 1 && !Number(member.pro_team_seat)) {
    const shopMeta = db.prepare("SELECT pro_team_seats FROM shop_meta WHERE shop_id = ?").get(shopId);
    const limit = Number(shopMeta?.pro_team_seats || 0);
    const used = db
      .prepare(
        `SELECT COUNT(*) AS c FROM shop_members
         WHERE shop_id = ? AND pro_team_seat = 1 AND status != 'suspended'`,
      )
      .get(shopId)?.c;
    if (Number(used) >= limit) {
      throw new Error("Pro Team seat limit reached for this shop");
    }
  }

  const status = patch.status ? String(patch.status) : member.status;
  const displayName = patch.displayName || member.display_name;
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE shop_members
     SET role = ?, status = ?, display_name = ?, pro_team_seat = ?, updated_at = ?
     WHERE member_id = ? AND shop_id = ?`,
  ).run(
    member.role === "owner" ? "owner" : role,
    status,
    displayName,
    member.role === "owner" ? 1 : proTeamSeat,
    now,
    memberId,
    shopId,
  );
  return getMemberById(db, shopId, memberId);
}
