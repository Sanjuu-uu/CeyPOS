// ZeptoMail transactional email client.
// All credentials are read from process.env — never hard-code or accept from the request body.

const ZEPTOMAIL_API_URL =
  (process.env.ZEPTOMAIL_API_URL || "https://api.zeptomail.com/v1.1/email").trim();

function loadConfig() {
  const token = (process.env.ZEPTOMAIL_TOKEN || "").trim();
  const fromEmail = (process.env.ZEPTOMAIL_FROM_EMAIL || "").trim();
  const fromName = (process.env.ZEPTOMAIL_FROM_NAME || "CeyPOS Receipts").trim();
  return { token, fromEmail, fromName };
}

export function isZeptoMailConfigured() {
  const { token, fromEmail } = loadConfig();
  return Boolean(token && fromEmail);
}

function buildAuthHeader(token) {
  // ZeptoMail accepts either the bare key or the prefixed form.
  return token.startsWith("Zoho-enczapikey")
    ? token
    : `Zoho-enczapikey ${token}`;
}

export async function sendZeptoMailEmail({
  to,
  toName,
  subject,
  htmlBody,
  textBody,
  replyTo,
}) {
  const { token, fromEmail, fromName } = loadConfig();
  if (!token || !fromEmail) {
    const err = new Error(
      "ZeptoMail not configured (missing ZEPTOMAIL_TOKEN or ZEPTOMAIL_FROM_EMAIL)."
    );
    err.code = "email_provider_unconfigured";
    throw err;
  }
  if (!to || typeof to !== "string") {
    const err = new Error("Missing recipient email");
    err.code = "invalid_recipient";
    throw err;
  }

  const payload = {
    from: { address: fromEmail, name: fromName },
    to: [{ email_address: { address: to, name: toName || to } }],
    subject: String(subject || "").slice(0, 250),
    htmlbody: htmlBody,
  };
  if (textBody) payload.textbody = textBody;
  if (replyTo) payload.reply_to = [{ address: replyTo }];

  const response = await fetch(ZEPTOMAIL_API_URL, {
    method: "POST",
    headers: {
      Authorization: buildAuthHeader(token),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  let body = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    body = { raw };
  }

  if (!response.ok) {
    const message =
      body?.message ||
      body?.error?.message ||
      body?.error?.details?.[0]?.message ||
      `ZeptoMail HTTP ${response.status}`;
    const err = new Error(message);
    err.code = "email_provider_error";
    err.status = response.status;
    err.providerBody = body;
    throw err;
  }

  return body;
}
