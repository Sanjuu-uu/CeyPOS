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

const OAUTH_WAIT_MS = 15000;

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
  const { user } = useUser();
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
    setOauthWaitDone(false);
    const timer = window.setTimeout(() => {
      clearOAuthPending();
      setOauthWaitDone(true);
    }, OAUTH_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [oauthPending, isSignedIn]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user || finishingRef.current) return;

    finishingRef.current = true;

    const finish = async () => {
      clearOAuthPending();
      try {
        const metaType = intentToMetadataAccountType(intent);
        const existingType = user.unsafeMetadata?.accountType;
        if (existingType !== "team" && existingType !== "owner") {
          await user.update({
            unsafeMetadata: {
              ...(user.unsafeMetadata || {}),
              accountType: metaType,
            },
          });
        }
      } catch (err) {
        console.error("RegisterPageGate: metadata update failed", err);
      }
      clearAccountIntent();
      navigate(wizardPath, { replace: true });
    };

    void finish();
  }, [intent, isLoaded, isSignedIn, navigate, user, wizardPath]);

  if (!isLoaded) {
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
