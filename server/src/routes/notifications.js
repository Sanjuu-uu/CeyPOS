import express from "express";
import { requireClerkSession } from "../middleware/clerk-auth.js";
import { requireShopBody, loadShopAuth } from "../middleware/shop-auth.js";
import { publishChange } from "../realtime/change-bus.js";

const router = express.Router();
const auth = [requireClerkSession, requireShopBody, loadShopAuth];
const bool = (value, fallback) => value === undefined ? fallback : Boolean(value);
const mapPreference = (row = {}) => ({
  emailNotifications: Boolean(row.email_notifications ?? 1),
  inAppNotifications: Boolean(row.in_app_notifications ?? 1),
  lowStockAlerts: Boolean(row.low_stock_alerts ?? 1),
  dailyReports: Boolean(row.daily_reports ?? 0),
  salesAlerts: Boolean(row.sales_alerts ?? 1),
  systemUpdates: Boolean(row.system_updates ?? 1),
  quietHoursStart: row.quiet_hours_start || null,
  quietHoursEnd: row.quiet_hours_end || null,
});
const mapNotification = (row) => ({
  notificationId: row.notification_id,
  shopId: row.shop_id,
  recipientEmail: row.recipient_email,
  category: row.category,
  severity: row.severity,
  title: row.title,
  body: row.body,
  linkPath: row.link_path,
  sourceEntity: row.source_entity,
  sourceAction: row.source_action,
  sourceChangeId: row.source_change_id,
  payload: row.payload_json ? JSON.parse(row.payload_json) : null,
  createdAt: row.created_at,
  readAt: row.read_at,
  deliveredAt: row.delivered_at,
});

router.get("/", ...auth, (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
  const rows = req.db.prepare(`SELECT * FROM notifications WHERE shop_id = ? AND lower(recipient_email) = lower(?) ORDER BY created_at DESC LIMIT ?`).all(req.shopId, req.userEmail, limit);
  const unreadCount = req.db.prepare(`SELECT count(*) count FROM notifications WHERE shop_id = ? AND lower(recipient_email) = lower(?) AND read_at IS NULL`).get(req.shopId, req.userEmail).count;
  res.json({ ok: true, notifications: rows.map(mapNotification), unreadCount });
});

router.get("/preferences", ...auth, (req, res) => {
  const row = req.db.prepare(`SELECT * FROM notification_preferences WHERE shop_id = ? AND lower(user_email) = lower(?)`).get(req.shopId, req.userEmail);
  res.json({ ok: true, preferences: mapPreference(row) });
});

router.put("/preferences", ...auth, (req, res) => {
  const current = mapPreference(req.db.prepare(`SELECT * FROM notification_preferences WHERE shop_id = ? AND lower(user_email) = lower(?)`).get(req.shopId, req.userEmail));
  const next = { ...current, ...req.body };
  const cleanTime = (value) => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : null;
  req.db.prepare(`INSERT INTO notification_preferences (shop_id,user_email,email_notifications,in_app_notifications,low_stock_alerts,daily_reports,sales_alerts,system_updates,quiet_hours_start,quiet_hours_end,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(shop_id,user_email) DO UPDATE SET email_notifications=excluded.email_notifications,in_app_notifications=excluded.in_app_notifications,low_stock_alerts=excluded.low_stock_alerts,daily_reports=excluded.daily_reports,sales_alerts=excluded.sales_alerts,system_updates=excluded.system_updates,quiet_hours_start=excluded.quiet_hours_start,quiet_hours_end=excluded.quiet_hours_end,updated_at=excluded.updated_at`).run(req.shopId, req.userEmail, Number(bool(next.emailNotifications,true)), Number(bool(next.inAppNotifications,true)), Number(bool(next.lowStockAlerts,true)), Number(bool(next.dailyReports,false)), Number(bool(next.salesAlerts,true)), Number(bool(next.systemUpdates,true)), cleanTime(next.quietHoursStart), cleanTime(next.quietHoursEnd), new Date().toISOString());
  res.json({ ok: true, preferences: mapPreference(req.db.prepare(`SELECT * FROM notification_preferences WHERE shop_id = ? AND user_email = ?`).get(req.shopId, req.userEmail)) });
});

router.post("/read-all", ...auth, (req, res) => {
  const readAt = new Date().toISOString();
  const result = req.db.prepare(`UPDATE notifications SET read_at = ? WHERE shop_id = ? AND lower(recipient_email) = lower(?) AND read_at IS NULL`).run(readAt, req.shopId, req.userEmail);
  publishChange({ shopId: req.shopId, entity: "notifications", action: "read-all", payload: {} });
  res.json({ ok: true, updated: result.changes, readAt });
});

router.post("/:id/read", ...auth, (req, res) => {
  const readAt = new Date().toISOString();
  const result = req.db.prepare(`UPDATE notifications SET read_at = COALESCE(read_at, ?) WHERE notification_id = ? AND shop_id = ? AND lower(recipient_email) = lower(?)`).run(readAt, req.params.id, req.shopId, req.userEmail);
  if (!result.changes) return res.status(404).json({ error: "Notification not found" });
  publishChange({ shopId: req.shopId, entity: "notifications", action: "read", payload: {} });
  res.json({ ok: true, readAt });
});

export default router;
