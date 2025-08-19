// WebSocket server for real-time two-way sync per shop
const { Server } = require('socket.io');
const { createOrOpenShopDb, dbPathForShop, openDb, insertInventoryRows } = require('./utils/db');
const fs = require('fs');
const path = require('path');

let ioInstance;
const watchers = new Map(); // shopId -> fs.FSWatcher

function safeParseProduct(p) {
  // normalize incoming product payloads to DB fields
  return {
    inventory_code: p.inventory_code || p.inventoryCode || p.id || null,
    barcode_id: p.barcode_id || p.barcodeId || null,
    name: p.name || p.productName || null,
    category: p.category || null,
    sku: p.sku || null,
    price: p.price == null || p.price === '' ? null : Number(p.price),
    stock: p.stock == null || p.stock === '' ? 0 : Number(p.stock),
    stock_last_month: p.stock_last_month || 0,
    restock_suggestion: p.restock_suggestion || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function readInventory(db) {
  try {
    const stmt = db.prepare('SELECT * FROM inventory');
    return Array.from(stmt.iterate());
  } catch (err) {
    console.error('Failed to read inventory', err);
    return [];
  }
}

function init(httpServer, opts = {}) {
  if (ioInstance) return ioInstance;
  const io = new Server(httpServer, {
    cors: {
      origin: opts.corsOrigins || ['http://localhost:5173', 'http://127.0.0.1:5173'],
      methods: ['GET', 'POST']
    }
  });
  ioInstance = io;

  io.on('connection', async (socket) => {
    const shopId = socket.handshake.query?.shopId || socket.handshake.auth?.shopId;
    if (!shopId) {
      console.warn('Socket connection without shopId - disconnecting');
      socket.emit('error', { message: 'shopId is required' });
      socket.disconnect(true);
      return;
    }

    const room = `shop_${shopId}`;
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);

    // ensure DB exists and schema initialized
    let db;
    try {
      db = createOrOpenShopDb(shopId);
    } catch (err) {
      console.error('Failed to open shop DB for socket connection', err);
      socket.emit('error', { message: 'Failed to open shop DB' });
      socket.disconnect(true);
      return;
    }

    // Setup file watcher for this shop's DB file (once)
    if (!watchers.has(shopId)) {
      try {
        const dbPath = dbPathForShop(shopId);
        const watcher = fs.watch(dbPath, { persistent: false }, (eventType) => {
          // On any change, read inventory and broadcast snapshot
          try {
            const dbr = openDb(shopId);
            const inv = readInventory(dbr);
            io.to(`shop_${shopId}`).emit('inventoryUpdated', { shopId, items: inv });
          } catch (e) {
            console.error('Watcher read error:', e);
          }
        });
        watchers.set(shopId, watcher);
      } catch (watchErr) {
        console.warn('Failed to watch DB file for', shopId, watchErr);
      }
    }

    // Handle client requests
    socket.on('getInventory', async (payload, cb) => {
      try {
        const inv = readInventory(db);
        socket.emit('inventorySnapshot', { shopId, items: inv });
        if (typeof cb === 'function') cb({ ok: true, count: inv.length });
      } catch (err) {
        console.error('getInventory error', err);
        if (typeof cb === 'function') cb({ ok: false, error: String(err) });
      }
    });

    socket.on('upsertProduct', async (payload, cb) => {
      try {
        const product = safeParseProduct(payload);
        insertInventoryRows(db, [product]);
        // Broadcast to all clients of this shop
        const inv = readInventory(db);
        io.to(room).emit('inventoryUpdated', { shopId, items: inv, changed: product });
        if (typeof cb === 'function') cb({ ok: true });
      } catch (err) {
        console.error('upsertProduct error', err);
        if (typeof cb === 'function') cb({ ok: false, error: String(err) });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`Socket ${socket.id} disconnected: ${reason}`);
    });
  });

  return io;
}

module.exports = { init };
