// Receipt SMS template.
//
// Constraints:
//  - Single-segment SMS is 160 GSM-7 characters; multi-segment is 153/segment.
//  - The public receipt URL alone is ~60–90 chars depending on host.
//  - Keep copy short, plain, and free of marketing language so carriers in
//    LK/AS don't classify the message as bulk promo.
//
// Goal: fit common cases in 1–2 segments while still feeling personal.

function formatMoney(amount, currency = "$") {
  const n = Number(amount);
  return `${currency}${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}

function firstName(value, max = 16) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const first = trimmed.split(/\s+/)[0];
  return first.length <= max ? first : first.slice(0, max - 1) + "…";
}

function trimTo(value, max) {
  const s = String(value || "").trim();
  if (s.length <= max) return s;
  return s.slice(0, Math.max(0, max - 1)) + "…";
}

export function buildReceiptSms({
  customerName,
  shopName,
  total,
  currency = "$",
  invoiceNumber,
  publicReceiptUrl,
}) {
  const greeting = customerName ? `Hi ${firstName(customerName)}, ` : "";
  const shop = trimTo(shopName || "your store", 28);
  const amount = formatMoney(total, currency);
  const inv = invoiceNumber ? ` (${invoiceNumber})` : "";

  // Sentence order is chosen so the most important pieces — amount and link —
  // are still readable if the body is truncated by a carrier or display.
  const message =
    `${greeting}thanks for your purchase at ${shop}. ` +
    `Receipt${inv}: ${amount} paid. ` +
    `View: ${publicReceiptUrl}`;

  return {
    message,
    estimatedSegments: estimateSegments(message),
  };
}

// Cheap segment estimate: assumes GSM-7. If the message contains non-GSM
// characters the carrier will fall back to UCS-2 (70/67 chars per segment).
// We don't try to be perfectly accurate — this is purely informational for
// the route's response payload.
function estimateSegments(message) {
  const length = String(message || "").length;
  if (length <= 160) return 1;
  return Math.ceil(length / 153);
}
