import { sendZeptoMailEmail, isZeptoMailConfigured } from "./zeptomail.js";

function logNotification(event, detail = {}) {
  console.log(`[notify] ${event}`, detail);
}

export async function notifyOwnerTerminalPairingPending({
  ownerEmail,
  ownerName,
  shopName,
  memberName,
  memberEmail,
}) {
  if (!ownerEmail) return { sent: false, reason: "no_owner_email" };

  const subject = `[CeyPoS] Register terminal approval needed — ${memberName || memberEmail}`;
  const htmlBody = `
    <p>Hello ${ownerName || "Shop Owner"},</p>
    <p><strong>${memberName || memberEmail}</strong> requested to connect a register terminal to <strong>${shopName || "your shop"}</strong>.</p>
    <p>Open the CeyPoS Sessions page on your primary terminal to approve or reject this request.</p>
    <p style="color:#666;font-size:12px;">This is an automated security notification from CeyPoS.</p>
  `.trim();
  const textBody = `${memberName || memberEmail} requested register terminal access for ${shopName || "your shop"}. Approve from Sessions on your primary terminal.`;

  if (!isZeptoMailConfigured()) {
    logNotification("pairing_pending_email_skipped", { ownerEmail, memberEmail });
    return { sent: false, reason: "email_not_configured" };
  }

  try {
    await sendZeptoMailEmail({
      to: ownerEmail,
      toName: ownerName || ownerEmail,
      subject,
      htmlBody,
      textBody,
    });
    return { sent: true };
  } catch (err) {
    logNotification("pairing_pending_email_failed", { error: err.message, ownerEmail });
    return { sent: false, reason: err.message };
  }
}

export async function notifyOwnerTerminalPaired({
  ownerEmail,
  ownerName,
  shopName,
  memberName,
  memberEmail,
  terminalLabel,
}) {
  if (!ownerEmail) return { sent: false, reason: "no_owner_email" };

  const subject = `[CeyPoS] Register terminal connected — ${terminalLabel || "Register"}`;
  const htmlBody = `
    <p>Hello ${ownerName || "Shop Owner"},</p>
    <p><strong>${memberName || memberEmail}</strong> was approved and connected to <strong>${terminalLabel || "a register terminal"}</strong> at ${shopName || "your shop"}.</p>
    <p>If this was not you, revoke the terminal immediately from Sessions.</p>
  `.trim();

  if (!isZeptoMailConfigured()) {
    logNotification("pairing_approved_email_skipped", { ownerEmail, memberEmail });
    return { sent: false, reason: "email_not_configured" };
  }

  try {
    await sendZeptoMailEmail({
      to: ownerEmail,
      toName: ownerName || ownerEmail,
      subject,
      htmlBody,
      textBody: `${memberName || memberEmail} connected to ${terminalLabel || "register terminal"}.`,
    });
    return { sent: true };
  } catch (err) {
    logNotification("pairing_approved_email_failed", { error: err.message, ownerEmail });
    return { sent: false, reason: err.message };
  }
}
