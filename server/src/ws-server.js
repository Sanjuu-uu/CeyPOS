// WebSocket server for real-time two-way sync per shop
import { Server } from "socket.io";
import { shopDatabaseExists } from "./utils/shop-database.js";
import { getInventory, upsertProducts } from "./services/inventory-service.js";
import { getShopSnapshot } from "./services/shop-snapshot.js";
import { bus as changeBus, publishChange } from "./realtime/change-bus.js";

let ioInstance;

function init(httpServer, opts = {}) {
  if (ioInstance) return ioInstance;
  
  // Handle CORS origins - support both array and function
  let corsOrigin = opts.corsOrigins;
  if (Array.isArray(corsOrigin)) {
    const allowedOrigins = corsOrigin;
    corsOrigin = (origin, callback) => {
      if (!origin) return callback(null, true);
      
      // In production, allow Railway domains
      if (process.env.NODE_ENV === "production" && origin && origin.includes("railway.app")) {
        return callback(null, true);
      }
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      return callback(new Error("Not allowed by CORS"));
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
    io.to(room).emit("change", event);
  });

  io.on("connection", async (socket) => {
    const shopId =
      socket.handshake.query?.shopId || socket.handshake.auth?.shopId;
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

    socket.on("ping", (cb) => {
      if (typeof cb === "function") cb({ ok: true, now: Date.now() });
    });

    socket.on("disconnect", (reason) => {
      console.log(`Socket ${socket.id} disconnected: ${reason}`);
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
