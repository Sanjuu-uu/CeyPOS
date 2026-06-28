// WebSocket server for real-time two-way sync per shop
import { Server } from "socket.io";
import { openShopDatabase, shopDatabaseExists } from "./utils/shop-database.js";
import { getInventory, upsertProducts } from "./services/inventory-service.js";
import { getShopSnapshot } from "./services/shop-snapshot.js";
import { bus as changeBus, publishChange } from "./realtime/change-bus.js";
import { validateTerminalToken } from "./services/terminal-service.js";

let ioInstance;

const changeLatencySamples = [];
const CHANGE_LATENCY_SAMPLE_LIMIT = 200;

function recordChangeLatency(event) {
  const publishedAt = Date.parse(event?.timestamp || "");
  if (!Number.isFinite(publishedAt)) return;

  const latencyMs = Date.now() - publishedAt;
  if (!Number.isFinite(latencyMs) || latencyMs < 0) return;

  changeLatencySamples.push(latencyMs);
  if (changeLatencySamples.length > CHANGE_LATENCY_SAMPLE_LIMIT) {
    changeLatencySamples.shift();
  }

  if (changeLatencySamples.length >= 20 && changeLatencySamples.length % 20 === 0) {
    const sorted = [...changeLatencySamples].sort((a, b) => a - b);
    const percentile = (value) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * value))];
    const average = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
    console.info(
      "[change-bus] latency",
      JSON.stringify({
        samples: sorted.length,
        avgMs: Number(average.toFixed(2)),
        p50Ms: percentile(0.5),
        p95Ms: percentile(0.95),
      }),
    );
  }
}

const validateMobileSocketSession = (shopId, sessionId, token, sessionType) => {
  if (!sessionId && !token) {
    return { ok: true, isMobileSession: false };
  }

  if (!sessionId || !token) {
    return { ok: false, error: "sessionId and token are required" };
  }

  const db = openShopDatabase(shopId);
  try {
    const session = db
      .prepare(
        `SELECT session_id, session_type, status, auth_token, expires_at
         FROM mobile_sessions
         WHERE session_id = ? AND shop_id = ?`
      )
      .get(sessionId, shopId);

    if (!session) {
      return { ok: false, error: "Mobile session not found" };
    }

    if (String(session.auth_token) !== String(token)) {
      return { ok: false, error: "Invalid mobile session token" };
    }

    if (sessionType && String(session.session_type) !== String(sessionType)) {
      return { ok: false, error: "Mobile session type mismatch" };
    }

    const expiresAtMs = Date.parse(session.expires_at);
    if (Number.isFinite(expiresAtMs) && Date.now() > expiresAtMs) {
      return { ok: false, error: "Mobile session expired" };
    }

    if (session.status !== "active") {
      return { ok: false, error: "Mobile session is not active" };
    }

    return {
      ok: true,
      isMobileSession: true,
      sessionType: session.session_type,
    };
  } finally {
    db.close();
  }
};

function init(httpServer, opts = {}) {
  if (ioInstance) return ioInstance;
  
  // Handle CORS origins - support both array and function
  let corsOrigin = opts.corsOrigins;
  if (Array.isArray(corsOrigin)) {
    const allowedOrigins = corsOrigin;
    corsOrigin = (origin, callback) => {
      if (!origin) return callback(null, true);

      if (process.env.NODE_ENV === "production") {
        if (origin && origin.includes("railway.app")) {
          return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error("Not allowed by CORS"));
      }

      return callback(null, true);
    };
  }
  
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigin || [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://ceypossolutions.com",
        "https://www.ceypossolutions.com"
      ],
      methods: ["GET", "POST"],
    },
  });
  ioInstance = io;
    console.log("Ceypos Websocket server running...");

  // Broadcast change bus events to interested rooms
  changeBus.on("change", (event) => {
    if (!event?.shopId) return;
    const room = `shop_${event.shopId}`;
    recordChangeLatency(event);
    io.to(room).emit("change", event);
  });

  io.on("connection", async (socket) => {
    const shopId =
      socket.handshake.query?.shopId || socket.handshake.auth?.shopId;
    const sessionId =
      socket.handshake.query?.sessionId || socket.handshake.auth?.sessionId;
    const token = socket.handshake.query?.token || socket.handshake.auth?.token;
    const requestedSessionType =
      socket.handshake.query?.sessionType || socket.handshake.auth?.sessionType;
    const terminalId =
      socket.handshake.query?.terminalId || socket.handshake.auth?.terminalId;
    const terminalToken =
      socket.handshake.query?.terminalToken || socket.handshake.auth?.terminalToken;
    if (!shopId) {
      console.warn("Socket connection without shopId - disconnecting");
      socket.emit("error", { message: "shopId is required" });
      socket.disconnect(true);
      return;
    }

    const room = `shop_${shopId}`;
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);

    // ensure DB exists and schema initialized - only for existing shops
    try {
      // Only open if database already exists, don't create new ones
      if (!shopDatabaseExists(shopId)) {
        console.warn(`Shop database does not exist for ${shopId} - disconnecting`);
        socket.emit("error", { message: "Shop database not found. Please complete shop setup first." });
        socket.disconnect(true);
        return;
      }

      const sessionCheck = validateMobileSocketSession(
        shopId,
        sessionId,
        token,
        requestedSessionType
      );
      if (!sessionCheck.ok) {
        console.warn(`Mobile socket rejected for ${shopId}: ${sessionCheck.error}`);
        socket.emit("error", { message: sessionCheck.error });
        socket.disconnect(true);
        return;
      }

      if (terminalId && terminalToken) {
        const db = openShopDatabase(shopId);
        try {
          const terminalCheck = validateTerminalToken(db, shopId, terminalId, terminalToken);
          if (!terminalCheck.ok) {
            socket.emit("error", { message: terminalCheck.error });
            socket.disconnect(true);
            return;
          }
          socket.data.terminalId = terminalId;
          socket.data.terminalType = terminalCheck.terminal.terminal_type;
        } finally {
          db.close();
        }
      }

      if (sessionCheck.isMobileSession) {
        publishChange({
          shopId,
          entity: "sessions",
          action: "mobile_connected",
          payload: {
            sessionId,
            sessionType: sessionCheck.sessionType,
            socketId: socket.id,
          },
        });
      }
    } catch (err) {
      console.error("Failed to open shop DB for socket connection", err);
      socket.emit("error", { message: "Failed to open shop DB" });
      socket.disconnect(true);
      return;
    }

    try {
      const snapshot = getShopSnapshot(shopId);
      socket.emit("initialState", snapshot);
      if (typeof opts?.onInitialStateSent === "function") {
        opts.onInitialStateSent(shopId, socket.id);
      }
    } catch (snapshotErr) {
      console.error("Failed to send initial snapshot", snapshotErr);
      socket.emit("error", { message: "Failed to load initial data" });
    }

    socket.on("inventory:fetch", async (_, cb) => {
      try {
        const inventory = getInventory(shopId);
        socket.emit("change", {
          changeId: `snapshot-${Date.now()}`,
          timestamp: new Date().toISOString(),
          shopId,
          entity: "inventory",
          action: "snapshot",
          payload: { rows: inventory },
        });
        if (typeof cb === "function") cb({ ok: true, count: inventory.length });
      } catch (err) {
        console.error("inventory:fetch error", err);
        if (typeof cb === "function") cb({ ok: false, error: String(err) });
      }
    });

    socket.on("inventory:upsert", async (payload, cb) => {
      try {
        const products = Array.isArray(payload) ? payload : [payload];
        const rows = upsertProducts(shopId, products, {
          actor: socket.id,
        });
        if (typeof cb === "function") cb({ ok: true, rows });
      } catch (err) {
        console.error("inventory:upsert error", err);
        if (typeof cb === "function") cb({ ok: false, error: String(err) });
      }
    });

    socket.on("mobile:log", (payload) => {
      if (!payload || typeof payload !== "object") return;
      const entry = payload;
      console.log("[mobile]", entry);
    });

    socket.on("mobile:barcode", (payload, cb) => {
      try {
        if (!payload || typeof payload !== "object") {
          if (typeof cb === "function") cb({ ok: false, error: "Invalid payload" });
          return;
        }

        const event = {
          ...payload,
          shopId,
          sessionId: sessionId || payload.sessionId,
          sessionType: requestedSessionType || payload.sessionType,
        };
        io.to(room).emit("mobile:barcode", event);
        if (typeof cb === "function") cb({ ok: true });
      } catch (err) {
        console.error("mobile:barcode error", err);
        if (typeof cb === "function") cb({ ok: false, error: String(err) });
      }
    });

    socket.on("ping", (cb) => {
      if (typeof cb === "function") cb({ ok: true, now: Date.now() });
    });

    socket.on("disconnect", (reason) => {
      console.log(`Socket ${socket.id} disconnected: ${reason}`);
      if (socket.data?.terminalId) {
        publishChange({
          shopId,
          entity: "terminals",
          action: "left",
          payload: { terminalId: socket.data.terminalId, socketId: socket.id, reason },
        });
      }
      publishChange({
        shopId,
        entity: "sessions",
        action: "left",
        payload: { socketId: socket.id, reason },
      });
    });
  });

  return io;
}

export { init };
