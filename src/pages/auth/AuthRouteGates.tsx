import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import Register from "../register/Register";
import {
  resolveAccountIntent,
  getPostRegisterPath,
  persistAccountIntent,
  readOAuthPending,
  clearOAuthPending,
  clearAccountIntent,
  intentToMetadataAccountType,
  buildRegisterHref,
} from "../../lib/authFlow";

const OAUTH_WAIT_TIMEOUT_MS = 10000;
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

// Wait briefly for Clerk to activate the OAuth session, then recover to register.

function AuthLoading({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center px-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />
        <p className="mt-4 text-gray-600">{message}</p>
      </div>
    </div>
  );
}

/**
 * Register page gate.
 * Never sends users to /auth/post-oauth — that route is only valid after
 * /auth/sso-callback activates the Clerk session (same as owner login flow).
 * When signed in, go straight to the wizard: /team-onboard or /shop-wizard.
 */
export function RegisterPageGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user, isLoaded: isUserLoaded } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const finishingRef = useRef(false);
  const [oauthWaitDone, setOauthWaitDone] = useState(false);

  const intent = useMemo(
    () => resolveAccountIntent(location.search),
    [location.search],
  );
  /** Employee → /team-onboard, Owner → /shop-wizard */
  const wizardPath = getPostRegisterPath(intent);
  const oauthPending = readOAuthPending();

  useEffect(() => {
    persistAccountIntent(intent);
  }, [intent]);

  useEffect(() => {
    if (!oauthPending || isSignedIn) {
      setOauthWaitDone(true);
      return;
    }
    const timeout = window.setTimeout(() => {
      clearOAuthPending();
      setOauthWaitDone(true);
    }, OAUTH_WAIT_TIMEOUT_MS);
    setOauthWaitDone(false);
    return () => window.clearTimeout(timeout);
  }, [oauthPending, isSignedIn]);

  useEffect(() => {
    if (!isLoaded || !isUserLoaded || !isSignedIn || !user || finishingRef.current) return;

    finishingRef.current = true;

    const finish = async () => {
      clearOAuthPending();
      let metadataApplied = false;
      try {
        const metaType = intentToMetadataAccountType(intent);
        const existingType = user.unsafeMetadata?.accountType;
        if (existingType !== "team" && existingType !== "owner") {
          await withTimeout(
            user.update({
              unsafeMetadata: {
                ...(user.unsafeMetadata || {}),
                accountType: metaType,
              },
            }),
            METADATA_UPDATE_TIMEOUT_MS,
          );
        }
        metadataApplied = true;
      } catch (err) {
        console.error("RegisterPageGate: metadata update failed", err);
      }
      if (metadataApplied) {
        clearAccountIntent();
      }
      navigate(wizardPath, { replace: true });
    };

    void finish();
  }, [intent, isLoaded, isSignedIn, isUserLoaded, navigate, user, wizardPath]);

  if (!isLoaded || !isUserLoaded) {
    return <AuthLoading message="Loading registration…" />;
  }

  if (oauthPending && !isSignedIn && !oauthWaitDone) {
    return <AuthLoading message="Completing sign in…" />;
  }

  if (isSignedIn) {
    return <AuthLoading message="Setting up your account…" />;
  }

  return <Register />;
}

/** Pre-auth redirect when an unsigned user hits a wizard URL directly. */
export function PreAuthWizardRedirect({ intent }: { intent: "employee" | "owner" }) {
  return <Navigate to={buildRegisterHref(intent === "employee" ? "employee" : "owner")} replace />;
}
