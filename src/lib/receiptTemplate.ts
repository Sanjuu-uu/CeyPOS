// Thermal receipt template.
//
// Pure function — returns an HTML string that will be written into a
// hidden iframe by receiptPrinter.ts. CSS targets both 58mm and 80mm
// receipt rolls. Uses a monospace font (Courier-style) because thermal
// printers render fixed-width text reliably across drivers.
//
// Layout principles:
//  - Single column, full-width header
//  - Item row uses a small wrap-friendly layout instead of a hard table
//    so long item names break gracefully on narrow 58mm paper.
//  - Dashed separators reproduce the look of escpos's hr() command but
//    survive any printer's font rendering.

import type { PaperWidth } from "./printerSettings";

export interface ReceiptItem {
  name?: string;
  /** Inventory / SKU code shown before the item name (e.g. "1954"). */
  code?: string;
  quantity: number;
  price: number;
}

export interface ReceiptShop {
  name?: string;
  address?: string;
  contact?: string;
  /**
   * Optional remote or data-URL logo. Rendered above the shop name when
   * present. Keep small (<200×80px) for thermal paper.
   */
  logoUrl?: string;
  /** Optional short store code (e.g. "SCPN"). */
  storeCode?: string;
}

export interface ReceiptCustomer {
  name?: string;
  email?: string;
  phone?: string;
}

export interface ReceiptData {
  shop: ReceiptShop;
  customer?: ReceiptCustomer | null;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  currency: string;
  timestamp: string;
  receiptNumber: string;
  cashier?: string;
  pointsEarned?: number;
  pointsRedeemed?: number;
  /** Amount of cash tendered (cash sales only). Triggers Change line. */
  cashReceived?: number;
  /** Change returned in cash (if not auto-derived). */
  changeAmount?: number;
}

export interface ReceiptTemplateOptions {
  paperWidth: PaperWidth;
  showQrCode: boolean;
  qrCodeDataUrl?: string | null;
  publicReceiptUrl?: string | null;
  footerText: string;
  feedLines: number;
}

// ---------- formatting helpers ----------

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMoney(amount: number, currency: string): string {
  const n = Number(amount);
  return `${currency}${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}

function formatInvoiceNumber(raw?: string): string {
  const original = String(raw ?? "");
  if (/^INV-/i.test(original)) return original.toUpperCase();
  const cleaned = original.replace(/[^a-zA-Z0-9]/g, "");
  if (!cleaned) return "INV-00000000";
  return `INV-${cleaned.slice(-8).toUpperCase().padStart(8, "0")}`;
}

function formatPaymentMethod(value: string): string {
  const key = String(value || "").toLowerCase().trim();
  switch (key) {
    case "card":
      return "Card payment";
    case "cash":
      return "Cash";
    case "mobile":
    case "qr":
      return "Mobile / QR";
    default:
      if (!key) return "—";
      return key.charAt(0).toUpperCase() + key.slice(1);
  }
}

function formatDateTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

// Width presets per paper size. Values tuned for typical thermal
// printer drivers (Epson, Star, Xprinter) where the printable area
// is roughly paper width minus ~8mm of margin/silicon backing.
const WIDTH_PRESETS: Record<
  PaperWidth,
  {
    pageWidthMm: number;
    bodyWidthMm: number;
    fontSizePt: number;
    headerFontPt: number;
    qrSizePx: number;
  }
> = {
  "58mm": {
    pageWidthMm: 58,
    bodyWidthMm: 48,
    fontSizePt: 9,
    headerFontPt: 11,
    qrSizePx: 110,
  },
  "80mm": {
    pageWidthMm: 80,
    bodyWidthMm: 72,
    fontSizePt: 10,
    headerFontPt: 13,
    qrSizePx: 150,
  },
};

// ---------- template ----------

export function buildReceiptHtml(
  data: ReceiptData,
  options: ReceiptTemplateOptions,
): string {
  const preset = WIDTH_PRESETS[options.paperWidth];
  const invoice = formatInvoiceNumber(data.receiptNumber);
  const dateText = formatDateTime(data.timestamp);

  // Item rows — line-numbered, "code: name" style on row 1, indented
  // price/qty/amount on row 2. Mirrors the Keells / Cargills / Arpico
  // layout cashiers and customers already recognise.
  const itemsHtml = (data.items || [])
    .map((item, idx) => {
      const ln = idx + 1;
      const namePart = escapeHtml(item.name || "Item");
      const codePart = item.code
        ? `<span class="item-code">${escapeHtml(item.code)}:</span> `
        : "";
      const qty = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      const lineTotal = qty * price;
      return `
        <div class="item-row">
          <div class="item-head">
            <span class="item-ln">${ln}</span>
            <span class="item-title">${codePart}${namePart}</span>
          </div>
          <div class="item-amounts">
            <span class="col-price">${escapeHtml(formatMoney(price, data.currency))}</span>
            <span class="col-qty">${qty}</span>
            <span class="col-amount">${escapeHtml(formatMoney(lineTotal, data.currency))}</span>
          </div>
        </div>`;
    })
    .join("");

  const gross = (data.items || []).reduce(
    (sum, item) =>
      sum + (Number(item.quantity) || 0) * (Number(item.price) || 0),
    0,
  );
  const showDiscount = (data.discount || 0) > 0.001;
  const showTax = (data.tax || 0) > 0.001;
  const showPointsEarned = (data.pointsEarned || 0) > 0;
  const showPointsRedeemed = (data.pointsRedeemed || 0) > 0;

  // Cash tendered / change. Only meaningful for cash sales.
  const isCashPayment =
    String(data.paymentMethod || "").toLowerCase().trim() === "cash";
  const hasCashReceived =
    isCashPayment && Number.isFinite(Number(data.cashReceived));
  const change = hasCashReceived
    ? Number(data.changeAmount) ||
      Math.max(0, Number(data.cashReceived) - Number(data.total))
    : 0;

  const qrBlock =
    options.showQrCode && options.qrCodeDataUrl
      ? `
        <div class="qr-block">
          <img class="qr" src="${options.qrCodeDataUrl}" alt="Digital receipt QR" />
          <div class="qr-caption">Scan for a digital copy</div>
          ${options.publicReceiptUrl
            ? `<div class="qr-url">${escapeHtml(options.publicReceiptUrl)}</div>`
            : ""}
        </div>`
      : "";

  // Trailing feed lines so the cut happens below the last text.
  const feed = Math.max(0, Math.min(8, options.feedLines || 0));
  const feedBlock = "<br/>".repeat(feed);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Receipt ${escapeHtml(invoice)}</title>
  <style>
    @page {
      size: ${preset.pageWidthMm}mm auto;
      margin: 0;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      width: ${preset.pageWidthMm}mm;
      font-family: "Courier New", Courier, monospace;
      font-size: ${preset.fontSizePt}pt;
      line-height: 1.35;
    }
    .receipt {
      width: ${preset.bodyWidthMm}mm;
      margin: 0 auto;
      padding: 4mm 0;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: 700; }
    .muted { color: #333333; }

    .shop-name {
      font-size: ${preset.headerFontPt}pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .shop-meta {
      font-size: ${Math.max(7, preset.fontSizePt - 2)}pt;
      margin-top: 1mm;
    }
    .hr {
      border: 0;
      border-top: 1px dashed #000000;
      margin: 2mm 0;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      gap: 4mm;
      font-size: ${Math.max(8, preset.fontSizePt - 1)}pt;
    }
    .meta-label { color: #333333; }

    .logo {
      display: block;
      margin: 0 auto 2mm auto;
      max-width: ${preset.bodyWidthMm - 4}mm;
      max-height: 18mm;
      object-fit: contain;
    }

    .items-head {
      display: grid;
      grid-template-columns: 4mm 1fr 14mm 8mm 16mm;
      gap: 1mm;
      font-size: ${Math.max(7, preset.fontSizePt - 2)}pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding-bottom: 1mm;
      border-bottom: 1px solid #000000;
    }
    .items-head .col-price,
    .items-head .col-qty,
    .items-head .col-amount { text-align: right; }

    .items { margin-top: 1mm; }
    .item-row {
      margin-bottom: 1.5mm;
      page-break-inside: avoid;
    }
    .item-head {
      display: grid;
      grid-template-columns: 4mm 1fr;
      gap: 1mm;
      align-items: start;
    }
    .item-ln {
      font-size: ${Math.max(8, preset.fontSizePt - 1)}pt;
      color: #333333;
      font-variant-numeric: tabular-nums;
    }
    .item-title {
      font-size: ${preset.fontSizePt}pt;
      font-weight: 600;
      word-wrap: break-word;
      line-height: 1.3;
    }
    .item-code {
      font-weight: 700;
      color: #000000;
    }
    .item-amounts {
      display: grid;
      grid-template-columns: 4mm 1fr 14mm 8mm 16mm;
      gap: 1mm;
      margin-top: 0.5mm;
      font-size: ${Math.max(8, preset.fontSizePt - 1)}pt;
      color: #111111;
      font-variant-numeric: tabular-nums;
    }
    .item-amounts .col-price,
    .item-amounts .col-qty,
    .item-amounts .col-amount {
      text-align: right;
    }
    /* First two grid columns of .item-amounts are intentionally empty so
       the price/qty/amount line up under the header columns. */
    .item-amounts .col-price { grid-column: 3; }
    .item-amounts .col-qty { grid-column: 4; }
    .item-amounts .col-amount { grid-column: 5; }

    .row {
      display: flex;
      justify-content: space-between;
      gap: 4mm;
      padding: 0.4mm 0;
      font-size: ${Math.max(8, preset.fontSizePt - 1)}pt;
    }
    .totals .row {
      display: flex;
      justify-content: space-between;
      gap: 4mm;
      padding: 0.4mm 0;
    }
    .totals .grand {
      border-top: 1px dashed #000000;
      margin-top: 1mm;
      padding-top: 1.5mm;
      font-size: ${preset.fontSizePt + 1}pt;
      font-weight: 700;
    }

    .payment {
      margin-top: 2mm;
      display: flex;
      justify-content: space-between;
    }

    .qr-block {
      margin-top: 3mm;
      text-align: center;
    }
    .qr {
      width: ${preset.qrSizePx}px;
      height: ${preset.qrSizePx}px;
      image-rendering: pixelated;
    }
    .qr-caption {
      margin-top: 1mm;
      font-size: ${Math.max(7, preset.fontSizePt - 2)}pt;
    }
    .qr-url {
      margin-top: 1mm;
      font-size: ${Math.max(6, preset.fontSizePt - 3)}pt;
      word-break: break-all;
      color: #444444;
    }

    .footer {
      margin-top: 3mm;
      text-align: center;
      font-size: ${Math.max(7, preset.fontSizePt - 1)}pt;
    }

    @media print {
      body { width: ${preset.pageWidthMm}mm; }
      .receipt { width: ${preset.bodyWidthMm}mm; }
    }
  </style>
</head>
<body>
  <div class="receipt">

    ${data.shop.logoUrl
      ? `<img class="logo" src="${escapeHtml(data.shop.logoUrl)}" alt="" />`
      : ""}
    <div class="center shop-name">${escapeHtml(data.shop.name || "Receipt")}</div>
    ${data.shop.address
      ? `<div class="center shop-meta">${escapeHtml(data.shop.address)}</div>`
      : ""}
    ${data.shop.contact
      ? `<div class="center shop-meta">${escapeHtml(data.shop.contact)}</div>`
      : ""}
    ${data.shop.storeCode
      ? `<div class="center shop-meta">Store Code: ${escapeHtml(data.shop.storeCode)}</div>`
      : ""}
    <div class="center shop-meta">${escapeHtml(dateText)}${data.cashier ? `  C:${escapeHtml(data.cashier)}` : ""}  R:${escapeHtml(invoice)}</div>

    <hr class="hr" />

    ${data.customer?.name
      ? `<div class="meta-row">
          <span class="meta-label">Customer</span>
          <span>${escapeHtml(data.customer.name)}</span>
        </div>
        <hr class="hr" />`
      : ""}

    <div class="items-head">
      <span>Ln</span>
      <span>Item</span>
      <span class="col-price">Price</span>
      <span class="col-qty">Qty</span>
      <span class="col-amount">Amount</span>
    </div>

    <div class="items">
      ${itemsHtml}
    </div>

    <hr class="hr" />

    <div class="totals">
      <div class="row">
        <span class="meta-label">Gross Amount</span>
        <span>${escapeHtml(formatMoney(gross, data.currency))}</span>
      </div>
      ${showDiscount
        ? `<div class="row">
            <span class="meta-label">Promotion Discount</span>
            <span>${escapeHtml(formatMoney(data.discount, data.currency))}</span>
          </div>`
        : ""}
      <div class="row">
        <span class="meta-label">Net Amount</span>
        <span>${escapeHtml(formatMoney(Math.max(0, gross - (data.discount || 0)), data.currency))}</span>
      </div>
      ${showTax
        ? `<div class="row">
            <span class="meta-label">Tax</span>
            <span>${escapeHtml(formatMoney(data.tax, data.currency))}</span>
          </div>`
        : ""}
      <div class="row grand">
        <span>Total</span>
        <span>${escapeHtml(formatMoney(data.total, data.currency))}</span>
      </div>
    </div>

    <hr class="hr" />

    <div class="row payment">
      <span class="meta-label">${escapeHtml(formatPaymentMethod(data.paymentMethod))}</span>
      <span class="bold">${escapeHtml(formatMoney(hasCashReceived ? Number(data.cashReceived) : data.total, data.currency))}</span>
    </div>
    ${hasCashReceived
      ? `<div class="row">
          <span class="meta-label">Total Change</span>
          <span>${escapeHtml(formatMoney(change, data.currency))}</span>
        </div>`
      : ""}

    ${showPointsEarned || showPointsRedeemed
      ? `<hr class="hr" />
         ${showPointsEarned
           ? `<div class="row">
               <span class="meta-label">Points earned</span>
               <span>+${escapeHtml(String(data.pointsEarned))}</span>
             </div>`
           : ""}
         ${showPointsRedeemed
           ? `<div class="row">
               <span class="meta-label">Points redeemed</span>
               <span>−${escapeHtml(String(data.pointsRedeemed))}</span>
             </div>`
           : ""}`
      : ""}

    ${qrBlock}

    <div class="footer">${escapeHtml(options.footerText || "")}</div>

    ${feedBlock}
  </div>
</body>
</html>`;
}
