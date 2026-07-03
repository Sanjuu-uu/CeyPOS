// FitSMS transactional SMS client.
// All credentials are read from process.env — never accept from request body.
//
// Docs: https://app.fitsms.lk  (Bearer-token auth, JSON, POST /api/v4/sms/send)

const FITSMS_API_BASE = (
  process.env.FITSMS_API_BASE || "https://app.fitsms.lk/api/v4"
).replace(/\/+$/, "");

function loadConfig() {
  const token = (process.env.FITSMS_TOKEN || "").trim();
  const senderId = (process.env.FITSMS_SENDER_ID || "").trim();
  // Country code without "+". Default 94 (Sri Lanka). Falsy/invalid → "94".
  const rawCc = (process.env.FITSMS_DEFAULT_COUNTRY_CODE || "94")
    .trim()
    .replace(/\D+/g, "");
  const defaultCountryCode = rawCc || "94";
  return { token, senderId, defaultCountryCode };
}

export function isFitSmsConfigured() {
  const { token, senderId } = loadConfig();
  return Boolean(token && senderId);
}

/**
 * Normalize free-form phone input to the international format FitSMS expects
 * (no "+", just digits, e.g. "94771234567"). Returns null if the input cannot
 * plausibly represent a real mobile number.
 *
 * Accepts:
 *   "0771234567"      → "94771234567"  (local LK form)
 *   "+94 77 1234567"  → "94771234567"
 *   "94771234567"     → "94771234567"
 *   "771234567"       → "94771234567"  (bare 9-digit local)
 *   "+8801712345678"  → "8801712345678"
 */
export function normalizePhoneNumber(input, overrideCountryCode) {
  const digits = String(input || "").replace(/\D+/g, "");
  if (!digits) return null;

  const cc = (overrideCountryCode
    ? String(overrideCountryCode).replace(/\D+/g, "")
    : loadConfig().defaultCountryCode) || "94";

  // Already starts with the country code at a plausible length.
  if (digits.startsWith(cc) && digits.length >= cc.length + 7) return digits;

  // Local form with leading zero ("0771234567" → "94771234567").
  if (digits.startsWith("0") && digits.length >= 9) return cc + digits.slice(1);

  // Bare 9-digit local mobile (no leading zero).
  if (digits.length === 9) return cc + digits;

  // International form without recognised country code prefix — pass through
  // if it's long enough to be valid (E.164 max 15 digits).
  if (digits.length >= 10 && digits.length <= 15) return digits;

  return null;
}

function authHeader(token) {
  return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

export async function sendFitSmsMessage({ recipient, message, expirySeconds }) {
  const { token, senderId } = loadConfig();
  if (!token || !senderId) {
    const err = new Error(
      "FitSMS not configured (missing FITSMS_TOKEN or FITSMS_SENDER_ID).",
    );
    err.code = "sms_provider_unconfigured";
    throw err;
  }
  if (!recipient) {
    const err = new Error("Missing recipient phone number");
    err.code = "invalid_recipient";
    throw err;
  }
  if (!message || typeof message !== "string") {
    const err = new Error("Missing message body");
    err.code = "invalid_message";
    throw err;
  }

  const payload = {
    recipient: String(recipient),
    sender_id: senderId.slice(0, 11),
    type: "plain",
    message,
  };

  const exp = Number(expirySeconds);
  if (Number.isFinite(exp) && exp >= 60 && exp <= 24 * 60 * 60) {
    payload.expiry_time = Math.floor(exp);
  }

  const response = await fetch(`${FITSMS_API_BASE}/sms/send`, {
    method: "POST",
    headers: {
      Authorization: authHeader(token),
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

  // FitSMS returns HTTP 200 even on logical errors — must check body.status.
  if (!response.ok || body?.status !== "success") {
    const message =
      body?.message ||
      body?.error ||
      `FitSMS HTTP ${response.status}`;
    const err = new Error(message);
    const isAuthError =
      response.status === 401 ||
      response.status === 403 ||
      String(message).toLowerCase().includes("unauthenticated");
    err.code = isAuthError ? "sms_provider_auth_failed" : "sms_provider_error";
    err.status = response.status;
    err.providerBody = body;
    throw err;
  }

  return body.data || {};
}

export async function getFitSmsBalance() {
  const { token } = loadConfig();
  if (!token) {
    const err = new Error("FitSMS token missing");
    err.code = "sms_provider_unconfigured";
    throw err;
  }
  const response = await fetch(`${FITSMS_API_BASE}/balance`, {
    method: "GET",
    headers: {
      Authorization: authHeader(token),
      Accept: "application/json",
    },
  });
  const raw = await response.text();
  let body = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    body = { raw };
  }
  if (!response.ok || body?.status !== "success") {
    const err = new Error(body?.message || `FitSMS HTTP ${response.status}`);
    err.code = "sms_provider_error";
    err.status = response.status;
    err.providerBody = body;
    throw err;
  }
  return body.data;
}
