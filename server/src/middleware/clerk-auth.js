import { createClerkClient, getAuth } from "@clerk/express";
import { normalizeEmail } from "../services/team-service.js";

let clerkClient = null;

function getClerkClient() {
  if (!process.env.CLERK_SECRET_KEY) {
    return null;
  }
  if (!clerkClient) {
    clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });
  }
  return clerkClient;
}

export function isClerkAuthEnabled() {
  return Boolean(process.env.CLERK_SECRET_KEY);
}

async function resolveSessionEmail(auth) {
  const claimEmail =
    (typeof auth?.sessionClaims?.email === "string" && auth.sessionClaims.email) ||
    (typeof auth?.sessionClaims?.primary_email === "string" &&
      auth.sessionClaims.primary_email) ||
    null;

  if (claimEmail) {
    return normalizeEmail(claimEmail);
  }

  const client = getClerkClient();
  if (!client || !auth?.userId) {
    return null;
  }

  const user = await client.users.getUser(auth.userId);
  const primary = user.emailAddresses?.find(
    (entry) => entry.id === user.primaryEmailAddressId,
  );
  return normalizeEmail(
    primary?.emailAddress || user.emailAddresses?.[0]?.emailAddress || "",
  );
}

/**
 * Verifies Clerk session (Bearer token or session cookie) and binds
 * req.userEmail / req.clerkUserId from the authenticated identity.
 */
export async function requireClerkSession(req, res, next) {
  if (!isClerkAuthEnabled()) {
    if (process.env.NODE_ENV === "production") {
      return res.status(503).json({ error: "Authentication service unavailable" });
    }
    const fallbackEmail = normalizeEmail(
      req.body?.userEmail || req.query?.userEmail || "",
    );
    if (fallbackEmail) {
      req.userEmail = fallbackEmail;
    }
    req.clerkUserId = req.body?.clerkUserId || null;
    return next();
  }

  const auth = getAuth(req);
  if (!auth?.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const verifiedEmail = await resolveSessionEmail(auth);
    if (!verifiedEmail) {
      return res.status(401).json({ error: "Unable to resolve authenticated user email" });
    }

    const claimedEmail = normalizeEmail(
      req.body?.userEmail || req.query?.userEmail || "",
    );
    if (claimedEmail && claimedEmail !== verifiedEmail) {
      return res.status(403).json({
        error: "userEmail does not match authenticated session",
      });
    }

    req.clerkUserId = auth.userId;
    req.verifiedUserEmail = verifiedEmail;
    req.userEmail = verifiedEmail;
    next();
  } catch (err) {
    console.error("Clerk auth failed:", err?.message || err);
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}

/**
 * Optional auth — attaches verified email when present but does not reject.
 */
export async function attachClerkSession(req, _res, next) {
  if (!isClerkAuthEnabled()) {
    return next();
  }

  const auth = getAuth(req);
  if (!auth?.userId) {
    return next();
  }

  try {
    const verifiedEmail = await resolveSessionEmail(auth);
    if (verifiedEmail) {
      req.clerkUserId = auth.userId;
      req.verifiedUserEmail = verifiedEmail;
      req.userEmail = verifiedEmail;
    }
  } catch {
    // ignore — route may still allow anonymous access
  }
  next();
}
