import { Router } from "express";
import multer from "multer";
import { requireClerkSession } from "../middleware/clerk-auth.js";
import {
  exportShopDatabase,
  getAdminStatus,
  getSupportMessages,
  listSupportConversations,
  recoverBackupToFile,
  runBackup,
  sendSupportMessage,
  testRestoreFile,
} from "../services/admin-ops-service.js";

const router = Router();
const upload = multer({ dest: process.env.ADMIN_UPLOAD_DIR || "uploads/admin", limits: { fileSize: 1024 * 1024 * 1024 } });

router.use(requireClerkSession);

function adminEmails() {
  return String(process.env.CEYPOS_ADMIN_EMAILS || process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isAdminEmail(email) {
  const allowed = adminEmails();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (allowed.length && allowed.includes(normalizedEmail)) return true;
  return !allowed.length && process.env.NODE_ENV !== "production";
}

function requireAdmin(req, res, next) {
  if (isAdminEmail(req.userEmail)) return next();
  return res.status(403).json({ error: "CeyPOS admin access required" });
}

router.get("/status", requireAdmin, (req, res) => {
  try {
    res.json({ ok: true, data: getAdminStatus() });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to load admin status" });
  }
});

router.post("/backups/run", requireAdmin, (req, res) => {
  try {
    res.json({ ok: true, results: runBackup({ shopId: req.body?.shopId || null, backupType: req.body?.backupType || "manual" }) });
  } catch (error) {
    res.status(500).json({ error: error.message || "Backup failed" });
  }
});

router.post("/backups/test-restore", requireAdmin, (req, res) => {
  try {
    if (!req.body?.filePath) return res.status(400).json({ error: "filePath is required" });
    res.json({ ok: true, result: testRestoreFile(req.body.filePath) });
  } catch (error) {
    res.status(500).json({ error: error.message || "Restore test failed" });
  }
});

router.post("/backups/recover", requireAdmin, (req, res) => {
  try {
    if (!req.body?.runId) return res.status(400).json({ error: "runId is required" });
    res.json({ ok: true, result: recoverBackupToFile({ runId: req.body.runId, targetShopId: req.body.targetShopId || null }) });
  } catch (error) {
    res.status(400).json({ error: error.message || "Recovery failed" });
  }
});

router.get("/shops/:shopId/export", requireAdmin, (req, res) => {
  try {
    const result = exportShopDatabase(req.params.shopId);
    res.download(result.filePath, result.fileName);
  } catch (error) {
    res.status(400).json({ error: error.message || "Export failed" });
  }
});

router.post("/backups/upload-test", requireAdmin, upload.single("backup"), (req, res) => {
  try {
    if (!req.file?.path) return res.status(400).json({ error: "backup file is required" });
    res.json({ ok: true, result: testRestoreFile(req.file.path) });
  } catch (error) {
    res.status(400).json({ error: error.message || "Uploaded restore test failed" });
  }
});

router.get("/support/conversations", requireAdmin, (req, res) => {
  res.json({ ok: true, conversations: listSupportConversations() });
});

router.get("/support/conversations/:conversationId", requireAdmin, (req, res) => {
  res.json({ ok: true, ...getSupportMessages(req.params.conversationId) });
});

router.post("/support/conversations/:conversationId/messages", requireAdmin, (req, res) => {
  try {
    res.json({
      ok: true,
      ...sendSupportMessage({
        conversationId: req.params.conversationId,
        userEmail: req.userEmail,
        senderType: "admin",
        message: req.body?.message,
      }),
    });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to send message" });
  }
});

router.post("/support/conversations", (req, res) => {
  try {
    if (req.body?.conversationId) {
      const payload = getSupportMessages(req.body.conversationId);
      if (!payload.conversation) return res.status(404).json({ error: "Conversation not found" });
      const ownerEmail = String(payload.conversation.user_email || "").trim().toLowerCase();
      const requesterEmail = String(req.userEmail || "").trim().toLowerCase();
      if (!ownerEmail || (!isAdminEmail(requesterEmail) && ownerEmail !== requesterEmail)) {
        return res.status(403).json({ error: "Conversation access denied" });
      }
    }
    res.json({
      ok: true,
      ...sendSupportMessage({
        conversationId: req.body?.conversationId || null,
        shopId: req.body?.shopId || null,
        userEmail: req.userEmail || req.body?.userEmail,
        userName: req.body?.userName || null,
        subject: req.body?.subject || "Support request",
        priority: req.body?.priority || "medium",
        senderType: "merchant",
        message: req.body?.message,
      }),
    });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to send message" });
  }
});

router.get("/support/conversations/:conversationId/merchant", (req, res) => {
  const payload = getSupportMessages(req.params.conversationId);
  if (!payload.conversation) return res.status(404).json({ error: "Conversation not found" });
  const ownerEmail = String(payload.conversation.user_email || "").trim().toLowerCase();
  const requesterEmail = String(req.userEmail || "").trim().toLowerCase();
  if (!ownerEmail || (!isAdminEmail(requesterEmail) && ownerEmail !== requesterEmail)) {
    return res.status(403).json({ error: "Conversation access denied" });
  }
  res.json({ ok: true, ...payload });
});

export default router;
