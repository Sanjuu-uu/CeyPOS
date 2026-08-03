// WebSocket server for real-time two-way sync per shop
import { Server } from "socket.io";
import { randomUUID } from "crypto";
import { openShopDatabase, shopDatabaseExists } from "./utils/shop-database.js";
import { getInventory, upsertProducts } from "./services/inventory-service.js";
import { getShopSnapshot } from "./services/shop-snapshot.js";
import { bus as changeBus, publishChange } from "./realtime/change-bus.js";
import { validateTerminalToken } from "./services/terminal-service.js";
import { lookupGlobalBarcodeProduct } from "./utils/global-barcode-database.js";

let ioInstance;

const changeLatencySamples = [];
const CHANGE_LATENCY_SAMPLE_LIMIT = 200;

// ---------------------------------------------------------------------------
// Cart stock reservations (ephemeral, in-memory).
//
// When a terminal puts items in its cart it "reserves" that stock so other
// terminals stop seeing it as available. Reservations are NOT persisted and
// never touch the real stock column — they only exist while a socket is
// connected. On disconnect (close, crash, network drop) a socket's holds are
// released automatically, so stock can never leak.
//
//   reservationsByShop: Map<shopId, Map<socketId, Map<inventoryCode, qty>>>
// ---------------------------------------------------------------------------
const reservationsByShop = new Map();
const socketTerminalsByShop = new Map();
const completedReservationSequencesByShop = new Map();

function aggregateReservations(shopId) {
  const perSocket = reservationsByShop.get(shopId);
  const totals = {};
  if (!perSocket) return totals;
  for (const codes of perSocket.values()) {
    for (const [code, qty] of codes.entries()) {
      if (!qty || qty <= 0) continue;
      totals[code] = (totals[code] || 0) + qty;
    }
  }
  return totals;
}

function rememberSocketTerminal(shopId, socketId, terminalId) {
  if (!terminalId) return;
  let perSocket = socketTerminalsByShop.get(shopId);
  if (!perSocket) {
    perSocket = new Map();
    socketTerminalsByShop.set(shopId, perSocket);
  }
  perSocket.set(socketId, String(terminalId));
}

function forgetSocketTerminal(shopId, socketId) {
  const perSocket = socketTerminalsByShop.get(shopId);
  if (!perSocket) return;
  perSocket.delete(socketId);
  if (perSocket.size === 0) socketTerminalsByShop.delete(shopId);
}

function rememberCompletedReservationSequence(shopId, terminalId, sequence) {
  const normalizedTerminalId = String(terminalId || "");
  const normalizedSequence = Number(sequence || 0);
  if (
    !shopId ||
    !normalizedTerminalId ||
    !Number.isFinite(normalizedSequence) ||
    normalizedSequence <= 0
  ) {
    return;
  }

  let perTerminal = completedReservationSequencesByShop.get(shopId);
  if (!perTerminal) {
    perTerminal = new Map();
    completedReservationSequencesByShop.set(shopId, perTerminal);
  }
  perTerminal.set(
    normalizedTerminalId,
    Math.max(Number(perTerminal.get(normalizedTerminalId) || 0), normalizedSequence),
  );
}

function getCompletedReservationSequence(shopId, terminalId) {
  const perTerminal = completedReservationSequencesByShop.get(shopId);
  if (!perTerminal) return 0;
  return Number(perTerminal.get(String(terminalId || "")) || 0);
}

function broadcastReservations(shopId) {
  publishChange({
    shopId,
    entity: "reservations",
    action: "update",
    payload: { reservations: aggregateReservations(shopId) },
  });
}

function setSocketReservations(shopId, socketId, items) {
  let perSocket = reservationsByShop.get(shopId);
  if (!perSocket) {
    perSocket = new Map();
    reservationsByShop.set(shopId, perSocket);
  }
  const codes = new Map();
  if (Array.isArray(items)) {
    for (const item of items) {
      const code = item?.inventory_code ?? item?.code ?? item?.id;
      const qty = Number(item?.quantity ?? 0);
      if (code === undefined || code === null || !Number.isFinite(qty) || qty <= 0) {
        continue;
      }
      const key = String(code);
      codes.set(key, (codes.get(key) || 0) + qty);
    }
  }
  if (codes.size > 0) {
    perSocket.set(socketId, codes);
  } else {
    perSocket.delete(socketId);
  }
}

function releaseTerminalReservations(shopId, terminalId) {
  const normalizedTerminalId = String(terminalId || "");
  if (!shopId || !normalizedTerminalId) return false;

  const perSocket = reservationsByShop.get(shopId);
  const terminalBySocket = socketTerminalsByShop.get(shopId);
  if (!perSocket || !terminalBySocket) return false;

  let changed = false;
  for (const [socketId, heldTerminalId] of terminalBySocket.entries()) {
    if (heldTerminalId !== normalizedTerminalId) continue;
    if (perSocket.delete(socketId)) changed = true;
  }

  if (perSocket.size === 0) reservationsByShop.delete(shopId);
  return changed;
}

function releaseSocketReservations(shopId, socketId) {
  const perSocket = reservationsByShop.get(shopId);
  if (!perSocket || !perSocket.has(socketId)) return false;
  perSocket.delete(socketId);
  if (perSocket.size === 0) reservationsByShop.delete(shopId);
  return true;
}

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

const normalizeBarcode = (value) => String(value || "").replace(/\s+/g, "").trim();

function sessionRoom(shopId, sessionId) {
  return `shop_${shopId}:session_${sessionId}`;
}

function resolveBarcodeForShop(shopId, barcode, { includeGlobal = false } = {}) {
  const clean = normalizeBarcode(barcode);
  if (!clean) return { barcode: clean, found: false, source: null, product: null };

  const db = openShopDatabase(shopId);
  try {
    const inventory = db
      .prepare("SELECT * FROM inventory WHERE deleted_at IS NULL AND barcode_id = ? LIMIT 1")
      .get(clean);
    if (inventory) {
      return { barcode: clean, found: true, source: "inventory", product: inventory };
    }

    if (includeGlobal) {
      const globalProduct = lookupGlobalBarcodeProduct(clean);
      if (globalProduct) {
        return { barcode: clean, found: true, source: "global", product: globalProduct };
      }
    }

    return { barcode: clean, found: false, source: null, product: null };
  } finally {
    db.close();
  }
}

function recordMobileScanEvent({ shopId, sessionId, sessionType, barcode, lookup, socketId }) {
  const db = openShopDatabase(shopId);
  try {
    db.prepare(
      `INSERT INTO mobile_scan_events (
         event_id, session_id, shop_id, session_type, barcode, status,
         product_code, socket_id, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      randomUUID(),
      sessionId || "",
      shopId,
      sessionType || "unknown",
      barcode,
      lookup?.found ? "matched" : "unmatched",
      lookup?.product?.inventory_code || null,
      socketId || null,
      new Date().toISOString(),
    );
  } catch (err) {
    console.warn("Failed to record mobile scan event", err?.message || err);
  } finally {
    db.close();
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

  // A completed checkout permanently deducts stock in SQLite, so the
  // temporary cart holds for that same terminal must be released even if the
  // browser-side "clear cart" socket event is late, lost, or came from an old
  // connection. Otherwise the next inventory broadcast looks like stock was
  // deducted twice: once from the DB and once from a ghost reservation.
  changeBus.on("change", (event) => {
    if (event?.entity !== "transactions" || event?.action !== "created") return;
    const terminalId = event?.payload?.transaction?.terminal_id;
    if (!terminalId) return;
    rememberCompletedReservationSequence(
      String(event.shopId),
      terminalId,
      event?.payload?.transaction?.reservation_sequence,
    );
    if (releaseTerminalReservations(String(event.shopId), terminalId)) {
      broadcastReservations(String(event.shopId));
    }
  });

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
          rememberSocketTerminal(shopId, socket.id, terminalId);
        } finally {
          db.close();
        }
      }

      if (sessionCheck.isMobileSession) {
        socket.join(sessionRoom(shopId, sessionId));
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
      // Bring this terminal up to date with current cart reservations from
      // every other connected terminal.
      socket.emit("change", {
        changeId: `reservations-snapshot-${Date.now()}`,
        timestamp: new Date().toISOString(),
        shopId,
        entity: "reservations",
        action: "update",
        payload: { reservations: aggregateReservations(shopId) },
      });
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

        const value = normalizeBarcode(payload.value);
        if (!value) {
          if (typeof cb === "function") cb({ ok: false, error: "Barcode is required" });
          return;
        }

        const eventSessionId = sessionId || payload.sessionId;
        const eventSessionType = requestedSessionType || payload.sessionType;
        const lookup = resolveBarcodeForShop(shopId, value, {
          includeGlobal: eventSessionType === "barcode",
        });
        recordMobileScanEvent({
          shopId,
          sessionId: eventSessionId,
          sessionType: eventSessionType,
          barcode: value,
          lookup,
          socketId: socket.id,
        });

        const event = {
          ...payload,
          value,
          shopId,
          sessionId: eventSessionId,
          sessionType: eventSessionType,
          lookup,
          serverTs: Date.now(),
        };
        if (eventSessionId) {
          io.to(sessionRoom(shopId, eventSessionId)).emit("mobile:barcode", event);
        }
        io.to(room).emit("mobile:barcode", event);
        if (typeof cb === "function") cb({ ok: true, lookup });
      } catch (err) {
        console.error("mobile:barcode error", err);
        if (typeof cb === "function") cb({ ok: false, error: String(err) });
      }
    });

    socket.on("ping", (cb) => {
      if (typeof cb === "function") cb({ ok: true, now: Date.now() });
    });

    // A terminal reports the items currently held in its cart. We replace this
    // socket's whole reservation set each time, then broadcast the new shop-wide
    // aggregate so every terminal can recompute available stock.
    socket.on("cart:reserve", (payload, cb) => {
      try {
        const items = Array.isArray(payload?.items) ? payload.items : [];
        const sequence = Number(payload?.sequence ?? payload?.reservationSequence ?? 0);
        const completedSequence = getCompletedReservationSequence(
          shopId,
          socket.data?.terminalId,
        );

        if (
          socket.data?.terminalId &&
          items.length > 0 &&
          Number.isFinite(sequence) &&
          sequence > 0 &&
          sequence <= completedSequence
        ) {
          if (typeof cb === "function") cb({ ok: true, stale: true });
          return;
        }

        setSocketReservations(shopId, socket.id, items);
        broadcastReservations(shopId);
        if (typeof cb === "function") cb({ ok: true });
      } catch (err) {
        console.error("cart:reserve error", err);
        if (typeof cb === "function") cb({ ok: false, error: String(err) });
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`Socket ${socket.id} disconnected: ${reason}`);
      if (releaseSocketReservations(shopId, socket.id)) {
        broadcastReservations(shopId);
      }
      forgetSocketTerminal(shopId, socket.id);
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
