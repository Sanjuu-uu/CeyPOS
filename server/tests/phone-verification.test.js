import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openGlobalVerificationDatabase } from '../src/utils/global-verification-database.js';
import { isFitSmsConfigured } from '../src/services/fitsms.js';
import { sendPhoneVerificationCode, verifyPhoneCode, getPhoneVerificationStatus } from '../src/services/phone-verification-service.js';

test('send and verify phone OTP', async (t) => {
  if (!isFitSmsConfigured()) {
    t.skip('FitSMS not configured; skipping OTP SMS send test');
    return;
  }
  const db = openGlobalVerificationDatabase();
  try {
    const userEmail = 'test@example.com';
    const phone = '0771234567';

    const sendResult = await sendPhoneVerificationCode(db, { shopId: null, userEmail, phone });
    assert.equal(sendResult.ok, true);
    assert.ok(sendResult.phone);

    const statusBefore = getPhoneVerificationStatus(db, userEmail, phone);
    console.info('DBG statusBefore:', statusBefore);
    const normalizedPhone = sendResult.phone;
    const otpRow = db.prepare(`SELECT code FROM phone_verification_otps WHERE user_email = ? AND normalized_phone = ? LIMIT 1`).get(userEmail, normalizedPhone);
    assert.ok(otpRow?.code, 'OTP row should exist after sendPhoneVerificationCode');
    assert.equal(statusBefore.verified, false);

    const verifyResult = await verifyPhoneCode(db, { shopId: null, userEmail, phone, code: otpRow.code });
    assert.equal(verifyResult.ok, true);

    const statusAfter = getPhoneVerificationStatus(db, userEmail, phone);
    assert.equal(statusAfter.verified, true);
  } finally {
    // cleanup: remove any OTP rows for this test user
    try {
      db.prepare('DELETE FROM phone_verification_otps WHERE user_email = ?').run('test@example.com');
      db.prepare('DELETE FROM phone_verification_audit WHERE user_email = ?').run('test@example.com');
    } catch (err) {
      // ignore
    }
    db.close();
  }
});
