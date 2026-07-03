import { useEffect, useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import Register from "../register/Register";
import {
  resolveAccountIntent,
  getPostRegisterPath,
  persistAccountIntent,
  buildPostOAuthUrl,
  readOAuthPending,
} from "../../lib/authFlow";

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
 * Register page gate — mirrors the owner flow:
 * OAuth always finishes at /auth/post-oauth, then hard-navigates to the wizard.
 * Signed-in or in-flight OAuth users never see the register form again.
 */
export function RegisterPageGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  const intent = useMemo(
    () => resolveAccountIntent(location.search),
    [location.search],
  );
  const destination = getPostRegisterPath(intent);
  const postOAuthPath = buildPostOAuthUrl(intent, destination);
  const oauthPending = readOAuthPending();

  useEffect(() => {
    persistAccountIntent(intent);
  }, [intent]);

  if (!isLoaded) {
    return <AuthLoading message="Loading registration…" />;
  }

  // Same finish step as owner: post-oauth sets metadata then navigates to wizard
  if (isSignedIn || oauthPending) {
    return <Navigate to={postOAuthPath} replace />;
  }

  return <Register />;
}
