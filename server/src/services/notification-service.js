import { sendZeptoMailEmail, isZeptoMailConfigured } from "./zeptomail.js";
import { randomUUID } from "crypto";
import { openShopDatabase } from "../utils/shop-database.js";
import { publishChange } from "../realtime/change-bus.js";

function logNotification(event, detail = {}) {
  console.log(`[notify] ${event}`, detail);
}

export function createNotifications({ shopId, recipients, category, severity = "info", title, body, linkPath = null, sourceEntity = null, sourceAction = null, sourceChangeId = null, payload = null }) {
  const uniqueRecipients = Array.from(new Set((recipients || []).map((email) => String(email || "").trim().toLowerCase()).filter(Boolean)));
  if (!shopId || !uniqueRecipients.length || !title || !body) return [];
  const db = openShopDatabase(shopId);
  try {
    const preference = db.prepare(`SELECT in_app_notifications, sales_alerts, low_stock_alerts, system_updates FROM notification_preferences WHERE shop_id = ? AND lower(user_email) = lower(?)`);
    const duplicate = db.prepare(`SELECT 1 FROM notifications WHERE shop_id = ? AND lower(recipient_email) = lower(?) AND source_entity = ? AND source_action = ? AND source_change_id = ? AND read_at IS NULL LIMIT 1`);
    const insert = db.prepare(`INSERT INTO notifications (notification_id,shop_id,recipient_email,category,severity,title,body,link_path,source_entity,source_action,source_change_id,payload_json,created_at,delivered_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    const created = [];
    db.transaction(() => {
      for (const email of uniqueRecipients) {
        const pref = preference.get(shopId, email);
        if (pref?.in_app_notifications === 0) continue;
        if (category === "sales" && pref?.sales_alerts === 0) continue;
        if (category === "inventory" && pref?.low_stock_alerts === 0) continue;
        if (category === "system" && pref?.system_updates === 0) continue;
        if (sourceEntity && sourceAction && sourceChangeId && duplicate.get(shopId, email, sourceEntity, sourceAction, String(sourceChangeId))) continue;
        const notificationId = randomUUID();
        const createdAt = new Date().toISOString();
        insert.run(notificationId, shopId, email, category, severity, title, body, linkPath, sourceEntity, sourceAction, sourceChangeId, payload ? JSON.stringify(payload) : null, createdAt, createdAt);
        created.push({ notificationId, recipientEmail: email });
      }
    })();
    if (created.length) publishChange({ shopId, entity: "notifications", action: "created", payload: { count: created.length } });
    return created;
  } finally {
    db.close();
  }
}

export function getManagerNotificationRecipients(shopId) {
  const db = openShopDatabase(shopId);
  try {
    const owner = db.prepare(`SELECT owner_email FROM shop_meta WHERE shop_id = ?`).get(shopId)?.owner_email;
    const managers = db.prepare(`SELECT email FROM shop_members WHERE shop_id = ? AND status = 'active' AND role IN ('owner','manager')`).all(shopId).map((row) => row.email);
    return Array.from(new Set([owner, ...managers].map((email) => String(email || "").trim().toLowerCase()).filter(Boolean)));
  } finally {
    db.close();
  }
}

export function notifySaleCompleted({ shopId, transactionId, total, itemCount, servedBy }) {
  return createNotifications({
    shopId,
    recipients: getManagerNotificationRecipients(shopId),
    category: "sales",
    severity: "success",
    title: "Sale completed",
    body: `${servedBy || "A team member"} completed a sale for ${Number(total || 0).toFixed(2)} (${Number(itemCount || 0)} item${Number(itemCount || 0) === 1 ? "" : "s"}).`,
    linkPath: "/reports",
    sourceEntity: "transactions",
    sourceAction: "created",
    sourceChangeId: transactionId ? String(transactionId) : null,
    payload: { transactionId, total, itemCount },
  });
}

export function notifyLowStock({ shopId, rows }) {
  const recipients = getManagerNotificationRecipients(shopId);
  const created = [];
  for (const row of rows || []) {
    const stock = Number(row.stock || 0);
    const threshold = Math.max(
      0,
      Number(row.reorder_threshold ?? row.reorderThreshold ?? row.restock_suggestion ?? 0),
    );
    if (stock > threshold) continue;
    created.push(...createNotifications({
      shopId,
      recipients,
      category: "inventory",
      severity: stock <= 0 ? "critical" : "warning",
      title: stock <= 0 ? `${row.name} is out of stock` : `${row.name} is running low`,
      body: `${row.name} has ${stock} unit${stock === 1 ? "" : "s"} remaining.`,
      linkPath: "/inventory",
      sourceEntity: "inventory",
      sourceAction: "low-stock",
      sourceChangeId: row.inventory_code,
      payload: { inventoryCode: row.inventory_code, stock, threshold },
    }));
  }
  return created;
}

export async function notifyOwnerTerminalPairingPending({
  ownerEmail,
  ownerName,
  shopName,
  memberName,
  memberEmail,
}) {
  if (!ownerEmail) return { sent: false, reason: "no_owner_email" };

  const subject = `[CeyPoS] Register terminal approval needed — ${memberName || memberEmail}`;
  const htmlBody = `
    <p>Hello ${ownerName || "Shop Owner"},</p>
    <p><strong>${memberName || memberEmail}</strong> requested to connect a register terminal to <strong>${shopName || "your shop"}</strong>.</p>
    <p>Open the CeyPoS Sessions page on your primary terminal to approve or reject this request.</p>
    <p style="color:#666;font-size:12px;">This is an automated security notification from CeyPoS.</p>
  `.trim();
  const textBody = `${memberName || memberEmail} requested register terminal access for ${shopName || "your shop"}. Approve from Sessions on your primary terminal.`;

  if (!isZeptoMailConfigured()) {
    logNotification("pairing_pending_email_skipped", { ownerEmail, memberEmail });
    return { sent: false, reason: "email_not_configured" };
  }

  try {
    await sendZeptoMailEmail({
      to: ownerEmail,
      toName: ownerName || ownerEmail,
      subject,
      htmlBody,
      textBody,
    });
    return { sent: true };
  } catch (err) {
    logNotification("pairing_pending_email_failed", { error: err.message, ownerEmail });
    return { sent: false, reason: err.message };
  }
}

export async function notifyOwnerTerminalPaired({
  ownerEmail,
  ownerName,
  shopName,
  memberName,
  memberEmail,
  terminalLabel,
}) {
  if (!ownerEmail) return { sent: false, reason: "no_owner_email" };

  const subject = `[CeyPoS] Register terminal connected — ${terminalLabel || "Register"}`;
  const htmlBody = `
    <p>Hello ${ownerName || "Shop Owner"},</p>
    <p><strong>${memberName || memberEmail}</strong> was approved and connected to <strong>${terminalLabel || "a register terminal"}</strong> at ${shopName || "your shop"}.</p>
    <p>If this was not you, revoke the terminal immediately from Sessions.</p>
  `.trim();

  if (!isZeptoMailConfigured()) {
    logNotification("pairing_approved_email_skipped", { ownerEmail, memberEmail });
    return { sent: false, reason: "email_not_configured" };
  }

  try {
    await sendZeptoMailEmail({
      to: ownerEmail,
      toName: ownerName || ownerEmail,
      subject,
      htmlBody,
      textBody: `${memberName || memberEmail} connected to ${terminalLabel || "register terminal"}.`,
    });
    return { sent: true };
  } catch (err) {
    logNotification("pairing_approved_email_failed", { error: err.message, ownerEmail });
    return { sent: false, reason: err.message };
  }
}
