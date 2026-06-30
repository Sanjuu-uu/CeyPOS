/**
 * Employee Phone Verification (Backward Compatibility Layer)
 *
 * This module provides a backward-compatible interface to the professional
 * phone-verification-service. All new implementations should use
 * phone-verification-service directly.
 *
 * DEPRECATED: Use phone-verification-service.js instead
 */

import {
  sendPhoneVerificationCode,
  verifyPhoneCode,
} from "./phone-verification-service.js";

/**
 * @deprecated Use phone-verification-service.sendPhoneVerificationCode instead
 */
export async function sendEmployeePhoneCode(db, { userEmail, phone, shopId }) {
  return sendPhoneVerificationCode(db, {
    shopId: shopId || "default",
    userEmail,
    phone,
  });
}

/**
 * @deprecated Use phone-verification-service.verifyPhoneCode instead
 */
export async function verifyEmployeePhoneCode(db, { userEmail, phone, code, shopId }) {
  return verifyPhoneCode(db, {
    shopId: shopId || "default",
    userEmail,
    phone,
    code,
  });
}
