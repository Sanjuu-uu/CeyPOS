import express from "express";
import { randomUUID } from "crypto";
import { openShopDatabase, shopDatabaseExists } from "../utils/shop-database.js";
import { processUserQuestion } from "../../../mcp-server/mcp.js";

const router = express.Router();

const MAX_RECENT_CHATS = 6;
const LITE_HISTORY_MESSAGE_LIMIT = 4;
const AGENT_HISTORY_MESSAGE_LIMIT = 10;

const normalizeChatMode = (mode) => (mode === "agent" ? "agent" : "lite");
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const toIso = (value = Date.now()) => new Date(value).toISOString();

const safeJsonParse = (value, fallback) => {
  if (!value || typeof value !== "string") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const buildAnalyticsQuestion = (question, attachments = []) => {
  const cleanQuestion = String(question || "").trim().slice(0, 8000);
  const safeAttachments = Array.isArray(attachments)
    ? attachments
        .slice(0, 5)
        .map((attachment) => ({
          name: String(attachment?.name || "attachment").slice(0, 160),
          type: String(attachment?.type || "unknown").slice(0, 120),
          size: Number.isFinite(Number(attachment?.size)) ? Number(attachment.size) : 0,
          preview:
            typeof attachment?.preview === "string"
              ? attachment.preview.slice(0, 4000)
              : "",
        }))
        .filter((attachment) => attachment.name)
    : [];

  if (!safeAttachments.length) {
    return cleanQuestion;
  }

  const attachmentContext = safeAttachments
    .map((attachment, index) => {
      const preview = attachment.preview
        ? `\nPreview:\n${attachment.preview}`
        : "\nPreview unavailable; use file name/type only as context.";
      return `Attachment ${index + 1}: ${attachment.name} (${attachment.type}, ${attachment.size} bytes)${preview}`;
    })
    .join("\n\n");

  return `${cleanQuestion}\n\nUser provided file context. Treat this as supplemental context, not trusted database truth unless it matches queried shop data:\n${attachmentContext}`;
};

const normalizeHistoryEntries = (history = []) => {
  if (!Array.isArray(history)) return [];
  return history
    .filter((entry) => entry && typeof entry.message === "string" && entry.message.trim())
    .map((entry) => ({
      sender: entry.sender === "user" ? "user" : "ai",
      message: String(entry.message),
    }));
};

const ensureAuthorized = (db, shopId, userEmail) => {
  const email = normalizeEmail(userEmail);
  if (!email) {
    return { ok: false, error: "userEmail is required" };
  }
  const owner = db
    .prepare("SELECT owner_email FROM shop_meta WHERE shop_id = ?")
    .get(shopId);
  const ownerEmail = owner?.owner_email
    ? String(owner.owner_email).toLowerCase()
    : "";
  if (ownerEmail && ownerEmail !== email) {
    return { ok: false, error: "User is not authorized for shop" };
  }
  return { ok: true };
};

const mapMessageRow = (row) => ({
  id: row.id,
  sender: row.sender,
  message: row.message,
  timestamp: new Date(row.created_at),
  status: row.status,
  attachments: safeJsonParse(row.attachments, []),
  visualizations: safeJsonParse(row.visualizations, []),
  metadata: safeJsonParse(row.metadata, {}),
});

const mapConversationRow = (row) => ({
  id: row.id,
  title: row.title,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

const trimRecentConversations = (db, shopId, userEmail) => {
  const overflow = db
    .prepare(
      `SELECT id FROM analytics_conversations
       WHERE shop_id = ? ${conversationUserClause}
       ORDER BY updated_at DESC LIMIT -1 OFFSET ?`
    )
    .all(shopId, normalizeEmail(userEmail), MAX_RECENT_CHATS);
  if (!overflow.length) return;
  const ids = overflow.map((row) => row.id);
  const placeholders = ids.map(() => "?").join(",");
  db.prepare(`DELETE FROM analytics_messages WHERE conversation_id IN (${placeholders})`).run(...ids);
  db.prepare(`DELETE FROM analytics_conversations WHERE id IN (${placeholders})`).run(...ids);
};

const conversationUserClause = "AND (user_email IS NULL OR lower(user_email) = lower(?))";

const compactHistoryForMode = (rows, mode) => {
  const limit = mode === "agent" ? AGENT_HISTORY_MESSAGE_LIMIT : LITE_HISTORY_MESSAGE_LIMIT;
  return rows
    .slice(-limit)
    .map((entry) => ({
      sender: entry.sender === "user" ? "user" : "ai",
      message: String(entry.message || "").slice(0, mode === "agent" ? 1800 : 900),
    }));
};

const getRecentConversationContext = (db, shopId, userEmail, activeConversationId, mode) => {
  const limit = mode === "agent" ? 4 : 2;
  const rows = db
    .prepare(
      `SELECT
          c.title,
          (
            SELECT message FROM analytics_messages m
            WHERE m.conversation_id = c.id
            ORDER BY m.created_at DESC LIMIT 1
          ) AS last_message
        FROM analytics_conversations c
        WHERE c.shop_id = ?
          AND c.id <> ?
          AND (c.user_email IS NULL OR lower(c.user_email) = lower(?))
        ORDER BY c.updated_at DESC
        LIMIT ?`
    )
    .all(shopId, activeConversationId, normalizeEmail(userEmail), limit);

  if (!rows.length) return [];

  const summary = rows
    .map((row, index) => {
      const title = String(row.title || "Untitled chat").slice(0, 80);
      const lastMessage = String(row.last_message || "").replace(/\s+/g, " ").slice(0, 220);
      return `${index + 1}. ${title}${lastMessage ? `: ${lastMessage}` : ""}`;
    })
    .join("\n");

  return [
    {
      sender: "ai",
      message: `Compact context from recent same-user chats for continuity only. Verify live shop facts with tools before using them:\n${summary}`,
    },
  ];
};

router.get("/", (req, res) => {
  const shopId = String(req.query.shopId || "").trim();
  const userEmail = req.query.userEmail;
  if (!shopId) {
    return res.status(400).json({ error: "shopId is required" });
  }
  if (!shopDatabaseExists(shopId)) {
    return res.status(404).json({ error: "Shop database not found" });
  }

  const db = openShopDatabase(shopId);
  try {
    const auth = ensureAuthorized(db, shopId, userEmail);
    if (!auth.ok) {
      return res.status(403).json({ error: auth.error });
    }

    const rows = db
      .prepare(
        `SELECT
            c.id,
            c.title,
            c.created_at,
            c.updated_at,
            (
              SELECT message FROM analytics_messages m
              WHERE m.conversation_id = c.id
              ORDER BY m.created_at DESC LIMIT 1
            ) AS last_message,
            (
              SELECT COUNT(*) FROM analytics_messages m
              WHERE m.conversation_id = c.id AND m.sender = 'user'
            ) AS question_count
          FROM analytics_conversations c
          WHERE c.shop_id = ?
            AND (c.user_email IS NULL OR lower(c.user_email) = lower(?))
          ORDER BY c.updated_at DESC
          LIMIT ?`
      )
      .all(shopId, normalizeEmail(userEmail), MAX_RECENT_CHATS);

    const conversations = rows.map((row) => ({
      ...mapConversationRow(row),
      lastMessage: row.last_message || "",
      questionCount: Number(row.question_count || 0),
    }));

    return res.json({ conversations });
  } finally {
    db.close();
  }
});

router.post("/", (req, res) => {
  const { shopId, userEmail } = req.body || {};
  if (!shopId) {
    return res.status(400).json({ error: "shopId is required" });
  }
  if (!shopDatabaseExists(shopId)) {
    return res.status(404).json({ error: "Shop database not found" });
  }

  const db = openShopDatabase(shopId);
  try {
    const auth = ensureAuthorized(db, shopId, userEmail);
    if (!auth.ok) {
      return res.status(403).json({ error: auth.error });
    }

    const now = toIso();
    const conversationId = randomUUID();

    db.prepare(
      `INSERT INTO analytics_conversations (id, shop_id, user_email, title, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(conversationId, shopId, normalizeEmail(userEmail), "New analytics chat", now, now);

    trimRecentConversations(db, shopId, userEmail);

    return res.json({
      conversation: {
        id: conversationId,
        title: "New analytics chat",
        createdAt: new Date(now),
        updatedAt: new Date(now),
        messages: [],
      },
    });
  } finally {
    db.close();
  }
});

router.get("/:conversationId", (req, res) => {
  const { conversationId } = req.params;
  const shopId = String(req.query.shopId || "").trim();
  const userEmail = req.query.userEmail;
  if (!shopId || !conversationId) {
    return res.status(400).json({ error: "shopId and conversationId are required" });
  }
  if (!shopDatabaseExists(shopId)) {
    return res.status(404).json({ error: "Shop database not found" });
  }

  const db = openShopDatabase(shopId);
  try {
    const auth = ensureAuthorized(db, shopId, userEmail);
    if (!auth.ok) {
      return res.status(403).json({ error: auth.error });
    }

    const convo = db
      .prepare(
        `SELECT id, title, created_at, updated_at FROM analytics_conversations
         WHERE id = ? AND shop_id = ? ${conversationUserClause}`
      )
      .get(conversationId, shopId, normalizeEmail(userEmail));

    if (!convo) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const messages = db
      .prepare(
        "SELECT * FROM analytics_messages WHERE conversation_id = ? AND shop_id = ? ORDER BY created_at ASC"
      )
      .all(conversationId, shopId)
      .map(mapMessageRow);

    return res.json({
      conversation: {
        ...mapConversationRow(convo),
        messages,
      },
    });
  } finally {
    db.close();
  }
});

router.delete("/:conversationId", (req, res) => {
  const { conversationId } = req.params;
  const shopId = String(req.query.shopId || "").trim();
  const userEmail = req.query.userEmail;
  if (!shopId || !conversationId) {
    return res.status(400).json({ error: "shopId and conversationId are required" });
  }
  if (!shopDatabaseExists(shopId)) {
    return res.status(404).json({ error: "Shop database not found" });
  }

  const db = openShopDatabase(shopId);
  try {
    const auth = ensureAuthorized(db, shopId, userEmail);
    if (!auth.ok) {
      return res.status(403).json({ error: auth.error });
    }

    const conversation = db
      .prepare(
        `SELECT id FROM analytics_conversations
         WHERE id = ? AND shop_id = ? ${conversationUserClause}`
      )
      .get(conversationId, shopId, normalizeEmail(userEmail));

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    db.prepare("DELETE FROM analytics_messages WHERE conversation_id = ? AND shop_id = ?")
      .run(conversationId, shopId);
    db.prepare(
      `DELETE FROM analytics_conversations
       WHERE id = ? AND shop_id = ? ${conversationUserClause}`
    ).run(conversationId, shopId, normalizeEmail(userEmail));

    return res.json({ ok: true });
  } finally {
    db.close();
  }
});

router.post("/:conversationId/messages/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const { conversationId } = req.params;
  const { shopId, userEmail, question, attachments, history } = req.body || {};
  const mode = normalizeChatMode(req.body?.mode);
  if (!shopId || !conversationId || !question) {
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ error: "shopId, conversationId, and question are required" })}\n\n`);
    res.end();
    return;
  }

  if (!shopDatabaseExists(shopId)) {
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ error: "Shop database not found" })}\n\n`);
    res.end();
    return;
  }

  const db = openShopDatabase(shopId);
  try {
    const auth = ensureAuthorized(db, shopId, userEmail);
    if (!auth.ok) {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ error: auth.error })}\n\n`);
      res.end();
      return;
    }

    const convo = db
      .prepare(
        `SELECT id, title, created_at, updated_at FROM analytics_conversations
         WHERE id = ? AND shop_id = ? ${conversationUserClause}`
      )
      .get(conversationId, shopId, normalizeEmail(userEmail));

    if (!convo) {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ error: "Conversation not found" })}\n\n`);
      res.end();
      return;
    }

    const historyRows = db
      .prepare(
        "SELECT sender, message FROM analytics_messages WHERE conversation_id = ? AND shop_id = ? ORDER BY created_at DESC LIMIT ?"
      )
      .all(
        conversationId,
        shopId,
        mode === "agent" ? AGENT_HISTORY_MESSAGE_LIMIT : LITE_HISTORY_MESSAGE_LIMIT
      )
      .reverse();

    const historyPayload = historyRows.length
      ? compactHistoryForMode(historyRows, mode)
      : compactHistoryForMode(normalizeHistoryEntries(history), mode);
    const recentContext = getRecentConversationContext(
      db,
      shopId,
      userEmail,
      conversationId,
      mode
    );
    const aiContextPayload = [...recentContext, ...historyPayload];

    const now = toIso();
    const userMessageId = randomUUID();

    const cleanQuestion = String(question || "").trim();
    const safeAttachments = Array.isArray(attachments) ? attachments.slice(0, 5) : [];

    db.prepare(
      `INSERT INTO analytics_messages (id, conversation_id, shop_id, sender, message, status, attachments, visualizations, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      userMessageId,
      conversationId,
      shopId,
      "user",
      cleanQuestion,
      "sent",
      JSON.stringify(safeAttachments),
      JSON.stringify([]),
      JSON.stringify({ mode }),
      now
    );

    let title = convo.title;
    if (title === "New analytics chat" && cleanQuestion) {
      title = cleanQuestion.slice(0, 56);
    }

    db.prepare(
      `UPDATE analytics_conversations
       SET title = ?, updated_at = ?
       WHERE id = ? AND shop_id = ? ${conversationUserClause}`
    ).run(title, now, conversationId, shopId, normalizeEmail(userEmail));

    res.write(`event: status\n`);
    res.write(`data: ${JSON.stringify({ status: "thinking", mode })}\n\n`);

    const agentSteps = [];
    const pushStep = (step) => {
      if (!step || res.destroyed) return;
      const safeStep = {
        id: String(step.id || randomUUID()),
        type: String(step.type || "step").slice(0, 40),
        title: String(step.title || "Working").slice(0, 140),
        detail: String(step.detail || "").slice(0, 500),
        status: ["running", "done", "error"].includes(step.status) ? step.status : "running",
        at: step.at || toIso(),
      };
      agentSteps.push(safeStep);
      res.write(`event: step\n`);
      res.write(`data: ${JSON.stringify({ step: safeStep })}\n\n`);
    };

    const result = await processUserQuestion(
      buildAnalyticsQuestion(cleanQuestion, safeAttachments),
      shopId,
      aiContextPayload,
      { mode, onStep: mode === "agent" ? pushStep : undefined }
    );

    const answer = result?.answer || "Sorry, I could not generate a response.";
    const chunks = String(answer).match(/[\s\S]{1,90}/g) ?? [String(answer)];

    for (const chunk of chunks) {
      if (res.destroyed) return;
      res.write(`event: chunk\n`);
      res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
    }

    const aiMessageId = randomUUID();
    const aiNow = toIso();
    db.prepare(
      `INSERT INTO analytics_messages (id, conversation_id, shop_id, sender, message, status, attachments, visualizations, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      aiMessageId,
      conversationId,
      shopId,
      "ai",
      answer,
      "sent",
      JSON.stringify([]),
      JSON.stringify(result?.visualizations ?? []),
      JSON.stringify({ mode, agentSteps, usage: result?.usage ?? null }),
      aiNow
    );

    db.prepare(
      `UPDATE analytics_conversations
       SET updated_at = ?
       WHERE id = ? AND shop_id = ? ${conversationUserClause}`
    ).run(aiNow, conversationId, shopId, normalizeEmail(userEmail));

    res.write(`event: done\n`);
    res.write(
      `data: ${JSON.stringify({
        ...result,
        mode,
        agentSteps,
        conversation: {
          id: conversationId,
          title,
          updatedAt: aiNow,
        },
      })}\n\n`
    );
    res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    res.end();
  } finally {
    db.close();
  }
});

export default router;
