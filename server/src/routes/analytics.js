import { Router } from "express";
import { processUserQuestion } from "../../../mcp-server/mcp.js";

const router = Router();

function buildAnalyticsQuestion(question, attachments = []) {
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
}

function normalizeChatMode(mode) {
  return mode === "agent" ? "agent" : "lite";
}

function getVisualizationConfig() {
  const visServerRaw = (process.env.VIS_REQUEST_SERVER ?? "").trim();
  const visServer = visServerRaw.endsWith("/") ? visServerRaw.slice(0, -1) : visServerRaw;
  const visServiceId = (process.env.VIS_SERVICE_ID ?? "").trim();
  const visServicePath = (process.env.VIS_SERVICE_PATH ?? "/v1/services/{serviceId}/invoke").trim();
  const requiresServiceId = visServicePath.includes("{serviceId}");
  const visualizationConfigured = Boolean(visServer && (!requiresServiceId || visServiceId));
  return {
    provider: "antv",
    configured: visualizationConfigured,
    baseUrl: visualizationConfigured ? visServer : null,
    serviceId: visualizationConfigured && visServiceId ? visServiceId : null,
  };
}

function writeSse(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

router.post("/chat", async (req, res) => {
  try {
    const { question, shopId, attachments, history } = req.body;
    const mode = normalizeChatMode(req.body?.mode);
    if (!question || !shopId) {
      return res.status(400).json({ error: "Missing question or shopId" });
    }
    const result = await processUserQuestion(
      buildAnalyticsQuestion(question, attachments),
      shopId,
      Array.isArray(history) ? history : [],
      { mode },
    );
    res.json({
      ...result,
      visualizationConfig: getVisualizationConfig(),
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/chat/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  try {
    const { question, shopId, attachments, history } = req.body;
    const mode = normalizeChatMode(req.body?.mode);
    if (!question || !shopId) {
      writeSse(res, "error", { error: "Missing question or shopId" });
      res.end();
      return;
    }

    writeSse(res, "status", { status: "thinking" });
    const result = await processUserQuestion(
      buildAnalyticsQuestion(question, attachments),
      shopId,
      Array.isArray(history) ? history : [],
      { mode },
    );
    const answer = result?.answer || "Sorry, I could not generate a response.";
    const chunks = String(answer).match(/[\s\S]{1,90}/g) ?? [String(answer)];

    for (const chunk of chunks) {
      if (res.destroyed) return;
      writeSse(res, "chunk", { delta: chunk });
    }

    writeSse(res, "done", {
      ...result,
      visualizationConfig: getVisualizationConfig(),
    });
    res.end();
  } catch (error) {
    console.error("Streaming chat error:", error);
    writeSse(res, "error", { error: "Internal server error" });
    res.end();
  }
});

export default router;
