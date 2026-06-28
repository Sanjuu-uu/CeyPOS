import { randomInt } from "crypto";
import {
  isFitSmsConfigured,
  normalizePhoneNumber,
  sendFitSmsMessage,
} from "./fitsms.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/** @type {Map<string, { code: string; expiresAt: number; attempts: number }>} */
const otpStore = new Map();

function otpKey(userEmail, phone) {
  return `${String(userEmail || "").toLowerCase()}::${phone}`;
}

function purgeExpired() {
  const now = Date.now();
  for (const [key, entry] of otpStore.entries()) {
    if (entry.expiresAt <= now) otpStore.delete(key);
  }
}

function generateCode() {
  return String(randomInt(100000, 999999));
}

export async function sendEmployeePhoneCode({ userEmail, phone }) {
  purgeExpired();
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) {
    const err = new Error("Invalid phone number");
    err.code = "invalid_phone";
    throw err;
  }
  if (!userEmail) {
    const err = new Error("userEmail is required");
    err.code = "invalid_request";
    throw err;
  }

  const code = generateCode();
  const key = otpKey(userEmail, normalized);
  otpStore.set(key, {
    code,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });

  if (isFitSmsConfigured()) {
    await sendFitSmsMessage({
      recipient: normalized,
      message: `Your CeyPOS verification code is ${code}. Valid for 10 minutes.`,
      expirySeconds: 600,
    });
  } else if (process.env.NODE_ENV !== "production") {
    console.info(`[dev] Employee OTP for ${userEmail}: ${code}`);
  } else {
    const err = new Error("SMS verification is not configured");
    err.code = "sms_provider_unconfigured";
    throw err;
  }

  return { ok: true, phone: normalized, devCode: process.env.NODE_ENV !== "production" ? code : undefined };
}

export function verifyEmployeePhoneCode({ userEmail, phone, code }) {
  purgeExpired();
  const normalized = normalizePhoneNumber(phone);
  if (!normalized || !code) {
    const err = new Error("Phone and code are required");
    err.code = "invalid_request";
    throw err;
  }

  const key = otpKey(userEmail, normalized);
  const entry = otpStore.get(key);
  if (!entry) {
    const err = new Error("Verification code expired or not found. Request a new code.");
    err.code = "code_expired";
    throw err;
  }

  if (entry.expiresAt <= Date.now()) {
    otpStore.delete(key);
    const err = new Error("Verification code has expired. Request a new code.");
    err.code = "code_expired";
    throw err;
  }

  entry.attempts += 1;
  if (entry.attempts > MAX_ATTEMPTS) {
    otpStore.delete(key);
    const err = new Error("Too many attempts. Request a new code.");
    err.code = "too_many_attempts";
    throw err;
  }

  if (String(code).trim() !== entry.code) {
    const err = new Error("Invalid verification code");
    err.code = "invalid_code";
    throw err;
  }

  otpStore.delete(key);
  return { ok: true, phone: normalized };
}
