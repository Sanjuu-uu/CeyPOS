// Receipt email template — kept as a single pure function so it's easy to swap
// for a future MJML/Handlebars template engine without changing route code.

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

export function buildReceiptEmail({
  shopName,
  shopAddress,
  shopContact,
  customerName,
  receiptNumber,
  total,
  currency = "$",
  publicReceiptUrl,
}) {
  const safeShop = escapeHtml(shopName || "Your store");
  const safeAddress = shopAddress ? escapeHtml(shopAddress) : "";
  const safeContact = shopContact ? escapeHtml(shopContact) : "";
  const safeCustomer = escapeHtml(customerName || "Valued customer");
  const safeReceipt = escapeHtml(receiptNumber || "—");
  const safeTotal = escapeHtml(formatMoney(total, currency));
  const safeUrl = escapeHtml(publicReceiptUrl);

  const subject = `Your receipt from ${shopName || "your store"} (#${receiptNumber || ""})`.trim();

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:14px;border:1px solid #e5e7eb;overflow:hidden;">
        <tr><td style="padding:28px 32px 0 32px;">
          <div style="font-size:12px;font-weight:600;color:#6b7280;letter-spacing:.08em;text-transform:uppercase;">Receipt</div>
          <h1 style="margin:6px 0 6px 0;font-size:22px;line-height:1.3;color:#111827;">Thank you, ${safeCustomer}.</h1>
          <p style="margin:0;color:#4b5563;font-size:14px;line-height:1.55;">Here's your receipt from <strong>${safeShop}</strong>.</p>
        </td></tr>

        <tr><td style="padding:24px 32px 8px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:16px 18px;font-size:13px;color:#6b7280;">Receipt #</td>
              <td style="padding:16px 18px;font-size:13px;color:#111827;font-weight:600;text-align:right;">${safeReceipt}</td>
            </tr>
            <tr>
              <td style="padding:0 18px 16px 18px;font-size:13px;color:#6b7280;">Total paid</td>
              <td style="padding:0 18px 16px 18px;font-size:18px;color:#111827;font-weight:700;text-align:right;">${safeTotal}</td>
            </tr>
          </table>
        </td></tr>

        <tr><td align="center" style="padding:8px 32px 26px 32px;">
          <a href="${safeUrl}" style="display:inline-block;background:#111827;color:#ecff76;text-decoration:none;font-weight:700;padding:13px 26px;border-radius:10px;font-size:14px;letter-spacing:.01em;">View &amp; download receipt</a>
          <p style="margin:14px 0 0 0;font-size:12px;color:#6b7280;line-height:1.55;">
            Or open this link:<br/>
            <a href="${safeUrl}" style="color:#2563eb;word-break:break-all;">${safeUrl}</a>
          </p>
        </td></tr>

        <tr><td style="padding:0 32px 28px 32px;border-top:1px solid #f3f4f6;">
          <p style="margin:16px 0 0 0;font-size:12px;color:#9ca3af;line-height:1.55;">
            ${safeShop}${safeAddress ? ` &middot; ${safeAddress}` : ""}${safeContact ? ` &middot; ${safeContact}` : ""}
          </p>
          <p style="margin:8px 0 0 0;font-size:12px;color:#9ca3af;">
            This is an automated receipt. Please retain it for your records.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `Thank you, ${customerName || "Valued customer"}.`,
    "",
    `Receipt #${receiptNumber || ""}`,
    `Total paid: ${formatMoney(total, currency)}`,
    "",
    `View your receipt: ${publicReceiptUrl}`,
    "",
    `— ${shopName || "Your store"}`,
  ].join("\n");

  return { subject, html, text };
}
