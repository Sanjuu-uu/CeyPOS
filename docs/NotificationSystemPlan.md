# CeyPoS Notification System Plan

## Goal

Build a fast, smooth, shop-scoped notification system that is realtime by default, persistent in the database, and usable from the top bar without forcing the user to refresh. The system must work well for owners and managers, stay lightweight for staff, and avoid duplicating alerts across tabs or devices.

This plan is based on the current codebase shape:

- Realtime transport already exists through `server/src/realtime/change-bus.js` and `server/src/ws-server.js`.
- The client already consumes shop changes in `src/lib/db.ts`.
- The current bell in `src/components/layout/TopBar.tsx` is only a placeholder.
- Notification preferences in `src/components/modules/settings/Settings.tsx` are currently local-only.
- The only implemented backend notification behavior is terminal-pairing email in `server/src/services/notification-service.js`.

## Product Rules

1. Notifications must be shop-scoped.
2. Notifications must be persistent so unread items survive reloads.
3. Notifications must be realtime so every open session updates instantly.
4. The bell should show unread count and recent items without leaving the current screen.
5. The user should be able to mark one item read or mark all read.
6. Notification preferences should be saved server-side, not only in React state.
7. The in-app notification path must stay fast even when email or push delivery is also enabled.

## Similar Systems And What To Copy

From MDN Notifications and Service Worker guidance:

- System notifications require user permission.
- Persistent notifications need a service worker and `showNotification()`.
- Push delivery requires a service worker and a secure context.
- Notification handling must be click-driven and action-driven, not polling-driven.

From common notification products such as GitHub, Slack, and Linear:

- Unread state is always visible.
- Notification inboxes are triaged, not just dumped as a stream.
- Preferences are split by channel and category.
- Mark-read can happen per item or in bulk.
- Important items stay visible until acknowledged.

## Recommended Architecture

### 1. In-app notification inbox

This is the first and most important layer. It should be powered by the existing app websocket room and backed by database rows.

### 2. Optional browser system notifications

This should be a second-phase enhancement for desktop and supported mobile browsers. It should only be used for high-priority events such as pairing requests, approvals, revocations, and critical stock alerts.

### 3. Optional push notifications

Only add this after the inbox is stable. Push should be treated as an advanced delivery channel, not the primary system.

## Data Model

Use a shop-scoped notifications table plus per-user preferences.

### Notifications table

Each row should store:

- `notificationId`
- `shopId`
- `recipientEmail`
- `category` such as `sales`, `inventory`, `terminals`, `sessions`, or `system`
- `severity` such as `info`, `success`, `warning`, or `critical`
- `title`
- `body`
- `linkPath`
- `sourceEntity`
- `sourceAction`
- `sourceChangeId`
- `payloadJson`
- `createdAt`
- `readAt`
- `deliveredAt`

### Preferences table

Each row should store:

- `shopId`
- `userEmail`
- `emailNotifications`
- `inAppNotifications`
- `lowStockAlerts`
- `dailyReports`
- `salesAlerts`
- `systemUpdates`
- `quietHoursStart`
- `quietHoursEnd`

## Event Triggers

The system should generate notifications from real domain actions, not fake UI events.

| Trigger source | Action | Recipient | Category | Severity | Notes |
| --- | --- | --- | --- | --- | --- |
| `server/src/routes/sales.js` | sale completed | owner, manager | sales | success | Create a sale notification after commit, then optionally create follow-up stock alerts. |
| `server/src/services/inventory-service.js` | stock adjust / delete / upsert | owner, manager | inventory | warning / critical | Trigger when stock falls below threshold or hits zero. |
| `server/src/services/terminal-service.js` | pairing pending | owner, manager | terminals | warning | Surface register approval requests in-app and optionally by email. |
| `server/src/services/terminal-service.js` | pairing approved | requesting user, owner, manager | terminals | success | Notify the member who requested the terminal and the shop owners. |
| `server/src/services/terminal-service.js` | pairing rejected | requesting user, owner, manager | terminals | info | Let the requester know immediately. |
| `server/src/services/terminal-service.js` | terminal revoked | owner, manager | terminals | warning | Important security event. |
| `server/src/routes/mobile-sessions.js` | session created | owner, manager | sessions | info | Use for new mobile scan or cashier sessions. |
| `server/src/routes/mobile-sessions.js` | session linked | owner, manager | sessions | success | Useful when a mobile device is validated. |
| `server/src/routes/mobile-sessions.js` | session revoked | owner, manager | sessions | warning | Useful for lifecycle cleanup and auditing. |
| `server/src/routes/team-members.js` | onboarding / verification milestones | owner, member | system | info | Optional, if the product wants onboarding feedback in the same inbox. |

## Delivery Model

### In-app first

When a trigger fires:

1. Write the notification row to the database.
2. Publish a `notifications` change through the existing change bus.
3. Broadcast that change to the `shop_<id>` websocket room.
4. Reconcile the client cache in `src/lib/db.ts`.
5. Update the bell badge and drawer immediately.

### Email second

Only send email for events that matter outside the app, such as:

- terminal pairing requests
- terminal approvals and revocations
- critical stock alerts if the owner wants them

### Push later

If push is added later, use service worker based persistent notifications only. Do not use page-only notifications for mission-critical events.

## UI Behavior

### Top bar bell

The top bar should:

- show unread count
- open a drawer without leaving the page
- show recent notifications in reverse chronological order
- highlight unread items visually
- support mark-read on click
- support mark-all-read

### Notification item design

Each item should show:

- title
- body
- timestamp
- severity color or icon
- category label
- deep link target when relevant

### Empty state

If there are no notifications, show a calm empty state rather than a blank box.

### Loading state

Use a skeleton or minimal loading message. Do not block the rest of the page.

## Settings Behavior

Notification settings should persist on the server and control both in-app and delivery-channel behavior.

Recommended settings controls:

- in-app notifications on/off
- email notifications on/off
- low stock alerts on/off
- sales alerts on/off
- system updates on/off
- daily reports on/off
- quiet hours start/end

If the user changes a toggle, save immediately and show a subtle saving state.

## Realtime Client Changes

`src/lib/db.ts` should treat `notifications` as a first-class entity.

The client should:

- keep a notifications cache per shop
- emit `notificationsUpdated` on change events
- avoid duplicate toasts or duplicate inbox rows
- reconcile unread count from the authoritative backend rows

## Backend Route Set

Add a dedicated route group such as `server/src/routes/notifications.js`.

Endpoints:

- `GET /api/notifications` list items and unread count
- `GET /api/notifications/preferences` load settings
- `PUT /api/notifications/preferences` save settings
- `POST /api/notifications/:id/read` mark one read
- `POST /api/notifications/read-all` mark all read

## Performance Rules

1. Create the notification row in the same transaction boundary or immediately after the source commit.
2. Do not block sale completion on secondary delivery channels.
3. Keep websocket payloads small; send the notification row, not the entire inbox.
4. Debounce client refreshes if multiple notifications arrive in one burst.
5. Avoid polling unless a browser or network constraint forces fallback.

## Security Rules

1. Scope all notifications by shop and recipient email.
2. Do not let one shop read another shop's notifications.
3. Keep browser push behind explicit permission.
4. Treat push subscription endpoints as secrets.
5. Use secure contexts for browser notification APIs.
6. Respect quiet hours and per-category preferences.

## Suggested Rollout Phases

### Phase 1

- Add notification persistence
- Add notification list and preferences APIs
- Hook the top bar bell to the API and websocket updates
- Hook settings to server-side preferences

### Phase 2

- Add notification generation for sales, inventory, sessions, and terminals
- Add unread count and mark-read behavior
- Add item deep links

### Phase 3

- Add browser system notifications for critical events
- Add permission prompt and fallback handling

### Phase 4

- Add push notification subscriptions and service worker delivery
- Add subscription management and token rotation

## Acceptance Criteria

The notification system is ready when all of these are true:

- the bell shows a live unread count
- opening the bell shows recent notifications without a page reload
- new sale, stock, terminal, and session actions create persistent items
- read state survives refresh
- preferences save to the server
- notifications are delivered realtime across multiple open tabs
- critical notifications can later be promoted to browser push without redesigning the data model

## Current Codebase Mapping

Use these files as the implementation anchors:

- `server/src/realtime/change-bus.js`
- `server/src/ws-server.js`
- `server/src/services/notification-service.js`
- `server/src/services/inventory-service.js`
- `server/src/routes/sales.js`
- `server/src/services/terminal-service.js`
- `server/src/routes/mobile-sessions.js`
- `src/lib/db.ts`
- `src/components/layout/TopBar.tsx`
- `src/components/modules/settings/Settings.tsx`
- `src/context/AppContext.tsx`

## Recommended Order Of Work

1. Create the persistent notification schema and API.
2. Wire in-app realtime delivery into the websocket/change bus flow.
3. Replace the top bar placeholder with the notification drawer.
4. Persist settings toggles.
5. Add trigger generation from sales, inventory, sessions, and terminals.
6. Add browser push only after the inbox is stable.

## Notes From Browser APIs

- Use `Notification.requestPermission()` only from a user gesture.
- Use service-worker based `showNotification()` for persistent notifications.
- Push and notifications require a secure context.
- Mobile support is much better with persistent notifications than with page-only constructors.
