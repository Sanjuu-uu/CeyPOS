import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import {
  persistAccountIntent,
  readAccountIntent,
  getPostRegisterPath,
  intentToMetadataAccountType,
  clearAccountIntent,
  sanitizeRedirectTarget,
  clearOAuthPending,
  OAUTH_JUST_COMPLETED_KEY,
  buildRegisterHref,
  type AccountIntent,
} from "../../lib/authFlow";
import { APP_ROUTES } from "../../lib/routes";

// Poll interval while waiting for Clerk session activation
const POLL_MS = 250;
const SESSION_WAIT_TIMEOUT_MS = 10000;
const METADATA_UPDATE_TIMEOUT_MS = 2500;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new Error(`Timed out after ${ms}ms`)),
      ms,
    );
    promise
      .then(resolve, reject)
      .finally(() => window.clearTimeout(timeout));
  });
}

/**
 * Runs once after /auth/sso-callback activates the Clerk session.
 * Employee destination: /team-onboard
 * Owner destination:     /shop-wizard
 */
export default function PostOAuthRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user, isLoaded: isUserLoaded } = useUser();
  const location = useLocation();
  const finishedRef = useRef(false);
  const startedAtRef = useRef(Date.now());
  const intentRef = useRef<AccountIntent>("owner");
  const destinationRef = useRef(APP_ROUTES.shopWizard);

  const params = new URLSearchParams(location.search);
  const accountParam = params.get("account");
  const intent: AccountIntent =
    accountParam === "employee" || accountParam === "team"
      ? "employee"
      : accountParam === "owner"
        ? "owner"
        : readAccountIntent() || "owner";
  const destination = sanitizeRedirectTarget(
    params.get("redirect"),
    getPostRegisterPath(intent),
  );

  intentRef.current = intent;
  destinationRef.current = destination;

  useEffect(() => {
    persistAccountIntent(intent);
  }, [intent]);

  useEffect(() => {
    if (finishedRef.current) return;

    let cancelled = false;
    let timer: number | undefined;

    const finish = async (activeUser: NonNullable<typeof user>) => {
      if (finishedRef.current || cancelled) return;
      finishedRef.current = true;
      clearOAuthPending();

      let metadataApplied = false;
      try {
        const metaType = intentToMetadataAccountType(intentRef.current);
        const existingType = activeUser.unsafeMetadata?.accountType;
        if (existingType !== "team" && existingType !== "owner") {
          await withTimeout(
            activeUser.update({
              unsafeMetadata: {
                ...(activeUser.unsafeMetadata || {}),
                accountType: metaType,
              },
            }),
            METADATA_UPDATE_TIMEOUT_MS,
          );
        }
        metadataApplied = true;
      } catch (err) {
        console.error("PostOAuthRedirect: metadata update failed", err);
      }

      if (metadataApplied) {
        clearAccountIntent();
      }
      sessionStorage.setItem(OAUTH_JUST_COMPLETED_KEY, String(Date.now()));
      window.location.replace(destinationRef.current);
    };

    const poll = () => {
      if (finishedRef.current || cancelled) return;

      const hasSession = Boolean(isSignedIn && user);

      if (hasSession && user) {
        void finish(user as NonNullable<typeof user>);
        return;
      }

      const authHydrated = isLoaded && isUserLoaded;
      const timedOut =
        Date.now() - startedAtRef.current > SESSION_WAIT_TIMEOUT_MS;

      if (authHydrated && !isSignedIn && timedOut) {
        finishedRef.current = true;
        clearOAuthPending();
        window.location.replace(buildRegisterHref(intentRef.current));
        return;
      }

      timer = window.setTimeout(poll, POLL_MS);
    };

    const boot = async () => {
      if (!isLoaded || !isUserLoaded) {
        timer = window.setTimeout(() => void boot(), POLL_MS);
        return;
      }
      poll();
    };

    void boot();


    return () => {
      cancelled = true;
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [isLoaded, isSignedIn, isUserLoaded, user]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center px-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />
        <p className="mt-4 text-gray-600">Setting up your account…</p>
      </div>
    </div>
  );
}
