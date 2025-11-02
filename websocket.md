# Realtime Synchronization Blueprint

**In plain terms:** whenever someone changes data in the app (like editing stock or toggling a payment method), the change is saved in the shop’s SQLite file and instantly broadcast over Socket.IO to every open session for that shop. Each browser tab keeps a live cache in `src/lib/db.ts`; it accepts only fresh updates and immediately re-renders the affected screens. Likewise, when a client makes a change, the server writes it, echoes the update back through the same realtime channel, and every other device stays in lockstep—no manual refreshes or local-only copies.

## 1. Architecture Snapshot (Current)

- **Per-shop SQLite files** – Onboarding still provisions `shop-${id}.db` via `server/src/utils/db.js`, one authoritative file per shop.
- **Service-layer change bus** – API routes and services (see `server/src/routes/sales.js`, `server/src/routes/payment-methods.js`, `server/src/services/inventory-service.js`) run transactional writes, then push structured change objects into the in-process bus. Each publish is logged so operators can trace the realtime feed.
- **Socket.IO relay** – `server/src/ws-server.js` subscribes to that bus, emits an initial snapshot (`initialState`) on connection, and streams granular `change` events (`inventory`, `transactions`, `customers`, `daily_sales`, `payment_methods`).
- **Client realtime cache** – `src/lib/db.ts` fetches shop metadata + snapshot, keeps per-shop caches in memory, and now guards every merge with a monotonic check (`lastAppliedChanges`) before exposing typed helpers (`products.create`, `sales.create`, `paymentMethods.setEnabled`, etc.).
- **Event taxonomy** – Payloads carry `{ shopId, entity, payload, timestamp?, changeId? }`. Inventory publishes now include both `upsert` (row snapshots) and `delete` (inventory codes only); transaction events include the transaction row plus line items; customer, daily_sales, and payment methods events ship the upserted rows/lists.

## 2. Product Guardrails

1. **Source of truth** – UI interactions write through the service layer so SQLite stays canonical.
2. **Instant propagation** – Every write produces a websocket delta; the cache layer replays it into module state without manual refresh.
3. **Bidirectional sync** – External writers (CLI, MCP, etc.) push through the same controllers or change log so connected clients receive the update.
4. **Multi-session alignment** – Realtime events are namespaced per shop, ensuring all sessions within a shop see the same feed.
5. **Operational safety** – Mutations remain wrapped in synchronous SQLite transactions; the client rejects stale packets via the monotonic guard while broader durability work (Litestream, server-side ordering metadata) is tracked below.

## 3. UI ↔ Database Coverage

| UI surface | Reads | Mutations | Realtime hooks |
| --- | --- | --- | --- |
| `inventory/Inventory.tsx` | `db.products.getByShopId` -> local state | `db.products.create/update` (Socket.IO) and `db.products.delete` (REST + `inventory:delete`) | Subscribes to `inventoryUpdated` and rehydrates list immediately |
| `pos/ProductGrid.tsx` | `db.products.getByShopId` (through context pipeline) | Cart only (no direct writes) | Listens to `inventoryUpdated` through POS wrapper |
| `pos/ShoppingCart.tsx` | Cart context | Calls `db.sales.create` for checkout | Relies on `salesUpdated` → POS refresh + inventory adjustments |
| `checkout/Checkout.tsx` | Cart context snapshot | Awaits `db.sales.create` and disables UI during POST | No extra listener (cart clears post-success) |
| `analytics/DatabasePreview.tsx` | Reads products, sales, customers, daily sales snapshots | Read-only | Listens to `inventoryUpdated`, `saleCreated`, `salesUpdated`, `customersUpdated`, `dailySalesUpdated` |
| `reports/Reports.tsx` | Local state seeded from sales/products | Read-only | Subscribes to `saleCreated` and `inventoryUpdated` |
| `receipts/Receipts.tsx` | Mirrors `db.sales` into local list | Read-only | Subscribes to `salesUpdated` + `saleCreated` and keeps selection stable |
| `payments/Payments.tsx` | `db.sales.getByShopId`, `db.paymentMethods.getByShopId` | `db.paymentMethods.setEnabled` (REST + change bus), uses cached sales for analytics | Listens to `salesUpdated`, `saleCreated`, `paymentMethodsUpdated` |
| `dashboard/Dashboard.tsx` | Mirrors `db.sales` for KPIs | Read-only | Subscribes to `salesUpdated` + `saleCreated`; quick actions route to live modules |
| `pos/POS.tsx` | Inventory list for product grid | Read-only | Subscribes to `inventoryUpdated` |

All cart totals, receipt previews, and payment breakdowns now render directly from the synced cache. Payment-method toggles write through the new REST controller and bounce back as realtime updates. No UI mutates local copies of inventory or sales data; everything flows through the shared helpers.

## 4. Change Lifecycle

1. **Mutation** – UI calls (e.g.) `db.products.create` or `db.sales.create`, which proxy to Socket.IO emitters or REST endpoints.
2. **Backend commit** – The route/service writes the SQLite transaction, logs the result, and publishes a change object `{ shopId, entity, payload, actor?, timestamp? }` to the change bus.
3. **Broadcast** – `ws-server` forwards the change to all sockets joined to the shop room (including the new `payment_methods` channel).
4. **Client reconcile** – `src/lib/db.ts` rejects stale packets with the monotonic guard before merging the payload into the in-memory cache (or pruning deleted inventory codes), then fires event emitters (e.g., `inventoryUpdated`, `salesUpdated`, `paymentMethodsUpdated`).
5. **React integration** – Feature modules subscribe via `db.on(...)` and update component state, triggering an immediate re-render.

---

References: Socket.IO multi-node deployment guidance [using-multiple-nodes](https://socket.io/docs/v4/using-multiple-nodes/); Litestream durability overview [litestream-how-it-works](https://litestream.io/how-it-works/); ElectricSQL change-shape model [electric-shapes](https://electric-sql.com/docs/guides/shapes); Turso embedded replicas [turso-embedded-replicas](https://docs.turso.tech/features/embedded-replicas/introduction); Ably websocket best practices [ably-websocket-architecture](https://ably.com/topic/websocket-architecture-best-practices).


**Updated**: Octomber 11, 2025  
**Author**: Ceynode
@ CeyPoS - Point of Sale System  
