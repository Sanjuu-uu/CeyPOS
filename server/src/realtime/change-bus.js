import { EventEmitter } from "events";
import { randomUUID } from "crypto";

const bus = new EventEmitter();
bus.setMaxListeners(100);

function publishChange(event = {}) {
  if (!event.shopId) {
    console.warn("publishChange called without shopId", event);
    return;
  }

  const change = {
    changeId: event.changeId || randomUUID(),
    timestamp: event.timestamp || new Date().toISOString(),
    shopId: String(event.shopId),
    entity: event.entity || "unknown",
    action: event.action || "unknown",
    payload: event.payload ?? null,
    actor: event.actor || null,
    metadata: event.metadata || {},
  };

  // Surface realtime traffic in the server logs so developers can confirm broadcasts
  console.info(
    "[change-bus] published",
    JSON.stringify(
      {
        changeId: change.changeId,
        timestamp: change.timestamp,
        shopId: change.shopId,
        entity: change.entity,
        action: change.action,
        actor: change.actor,
      },
      null,
      0
    )
  );

  bus.emit("change", change);
}

export { bus, publishChange };
