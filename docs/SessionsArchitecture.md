# CeyPoS Sessions and Barcode Scanning Architecture

## Overview
This document defines the new sessions and barcode scanning strategy. The goal is to keep barcode input consistent and ultra-fast across:

- Mobile-only scanning web page (camera-based) for inventory import and checkout.
- Standard barcode scanners connected to a laptop (keyboard wedge behavior).
- Manual search input in POS and Inventory.

All barcode inputs flow into one shared intake pipeline, then route to the active workflow (Inventory Import or POS Checkout).

## Current code touchpoints (observed)
- Sessions UI is a front-end wizard with QR placeholders and simulated connection logic.
- POS includes a global keyboard scan buffer that converts fast key bursts into barcode events.
- Inventory search already matches barcodes when typed into the search input.

These will remain, but the pipeline will be unified to avoid input conflicts and make mobile scanning first-class.

## Core goals
- Mobile scanning must be faster than typing and never block the UI.
- Standard scanners must work with zero configuration (keyboard wedge mode).
- No lag: scanning should add to cart or filter inventory within ~200ms from scan capture.
- Single source of truth for routing: the active session type decides where a barcode goes.

## Session types
We keep three session types, but only two need barcode intake:

- Cashier device session: secondary desktop terminal, full POS interface.
- Barcode sync session: mobile scanning for inventory import and edit.
- Checkout session: mobile scanning for POS cart building.

## Mobile-only scanning page
Mobile scanning is hosted at a dedicated mobile-only route:

- Base URL: ceypos.com/mobilesessions
- Scan URL: ceypos.com/mobilesessions/scan

Behavior:
- Mobile-only UI (phone-sized layout, no desktop chrome).
- Opens camera and begins scanning immediately after session auth.
- Uses Barcode Detection API where supported; falls back to a JS decoder where not.
- Sends scan results to the desktop session via WebSocket with a short payload.

### Mobile scan UI states
- Connecting: verify QR and open a WebSocket.
- Scanning: live preview, autofocus hints, and a tap-to-freeze option for low light.
- Confirmed: show the decoded value and a quick action for re-scan.

## Standard barcode scanners on laptop
Most scanners act as a keyboard that types characters quickly and presses Enter. The POS already has a fast-key buffer to detect these bursts and convert them into a barcode event. That same event should be reusable by Inventory and Import flows.

Expected behavior:
- Scan barcode while POS or Inventory is open.
- System captures the burst and routes it to the active workflow.
- Optional: audible feedback on success or error.

## Unified barcode intake pipeline
All barcode sources create the same event object:

```typescript
type BarcodeEvent = {
  value: string;
  source: "keyboard" | "mobile" | "manual";
  ts: number;
  sessionId?: string;
  shopId?: string;
};
```

Intake stages:
1. Normalize input: trim, remove whitespace, validate length.
2. Debounce and batch: group scans in a small window for smooth UI.
3. Route by active context: Inventory Import or POS Checkout.
4. Apply workflow action: add to cart, open product edit, or filter results.

## Workflow routing
Routing is decided by the active session and view:

- If checkout session is active, barcode adds item to cart.
- If barcode sync session is active, barcode opens product edit or add flow.
- If no session is active, barcode behaves like a search term in the current module.

## Inventory import and checkout flows

### Inventory import (mobile or keyboard)
- Scan barcode.
- If product exists: open edit and update stock or details.
- If product does not exist: open add product with barcode pre-filled.

### Checkout (mobile or keyboard)
- Scan barcode.
- If product exists: add to cart or increase quantity.
- If product does not exist: show error state and keep scanning.

## Session auth and QR strategy
QR data payload:

```json
{
  "sessionId": "...",
  "sessionType": "cashier|barcode|checkout",
  "shopId": "...",
  "issuedAt": 1710000000000,
  "expiresAt": 1710000300000,
  "authToken": "short-lived"
}
```

Rules:
- QR expires in 5 minutes.
- Tokens are single-use.
- Reconnect uses sessionId + token refresh.

## Mobile scanning technology notes
Use the browser Barcode Detection API when available. It is fast and runs on optimized platform code, but support varies by browser. It requires a secure context (HTTPS) and camera permissions.

Fallbacks:
- Use a small JS barcode decoder library if BarcodeDetector is unavailable.
- Keep decoding off the main thread where possible (Web Worker).

## Performance and no-lag guarantees
- Scan decode loop uses requestAnimationFrame or worker-based processing.
- Decoding frame rate target: 10 to 15 fps (enough for barcodes and light on CPU).
- WebSocket payload is tiny: event + barcode string only.
- Desktop UI updates are batched (200ms) to avoid re-render storms.
- Idle detection to keep scanners marked active and avoid delayed focus.

## Error handling
- Barcode not found: show a brief non-blocking toast and keep scanning.
- Network loss: queue scans and replay after reconnect.
- Permission denied: show a one-tap retry and fallback to manual input.

## Security
- HTTPS required for camera access.
- WebSocket auth bound to sessionId and shopId.
- Session cleanup after inactivity.

## Minimal API contract (suggested)
These endpoints are optional if WebSocket is the only transport, but they are useful for diagnostics and offline fallbacks.

```
POST /api/mobile/sessions/create
POST /api/mobile/sessions/validate
POST /api/mobile/barcode/scan
POST /api/mobile/checkout/add
POST /api/mobile/inventory/lookup
```

## Implementation alignment checklist
- POS continues to accept keyboard scanners, but exposes a barcode event emitter.
- Inventory and Import subscribe to the same barcode event emitter.
- Mobile scan page publishes to the same event pipeline over WebSocket.
- Sessions UI generates real QR payloads and not placeholders.

## References
- MDN: Barcode Detection API (experimental, limited support)
- MDN: MediaDevices.getUserMedia (HTTPS + permission requirements)
- Chrome for Developers: Shape Detection API overview and best practices

Updated: 2026-05-13
Owner: Ceynode
Version: 2.0
