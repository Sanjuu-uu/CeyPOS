import { db } from "./db";

type BarcodeHandler = (payload: {
  value: string;
  sessionType?: string;
  sessionId?: string;
}) => void;

const handlers = new Set<BarcodeHandler>();
let installed = false;

export function registerBarcodeHandler(handler: BarcodeHandler) {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export function installGlobalBarcodeRouter() {
  if (installed) return;
  installed = true;
  db.on("mobileBarcode", (payload: unknown) => {
    if (!payload || typeof payload !== "object") return;
    const event = payload as Record<string, unknown>;
    const value = String(event.value || event.barcode || "").trim();
    if (!value) return;

    const normalized = {
      value,
      sessionType: event.sessionType ? String(event.sessionType) : undefined,
      sessionId: event.sessionId ? String(event.sessionId) : undefined,
    };

    if (handlers.size === 0) {
      console.warn("[barcodeRouter] No handler mounted for scan:", value);
      return;
    }

    handlers.forEach((handler) => {
      try {
        handler(normalized);
      } catch (err) {
        console.error("[barcodeRouter] handler error", err);
      }
    });
  });
}
