/**
 * Professional Phone Verification Service
 *
 * Handles secure, rate-limited OTP verification with:
 * - Database persistence (survives server restarts)
 * - Rate limiting (prevents SMS spam/DoS)
 * - Audit logging (tracks all verification attempts)
 * - Graceful error handling
 * - Production-grade security
 */

import { randomInt } from "crypto";
import {
  isFitSmsConfigured,
  normalizePhoneNumber,
  sendFitSmsMessage,
} from "./fitsms.js";

// Configuration
const OTP_TTL_SECONDS = 10 * 60; // 10 minutes
const OTP_LENGTH = 6;
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_SECONDS = 60; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 3; // Max 3 SMS per minute per phone
const RATE_LIMIT_LOCKOUT_SECONDS = 15 * 60; // 15 minute lockout after rate limit

function isDevOtpEnabled() {
  if (process.env.NODE_ENV === "production") return false;
  return ["1", "true", "yes", "on"].includes(
    String(process.env.FITSMS_FORCE_DEV_OTP || "").trim().toLowerCase(),
  );
}

/**
 * Generate a cryptographically secure random 6-digit OTP
 */
function generateOTP() {
  return String(randomInt(100000, 999999));
}

/**
 * Get current Unix timestamp in seconds
 */
function nowUnix() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Create audit log entry
 * @private
 */
function logAudit(db, {
  shopId,
  userEmail,
  normalizedPhone,
  action,
  result,
  errorCode = null,
  errorMessage = null,
  ipAddress = null,
  userAgent = null,
}) {
  try {
    const stmt = db.prepare(`
      INSERT INTO phone_verification_audit
      (shop_id, user_email, normalized_phone, action, result, error_code, error_message, ip_address, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    stmt.run(
      shopId || null,
      userEmail,
      normalizedPhone,
      action,
      result,
      errorCode,
      errorMessage,
      ipAddress,
      userAgent
    );
  } catch (err) {
    console.error("[PhoneVerification] Audit log failed:", err.message);
  }
}

/**
 * Check rate limiting for phone number
 * Returns { allowed: boolean, retryAfterSeconds: number | null }
 * @private
 */
function checkRateLimit(db, normalizedPhone) {
  const now = nowUnix();
  
  try {
    // Get the active rate limit window
    const rateLimitCheck = db.prepare(`
      SELECT rate_limit_expires_at FROM phone_verification_otps
      WHERE normalized_phone = ? AND rate_limit_expires_at > ?
      LIMIT 1
    `).get(normalizedPhone, now);

    if (rateLimitCheck?.rate_limit_expires_at) {
      const retryAfter = rateLimitCheck.rate_limit_expires_at - now;
      return {
        allowed: false,
        retryAfterSeconds: retryAfter,
        locked: true,
      };
    }

    // Count SMS requests in the last minute
    const windowStart = now - RATE_LIMIT_WINDOW_SECONDS;
    const recentCount = db.prepare(`
      SELECT COUNT(*) as count FROM phone_verification_otps
      WHERE normalized_phone = ?
        AND created_at > datetime('now', '-' || ? || ' seconds')
        AND status = 'pending'
    `).get(normalizedPhone, RATE_LIMIT_WINDOW_SECONDS);

    if (recentCount.count >= RATE_LIMIT_MAX_REQUESTS) {
      // Set rate limit lockout
      const lockoutExpiresAt = now + RATE_LIMIT_LOCKOUT_SECONDS;
      db.prepare(`
        UPDATE phone_verification_otps
        SET rate_limit_expires_at = datetime('now', '+' || ? || ' seconds')
        WHERE normalized_phone = ? AND status = 'pending'
        LIMIT 1
      `).run(RATE_LIMIT_LOCKOUT_SECONDS, normalizedPhone);

      return {
        allowed: false,
        retryAfterSeconds: RATE_LIMIT_LOCKOUT_SECONDS,
        locked: false,
      };
    }

    return { allowed: true };
  } catch (err) {
    console.error("[PhoneVerification] Rate limit check failed:", err.message);
    // Fail open on database errors - allow the request
    return { allowed: true };
  }
}

/**
 * Clean up expired OTP records
 * @private
 */
function cleanupExpired(db) {
  try {
    db.prepare(`
      DELETE FROM phone_verification_otps
      WHERE expires_at < datetime('now')
        AND status IN ('pending', 'failed')
    `).run();
  } catch (err) {
    console.error("[PhoneVerification] Cleanup failed:", err.message);
  }
}

/**
 * Send OTP via SMS
 *
 * @param {Object} db - Database connection
 * @param {Object} params - Parameters
 * @param {string} params.shopId - Shop ID
 * @param {string} params.userEmail - User's email
 * @param {string} params.phone - Phone number (any format)
 * @param {string} [params.ipAddress] - Client IP for audit logging
 * @param {string} [params.userAgent] - Client user agent for audit logging
 * @returns {Promise<{ok: boolean, phone: string, devCode?: string}>}
 * @throws {Error} with code property
 */
export async function sendPhoneVerificationCode(db, {
  shopId,
  userEmail,
  phone,
  ipAddress = null,
  userAgent = null,
}) {
  const action = "SEND_OTP";
  
  try {
    // Input validation
    if (!userEmail || typeof userEmail !== "string") {
      const err = new Error("Invalid user email");
      err.code = "INVALID_EMAIL";
      logAudit(db, {
        shopId,
        userEmail: userEmail || "unknown",
        normalizedPhone: phone || "unknown",
        action,
        result: "FAILED",
        errorCode: "INVALID_EMAIL",
        errorMessage: err.message,
        ipAddress,
        userAgent,
      });
      throw err;
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone) {
      const err = new Error("Invalid phone number format");
      err.code = "INVALID_PHONE_FORMAT";
      logAudit(db, {
        shopId,
        userEmail,
        normalizedPhone: phone || "unknown",
        action,
        result: "FAILED",
        errorCode: "INVALID_PHONE_FORMAT",
        errorMessage: err.message,
        ipAddress,
        userAgent,
      });
      throw err;
    }

    // Clean up expired OTPs
    cleanupExpired(db);

    // Check rate limiting
    const rateLimit = checkRateLimit(db, normalizedPhone);
    if (!rateLimit.allowed) {
      const err = new Error(
        rateLimit.locked
          ? "Phone verification temporarily locked due to too many attempts. Please try again later."
          : `Too many verification requests. Please wait ${Math.ceil(rateLimit.retryAfterSeconds / 60)} minute(s) before requesting a new code.`
      );
      err.code = "RATE_LIMIT_EXCEEDED";
      err.retryAfterSeconds = rateLimit.retryAfterSeconds;
      logAudit(db, {
        shopId,
        userEmail,
        normalizedPhone,
        action,
        result: "RATE_LIMITED",
        errorCode: "RATE_LIMIT_EXCEEDED",
        errorMessage: err.message,
        ipAddress,
        userAgent,
      });
      throw err;
    }

    // Generate OTP
    const code = generateOTP();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_TTL_SECONDS * 1000);
    const createdAtIso = now.toISOString();
    const expiresAtIso = expiresAt.toISOString();

    // Store OTP in database using ISO timestamps (avoid SQLite datetime parsing/timezone issues)
    try {
      db.prepare(`
        INSERT INTO phone_verification_otps
        (shop_id, user_email, normalized_phone, code, status, failed_attempts, created_at, expires_at)
        VALUES (?, ?, ?, ?, 'pending', 0, ?, ?)
        ON CONFLICT(user_email, normalized_phone) DO UPDATE SET
          code = excluded.code,
          status = 'pending',
          failed_attempts = 0,
          created_at = excluded.created_at,
          expires_at = excluded.expires_at,
          rate_limit_expires_at = NULL
      `).run(shopId, userEmail, normalizedPhone, code, createdAtIso, expiresAtIso);
    } catch (err) {
      console.error("[PhoneVerification] Database insert failed:", err.message);
      const error = new Error("Failed to generate verification code");
      error.code = "OTP_GENERATION_FAILED";
      logAudit(db, {
        shopId,
        userEmail,
        normalizedPhone,
        action,
        result: "FAILED",
        errorCode: "OTP_GENERATION_FAILED",
        errorMessage: error.message,
        ipAddress,
        userAgent,
      });
      throw error;
    }

    // Local/dev escape hatch: keep the exact same persistence/rate-limit/verify
    // path, but return the code to the browser instead of sending paid SMS.
    if (isDevOtpEnabled()) {
      logAudit(db, {
        shopId,
        userEmail,
        normalizedPhone,
        action,
        result: "SUCCESS_DEV_CODE",
        ipAddress,
        userAgent,
      });

      return {
        ok: true,
        phone: normalizedPhone,
        devCode: code,
        devMode: true,
      };
    }

    // Send SMS via FitSMS. Actual SMS delivery is required for production workflows.
    if (!isFitSmsConfigured()) {
      const error = new Error("Phone verification service not configured. Please contact support.");
      error.code = "SMS_PROVIDER_UNCONFIGURED";
      logAudit(db, {
        shopId,
        userEmail,
        normalizedPhone,
        action,
        result: "FAILED",
        errorCode: "SMS_PROVIDER_UNCONFIGURED",
        errorMessage: error.message,
        ipAddress,
        userAgent,
      });
      throw error;
    }

    try {
      await sendFitSmsMessage({
        recipient: normalizedPhone,
        message: `Your CeyPOS verification code is ${code}. Valid for ${OTP_TTL_SECONDS / 60} minutes. Do not share this code.`,
        expirySeconds: OTP_TTL_SECONDS,
      });
      logAudit(db, {
        shopId,
        userEmail,
        normalizedPhone,
        action,
        result: "SUCCESS_SMS_SENT",
        ipAddress,
        userAgent,
      });
    } catch (smsErr) {
      console.error("[PhoneVerification] SMS sending failed:", smsErr?.message || smsErr, smsErr?.providerBody || null);
      db.prepare(`
        UPDATE phone_verification_otps
        SET status = 'failed'
        WHERE user_email = ? AND normalized_phone = ?
      `).run(userEmail, normalizedPhone);

      const error = new Error("Failed to send verification code. Please try again.");
      error.code =
        smsErr?.code === "sms_provider_auth_failed"
          ? "SMS_PROVIDER_AUTH_FAILED"
          : "SMS_SENDING_FAILED";
      logAudit(db, {
        shopId,
        userEmail,
        normalizedPhone,
        action,
        result: "FAILED",
        errorCode: error.code,
        errorMessage: `SMS Provider: ${smsErr?.message || String(smsErr)}`,
        ipAddress,
        userAgent,
      });
      throw error;
    }

    return {
      ok: true,
      phone: normalizedPhone,
    };
  } catch (err) {
    // Re-throw with original code if already set
    if (err.code) throw err;
    
    // Generic error handler
    const error = new Error("Verification code sending failed");
    error.code = "UNKNOWN_ERROR";
    throw error;
  }
}

/**
 * Verify OTP code
 *
 * @param {Object} db - Database connection
 * @param {Object} params - Parameters
 * @param {string} params.shopId - Shop ID
 * @param {string} params.userEmail - User's email
 * @param {string} params.phone - Phone number (any format)
 * @param {string} params.code - Verification code to verify
 * @param {string} [params.ipAddress] - Client IP for audit logging
 * @param {string} [params.userAgent] - Client user agent for audit logging
 * @returns {Promise<{ok: boolean, phone: string}>}
 * @throws {Error} with code property
 */
export async function verifyPhoneCode(db, {
  shopId,
  userEmail,
  phone,
  code,
  ipAddress = null,
  userAgent = null,
}) {
  const action = "VERIFY_OTP";
  
  try {
    // Input validation
    if (!userEmail || typeof userEmail !== "string") {
      const err = new Error("Invalid user email");
      err.code = "INVALID_EMAIL";
      throw err;
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone) {
      const err = new Error("Invalid phone number format");
      err.code = "INVALID_PHONE_FORMAT";
      throw err;
    }

    if (!code || typeof code !== "string" || !/^\d{6}$/.test(code.trim())) {
      const err = new Error("Invalid verification code format");
      err.code = "INVALID_CODE_FORMAT";
      logAudit(db, {
        shopId,
        userEmail,
        normalizedPhone,
        action,
        result: "FAILED",
        errorCode: "INVALID_CODE_FORMAT",
        errorMessage: err.message,
        ipAddress,
        userAgent,
      });
      throw err;
    }

    // Clean up expired OTPs
    cleanupExpired(db);

    // Retrieve OTP record
    const otpRecord = db.prepare(`
      SELECT id, code, status, failed_attempts, expires_at, verified_at
      FROM phone_verification_otps
      WHERE user_email = ? AND normalized_phone = ?
      LIMIT 1
    `).get(userEmail, normalizedPhone);

    if (!otpRecord) {
      const err = new Error("No verification code found. Please request a new code.");
      err.code = "OTP_NOT_FOUND";
      logAudit(db, {
        shopId,
        userEmail,
        normalizedPhone,
        action,
        result: "FAILED",
        errorCode: "OTP_NOT_FOUND",
        errorMessage: err.message,
        ipAddress,
        userAgent,
      });
      throw err;
    }

    // Check if already verified
    if (otpRecord.status === "verified" && otpRecord.verified_at) {
      const err = new Error("Phone number already verified");
      err.code = "ALREADY_VERIFIED";
      logAudit(db, {
        shopId,
        userEmail,
        normalizedPhone,
        action,
        result: "ALREADY_VERIFIED",
        ipAddress,
        userAgent,
      });
      throw err;
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(otpRecord.expires_at);
    if (now > expiresAt) {
      db.prepare(`
        UPDATE phone_verification_otps
        SET status = 'expired'
        WHERE user_email = ? AND normalized_phone = ?
      `).run(userEmail, normalizedPhone);
      
      const err = new Error("Verification code expired. Please request a new code.");
      err.code = "OTP_EXPIRED";
      logAudit(db, {
        shopId,
        userEmail,
        normalizedPhone,
        action,
        result: "FAILED",
        errorCode: "OTP_EXPIRED",
        errorMessage: err.message,
        ipAddress,
        userAgent,
      });
      throw err;
    }

    // Check attempt limit
    if (otpRecord.failed_attempts >= MAX_ATTEMPTS) {
      db.prepare(`
        UPDATE phone_verification_otps
        SET status = 'locked'
        WHERE user_email = ? AND normalized_phone = ?
      `).run(userEmail, normalizedPhone);
      
      const err = new Error("Too many failed attempts. Please request a new code.");
      err.code = "TOO_MANY_ATTEMPTS";
      logAudit(db, {
        shopId,
        userEmail,
        normalizedPhone,
        action,
        result: "FAILED",
        errorCode: "TOO_MANY_ATTEMPTS",
        errorMessage: err.message,
        ipAddress,
        userAgent,
      });
      throw err;
    }

    // Verify code
    if (code.trim() !== otpRecord.code) {
      const newAttempts = otpRecord.failed_attempts + 1;
      db.prepare(`
        UPDATE phone_verification_otps
        SET failed_attempts = ?
        WHERE user_email = ? AND normalized_phone = ?
      `).run(newAttempts, userEmail, normalizedPhone);
      
      const err = new Error(
        `Invalid verification code. ${MAX_ATTEMPTS - newAttempts} attempt(s) remaining.`
      );
      err.code = "INVALID_CODE";
      err.attemptsRemaining = MAX_ATTEMPTS - newAttempts;
      logAudit(db, {
        shopId,
        userEmail,
        normalizedPhone,
        action,
        result: "FAILED",
        errorCode: "INVALID_CODE",
        errorMessage: err.message,
        ipAddress,
        userAgent,
      });
      throw err;
    }

    // Code is valid - mark as verified
    db.prepare(`
      UPDATE phone_verification_otps
      SET status = 'verified', verified_at = datetime('now'), failed_attempts = 0
      WHERE user_email = ? AND normalized_phone = ?
    `).run(userEmail, normalizedPhone);

    logAudit(db, {
      shopId,
      userEmail,
      normalizedPhone,
      action,
      result: "SUCCESS",
      ipAddress,
      userAgent,
    });

    return {
      ok: true,
      phone: normalizedPhone,
    };
  } catch (err) {
    // Re-throw with original code if already set
    if (err.code) throw err;
    
    // Generic error handler
    logAudit(db, {
      shopId,
      userEmail: userEmail || "unknown",
      normalizedPhone: phone || "unknown",
      action,
      result: "FAILED",
      errorCode: "UNKNOWN_ERROR",
      errorMessage: err.message,
      ipAddress,
      userAgent,
    });
    
    const error = new Error("Verification failed");
    error.code = "UNKNOWN_ERROR";
    throw error;
  }
}

/**
 * Check if a phone number is verified
 *
 * @param {Object} db - Database connection
 * @param {string} userEmail - User's email
 * @param {string} phone - Phone number (any format)
 * @returns {boolean} true if verified
 */
export function isPhoneVerified(db, userEmail, phone) {
  try {
    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone) return false;

    const result = db.prepare(`
      SELECT status FROM phone_verification_otps
      WHERE user_email = ? AND normalized_phone = ? AND status = 'verified'
      LIMIT 1
    `).get(userEmail, normalizedPhone);

    return Boolean(result);
  } catch (err) {
    console.error("[PhoneVerification] Verification check failed:", err.message);
    return false;
  }
}

/**
 * Get verification status for a phone number
 *
 * @param {Object} db - Database connection
 * @param {string} userEmail - User's email
 * @param {string} phone - Phone number (any format)
 * @returns {Object} status object
 */
export function getPhoneVerificationStatus(db, userEmail, phone) {
  try {
    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone) return { verified: false, status: "invalid_phone" };

    cleanupExpired(db);

    const result = db.prepare(`
      SELECT status, verified_at, expires_at, failed_attempts
      FROM phone_verification_otps
      WHERE user_email = ? AND normalized_phone = ?
      LIMIT 1
    `).get(userEmail, normalizedPhone);

    if (!result) {
      return { verified: false, status: "not_started" };
    }

    return {
      verified: result.status === "verified",
      status: result.status,
      verifiedAt: result.verified_at,
      expiresAt: result.expires_at,
      failedAttempts: result.failed_attempts,
    };
  } catch (err) {
    console.error("[PhoneVerification] Status check failed:", err.message);
    return { verified: false, status: "error", error: err.message };
  }
}

/**
 * Clean up all OTP records older than 24 hours (maintenance task)
 *
 * @param {Object} db - Database connection
 */
export function cleanupOldRecords(db) {
  try {
    const result = db.prepare(`
      DELETE FROM phone_verification_otps
      WHERE created_at < datetime('now', '-24 hours')
        AND status IN ('verified', 'expired', 'failed', 'locked')
    `).run();

    console.info(`[PhoneVerification] Cleaned up ${result.changes} old OTP records`);
  } catch (err) {
    console.error("[PhoneVerification] Cleanup failed:", err.message);
  }
}
