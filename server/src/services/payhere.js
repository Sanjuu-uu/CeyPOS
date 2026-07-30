import crypto from "crypto";

const SANDBOX = String(process.env.PAYHERE_MODE || "sandbox").toLowerCase() !== "live";

export const PAYHERE_CHECKOUT_URL = SANDBOX
  ? "https://sandbox.payhere.lk/pay/checkout"
  : "https://www.payhere.lk/pay/checkout";

const PAYHERE_API_BASE = SANDBOX
  ? "https://sandbox.payhere.lk/merchant/v1"
  : "https://www.payhere.lk/merchant/v1";

export const PAYHERE_MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID || "";
const MERCHANT_SECRET = process.env.PAYHERE_MERCHANT_SECRET || "";
const APP_ID = process.env.PAYHERE_APP_ID || "";
const APP_SECRET = process.env.PAYHERE_APP_SECRET || "";

export function isPayHereConfigured() {
  return Boolean(PAYHERE_MERCHANT_ID && MERCHANT_SECRET);
}

export function isPayHereApiConfigured() {
  return Boolean(APP_ID && APP_SECRET);
}

export function isSandbox() {
  return SANDBOX;
}

function md5Upper(value) {
  return crypto.createHash("md5").update(String(value), "utf8").digest("hex").toUpperCase();
}

/** PayHere requires amounts as a plain decimal with exactly 2 places, no separators. */
export function formatAmount(amount) {
  return Number(amount).toFixed(2);
}

/**
 * Signs an outgoing checkout request.
 * Must only ever run server-side — it depends on the merchant secret.
 */
export function generateCheckoutHash({ orderId, amount, currency }) {
  if (!isPayHereConfigured()) {
    throw new Error("PayHere is not configured");
  }
  return md5Upper(
    PAYHERE_MERCHANT_ID + orderId + formatAmount(amount) + currency + md5Upper(MERCHANT_SECRET),
  );
}

/**
 * Verifies an inbound payment notification actually came from PayHere.
 *
 * `payhere_amount` is deliberately used as the raw string PayHere sent rather
 * than a reformatted number — re-rounding it here would break the checksum.
 */
export function verifyNotification(body) {
  if (!isPayHereConfigured()) return false;

  const merchantId = body?.merchant_id;
  const orderId = body?.order_id;
  const amount = body?.payhere_amount;
  const currency = body?.payhere_currency;
  const statusCode = body?.status_code;
  const md5sig = body?.md5sig;

  if (!merchantId || !orderId || !amount || !currency || statusCode === undefined || !md5sig) {
    return false;
  }
  if (String(merchantId) !== String(PAYHERE_MERCHANT_ID)) {
    return false;
  }

  const local = md5Upper(
    String(merchantId) +
      String(orderId) +
      String(amount) +
      String(currency) +
      String(statusCode) +
      md5Upper(MERCHANT_SECRET),
  );

  // Constant-time compare so a mismatching signature can't be probed by timing.
  const a = Buffer.from(local, "utf8");
  const b = Buffer.from(String(md5sig).toUpperCase(), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// PayHere access tokens are short-lived (~10 min). Cache and refresh on demand.
let cachedToken = null;
let cachedTokenExpiry = 0;

async function getAccessToken() {
  if (!isPayHereApiConfigured()) {
    throw new Error("PayHere merchant API credentials are not configured");
  }
  if (cachedToken && Date.now() < cachedTokenExpiry) {
    return cachedToken;
  }

  const authorization = Buffer.from(`${APP_ID}:${APP_SECRET}`, "utf8").toString("base64");
  const response = await fetch(`${PAYHERE_API_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.access_token) {
    throw new Error(data?.error_description || "Failed to obtain PayHere access token");
  }

  cachedToken = data.access_token;
  // Refresh 30s early to avoid racing the expiry.
  cachedTokenExpiry = Date.now() + Math.max(0, (Number(data.expires_in) || 600) - 30) * 1000;
  return cachedToken;
}

async function payhereApi(path, { method = "GET", body } = {}) {
  const token = await getAccessToken();
  const response = await fetch(`${PAYHERE_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => null);
  if (data?.error === "invalid_token") {
    // Force a refresh on the next call rather than serving a dead token.
    cachedToken = null;
    cachedTokenExpiry = 0;
    throw new Error(data.error_description || "PayHere access token rejected");
  }
  if (!response.ok) {
    throw new Error(data?.msg || `PayHere API request failed (${response.status})`);
  }
  return data;
}

export function cancelSubscription(subscriptionId) {
  return payhereApi("/subscription/cancel", {
    method: "POST",
    body: { subscription_id: Number(subscriptionId) },
  });
}

export function retrySubscription(subscriptionId) {
  return payhereApi("/subscription/retry", {
    method: "POST",
    body: { subscription_id: Number(subscriptionId) },
  });
}

export function listSubscriptionPayments(subscriptionId) {
  return payhereApi(`/subscription/${encodeURIComponent(subscriptionId)}/payments`);
}
