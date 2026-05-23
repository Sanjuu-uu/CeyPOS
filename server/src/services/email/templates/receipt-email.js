// Receipt email template.
//
// Design goals:
//  1. Transactional tone — no marketing language, no urgency, no exclamation
//     spam triggers ("Act now!", "FREE", "Guarantee"). Suitable for
//     consumer inboxes that score with SpamAssassin / Mail-Tester.
//  2. Self-contained — one pure function, no template engine dependency.
//     Swap to MJML/Handlebars later by replacing the body of `buildReceiptEmail`
//     without touching the route.
//  3. Mobile-safe — single-column 600px max, inline styles only,
//     no remote images, no web fonts.
//  4. Accessible — semantic structure, sufficient color contrast,
//     plain-text alternative carries the full receipt content.

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

function formatInvoiceNumber(raw) {
  const cleaned = String(raw ?? "").replace(/[^a-zA-Z0-9]/g, "");
  if (!cleaned) return "INV-00000000";
  if (/^INV-/i.test(String(raw))) return String(raw).toUpperCase();
  const last = cleaned.slice(-8).toUpperCase();
  return `INV-${last.padStart(8, "0")}`;
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // "23 May 2026" — locale-stable, no comma, low spam signal.
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function formatPaymentMethod(value) {
  const key = String(value || "").toLowerCase().trim();
  switch (key) {
    case "card":
      return "Card payment";
    case "cash":
      return "Cash";
    case "mobile":
    case "qr":
      return "Mobile / QR payment";
    default:
      if (!key) return "—";
      return key.charAt(0).toUpperCase() + key.slice(1);
  }
}

export function buildReceiptEmail({
  shopName,
  shopAddress,
  shopContact,
  customerName,
  receiptNumber,
  total,
  subtotal,
  tax = 0,
  discount = 0,
  paymentMethod,
  timestamp,
  items = [],
  currency = "$",
  publicReceiptUrl,
}) {
  const safeShop = escapeHtml(shopName || "Your store");
  const safeAddress = shopAddress ? escapeHtml(shopAddress) : "";
  const safeContact = shopContact ? escapeHtml(shopContact) : "";
  const safeCustomer = escapeHtml(customerName || "there");
  const invoice = formatInvoiceNumber(receiptNumber);
  const safeInvoice = escapeHtml(invoice);
  const safeTotal = escapeHtml(formatMoney(total, currency));
  const safeMethod = escapeHtml(formatPaymentMethod(paymentMethod));
  const safeDate = escapeHtml(formatDate(timestamp));
  const safeTime = escapeHtml(formatTime(timestamp));
  const safeUrl = escapeHtml(publicReceiptUrl);

  const resolvedSubtotal = Number.isFinite(Number(subtotal))
    ? Number(subtotal)
    : Number(total) || 0;
  const showDiscount = Number(discount) > 0.001;
  const showTax = Number(tax) > 0.001;

  // Subject line: concrete, transactional, no symbols that trip filters.
  const subject = `Receipt from ${shopName || "your store"} — ${invoice}`;

  // Hidden preheader — appears in inbox preview alongside the subject.
  const preheader = `Order ${invoice} · ${formatMoney(total, currency)} paid · ${formatDate(timestamp)}`;

  const itemsHtml = (items || [])
    .map((item) => {
      const name = escapeHtml(item.name || "Item");
      const qty = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      const lineTotal = qty * price;
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#111827;vertical-align:top;">
            ${name}
            <div style="font-size:12px;color:#6b7280;margin-top:2px;">${qty} × ${escapeHtml(formatMoney(price, currency))}</div>
          </td>
          <td align="right" style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#111827;vertical-align:top;white-space:nowrap;">
            ${escapeHtml(formatMoney(lineTotal, currency))}
          </td>
        </tr>`;
    })
    .join("");

  const totalsRows = `
    <tr>
      <td style="padding:6px 0;font-size:13px;color:#6b7280;">Subtotal</td>
      <td align="right" style="padding:6px 0;font-size:13px;color:#111827;white-space:nowrap;">
        ${escapeHtml(formatMoney(resolvedSubtotal, currency))}
      </td>
    </tr>
    ${
      showDiscount
        ? `<tr>
            <td style="padding:6px 0;font-size:13px;color:#6b7280;">Discount</td>
            <td align="right" style="padding:6px 0;font-size:13px;color:#111827;white-space:nowrap;">
              −${escapeHtml(formatMoney(discount, currency))}
            </td>
          </tr>`
        : ""
    }
    ${
      showTax
        ? `<tr>
            <td style="padding:6px 0;font-size:13px;color:#6b7280;">Tax</td>
            <td align="right" style="padding:6px 0;font-size:13px;color:#111827;white-space:nowrap;">
              ${escapeHtml(formatMoney(tax, currency))}
            </td>
          </tr>`
        : ""
    }
    <tr>
      <td style="padding:10px 0 0 0;border-top:1px solid #e5e7eb;font-size:14px;color:#111827;font-weight:600;">Total paid</td>
      <td align="right" style="padding:10px 0 0 0;border-top:1px solid #e5e7eb;font-size:16px;color:#111827;font-weight:700;white-space:nowrap;">
        ${safeTotal}
      </td>
    </tr>`;

  const supportLine = safeContact
    ? `If you have any questions, please contact us at <a href="mailto:${safeContact.includes("@") ? safeContact : ""}" style="color:#2563eb;text-decoration:none;">${safeContact}</a>.`
    : `If you have any questions about this receipt, please reply to this email.`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;-webkit-text-size-adjust:100%;">
  <!-- Preheader: visible in inbox preview, hidden in the body. -->
  <div style="display:none;font-size:1px;color:#f6f7f9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${escapeHtml(preheader)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f7f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;border:1px solid #e5e7eb;">

          <!-- Heading -->
          <tr>
            <td style="padding:32px 36px 0 36px;">
              <div style="font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.12em;text-transform:uppercase;">Receipt</div>
              <h1 style="margin:8px 0 6px 0;font-size:22px;line-height:1.3;color:#111827;font-weight:600;">
                Thank you, ${safeCustomer}.
              </h1>
              <p style="margin:0;color:#4b5563;font-size:14px;line-height:1.55;">
                We've received your payment. Here are the details of your order from <strong style="color:#111827;">${safeShop}</strong>.
              </p>
            </td>
          </tr>

          <!-- Order Details card -->
          <tr>
            <td style="padding:24px 36px 0 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;">
                <tr>
                  <td style="padding:14px 18px;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.08em;text-transform:uppercase;border-bottom:1px solid #e5e7eb;">
                    Order details
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 18px 4px 18px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:4px 0;font-size:13px;color:#6b7280;">Invoice No</td>
                        <td align="right" style="padding:4px 0;font-size:13px;color:#111827;font-weight:600;">${safeInvoice}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;font-size:13px;color:#6b7280;">Amount Paid</td>
                        <td align="right" style="padding:4px 0;font-size:13px;color:#111827;font-weight:600;">${safeTotal}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;font-size:13px;color:#6b7280;">Payment Method</td>
                        <td align="right" style="padding:4px 0;font-size:13px;color:#111827;font-weight:600;">${safeMethod}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0 14px 0;font-size:13px;color:#6b7280;">Date</td>
                        <td align="right" style="padding:4px 0 14px 0;font-size:13px;color:#111827;font-weight:600;">
                          ${safeDate}${safeTime ? ` <span style="color:#9ca3af;font-weight:400;">· ${safeTime}</span>` : ""}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${
            itemsHtml
              ? `<!-- Items -->
          <tr>
            <td style="padding:28px 36px 0 36px;">
              <div style="font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px;">Items</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${itemsHtml}
              </table>
            </td>
          </tr>`
              : ""
          }

          <!-- Totals -->
          <tr>
            <td style="padding:18px 36px 4px 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${totalsRows}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:26px 36px 8px 36px;">
              <p style="margin:0 0 14px 0;font-size:14px;color:#4b5563;line-height:1.55;">
                Your digital receipt is ready. View or save a copy using the link below.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#111827;border-radius:10px;">
                    <a href="${safeUrl}" style="display:inline-block;padding:13px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:#ecff76;text-decoration:none;letter-spacing:0.01em;">
                      View &amp; download receipt
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:14px 0 0 0;font-size:12px;color:#6b7280;line-height:1.55;word-break:break-all;">
                <a href="${safeUrl}" style="color:#2563eb;text-decoration:none;">${safeUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Support -->
          <tr>
            <td style="padding:18px 36px 0 36px;">
              <p style="margin:0;font-size:13px;color:#4b5563;line-height:1.6;">
                ${supportLine}
              </p>
              <p style="margin:14px 0 0 0;font-size:13px;color:#111827;line-height:1.6;">
                Thank you for choosing <strong>${safeShop}</strong>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 36px 28px 36px;border-top:1px solid #f3f4f6;margin-top:24px;">
              <p style="margin:16px 0 0 0;font-size:12px;color:#9ca3af;line-height:1.55;">
                <strong style="color:#6b7280;">${safeShop}</strong>${safeAddress ? `<br/>${safeAddress}` : ""}${safeContact ? `<br/>${safeContact}` : ""}
              </p>
              <p style="margin:10px 0 0 0;font-size:11px;color:#9ca3af;line-height:1.55;">
                This receipt was sent because a purchase was completed at ${safeShop}. Please retain it for your records.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Plain text alternative — carries the same content for clients that
  // strip HTML, and improves spam scoring.
  const text = [
    `Thank you, ${customerName || "there"}.`,
    "",
    `We've received your payment. Here are your order details from ${shopName || "your store"}.`,
    "",
    `Order details`,
    `  Invoice No:     ${invoice}`,
    `  Amount Paid:    ${formatMoney(total, currency)}`,
    `  Payment Method: ${formatPaymentMethod(paymentMethod)}`,
    `  Date:           ${formatDate(timestamp)}${formatTime(timestamp) ? ` ${formatTime(timestamp)}` : ""}`,
    "",
    ...(items && items.length
      ? [
          "Items",
          ...items.map((item) => {
            const qty = Number(item.quantity) || 0;
            const price = Number(item.price) || 0;
            return `  ${item.name || "Item"}  —  ${qty} x ${formatMoney(price, currency)}  =  ${formatMoney(qty * price, currency)}`;
          }),
          "",
        ]
      : []),
    `Subtotal: ${formatMoney(resolvedSubtotal, currency)}`,
    ...(showDiscount ? [`Discount: -${formatMoney(discount, currency)}`] : []),
    ...(showTax ? [`Tax:      ${formatMoney(tax, currency)}`] : []),
    `Total:    ${formatMoney(total, currency)}`,
    "",
    `View your receipt: ${publicReceiptUrl}`,
    "",
    shopContact
      ? `If you have any questions, please contact us at ${shopContact}.`
      : `If you have any questions about this receipt, please reply to this email.`,
    "",
    `Thank you for choosing ${shopName || "us"}.`,
    "",
    "—",
    shopName || "Your store",
    ...(shopAddress ? [shopAddress] : []),
    ...(shopContact ? [shopContact] : []),
  ].join("\n");

  return { subject, html, text };
}
