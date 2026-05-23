// Receipt email template — intentionally plain.
//
// Design goals:
//   1. Look like business correspondence, not marketing. Spam filters score
//      bright colors, large CTAs, image-heavy layouts and nested tables
//      against you; plain prose with one small text link scores well.
//   2. Keep HTML and text bodies in sync — high mismatch is another spam
//      signal. Both bodies say the same thing in the same order.
//   3. No external images, no tracking pixels, no JavaScript, no remote CSS.
//      Only inline minimal styling on the button.
//   4. Pure function: pass everything in, get { subject, html, text } back.
//      Easy to unit-test and easy to swap for an MJML/Handlebars renderer
//      later without touching the route.

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMoney(amount, currency = "$") {
  const n = Number(amount);
  return `${currency}${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}

function formatDate(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (!d || Number.isNaN(d.getTime())) return "";
  // "23 May 2026" — day-month-year, no commas, no time. Reads as a date,
  // not a timestamp.
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

function prettyPaymentMethod(method) {
  const raw = String(method || "").trim().toLowerCase();
  if (raw === "cash") return "Cash";
  if (raw === "card") return "Card Payment";
  if (raw === "mobile" || raw === "qr") return "Mobile Payment";
  if (!raw) return "—";
  // Title-case anything custom (e.g. "bank transfer" → "Bank Transfer").
  return raw
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatInvoiceNumber(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "—";
  // If the caller already prefixed it (e.g. "INV-10245"), keep it; otherwise
  // add a friendly INV- prefix so the email matches accounting conventions.
  return /^[A-Z]{2,}[-_].+/i.test(raw) ? raw : `INV-${raw}`;
}

export function buildReceiptEmail({
  shopName,
  shopAddress,
  shopContact,
  customerName,
  receiptNumber,
  total,
  currency = "$",
  paymentMethod,
  timestamp,
  publicReceiptUrl,
}) {
  const shop = shopName || "our store";
  const customer = customerName || "Customer";
  const invoiceNo = formatInvoiceNumber(receiptNumber);
  const amount = formatMoney(total, currency);
  const method = prettyPaymentMethod(paymentMethod);
  const date = formatDate(timestamp) || formatDate(new Date());

  const subject = `Receipt from ${shop} — ${invoiceNo}`;

  // --- Plain-text body (rendered verbatim by mail clients in low-trust modes).
  const text = [
    `Dear ${customer},`,
    "",
    `Thank you for your purchase with ${shop}.`,
    "",
    "Your payment has been successfully processed.",
    "",
    "Order Details:",
    `  Invoice No: ${invoiceNo}`,
    `  Amount Paid: ${amount}`,
    `  Payment Method: ${method}`,
    `  Date: ${date}`,
    "",
    "Your digital receipt is available at the secure link below:",
    publicReceiptUrl,
    "",
    "If you have any questions, please reply to this email and our team will assist you.",
    "",
    `Thank you for choosing ${shop}.`,
    "",
    "Best regards,",
    shop,
  ]
    .concat(
      [shopAddress, shopContact].filter(Boolean).length
        ? ["", [shopAddress, shopContact].filter(Boolean).join(" · ")]
        : [],
    )
    .join("\n");

  // --- HTML body. Single column, system font, one small button, minimal CSS.
  const safeShop = escapeHtml(shop);
  const safeCustomer = escapeHtml(customer);
  const safeInvoice = escapeHtml(invoiceNo);
  const safeAmount = escapeHtml(amount);
  const safeMethod = escapeHtml(method);
  const safeDate = escapeHtml(date);
  const safeUrl = escapeHtml(publicReceiptUrl);
  const safeAddress = shopAddress ? escapeHtml(shopAddress) : "";
  const safeContact = shopContact ? escapeHtml(shopContact) : "";
  const footerLine = [safeAddress, safeContact].filter(Boolean).join(" · ");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:24px;background:#ffffff;color:#222222;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;">
<div style="max-width:560px;margin:0 auto;">
<p style="margin:0 0 16px 0;">Dear ${safeCustomer},</p>
<p style="margin:0 0 16px 0;">Thank you for your purchase with ${safeShop}.</p>
<p style="margin:0 0 16px 0;">Your payment has been successfully processed.</p>
<p style="margin:0 0 6px 0;"><strong>Order Details</strong></p>
<p style="margin:0 0 16px 0;">
Invoice No: ${safeInvoice}<br>
Amount Paid: ${safeAmount}<br>
Payment Method: ${safeMethod}<br>
Date: ${safeDate}
</p>
<p style="margin:0 0 12px 0;">Your digital receipt is available at the secure link below:</p>
<p style="margin:0 0 20px 0;">
<a href="${safeUrl}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:4px;font-size:14px;">View Receipt</a>
</p>
<p style="margin:0 0 16px 0;">If you have any questions, please reply to this email and our team will assist you.</p>
<p style="margin:0 0 16px 0;">Thank you for choosing ${safeShop}.</p>
<p style="margin:0 0 4px 0;">Best regards,</p>
<p style="margin:0 0 24px 0;">${safeShop}</p>
${
  footerLine
    ? `<p style="margin:0;padding-top:16px;border-top:1px solid #eeeeee;color:#888888;font-size:12px;">${footerLine}</p>`
    : ""
}
</div>
</body>
</html>`;

  return { subject, html, text };
}
