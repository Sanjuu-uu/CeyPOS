import { useEffect, useMemo } from "react";
import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import { useSearchParams } from "react-router-dom";
import {
  parseAccountParam,
  persistAccountIntent,
  readAccountIntent,
  getPostRegisterPath,
  buildPostOAuthUrl,
  buildOAuthCallbackUrl,
  buildOAuthRedirectCompleteUrl,
  sanitizeRedirectTarget,
} from "../../lib/authFlow";

/**
 * Clerk OAuth return URL — identical path for owner and employee.
 * Always forwards to /auth/post-oauth with the correct wizard destination.
 */
export default function OAuthCallback() {
  const [params] = useSearchParams();

  const intent = useMemo(() => {
    const fromUrl = parseAccountParam(`?${params.toString()}`);
    return fromUrl || readAccountIntent() || ("owner" as const);
  }, [params]);

  const flow = params.get("flow") === "login" ? "login" : "register";
  const destination = sanitizeRedirectTarget(
    params.get("redirect"),
    getPostRegisterPath(intent),
  );

  useEffect(() => {
    persistAccountIntent(intent);
  }, [intent]);

  const callbackPath = buildOAuthCallbackUrl(flow, intent, destination);
  const callbackUrl = buildOAuthRedirectCompleteUrl(callbackPath);
  const postOAuthUrl = buildOAuthRedirectCompleteUrl(
    buildPostOAuthUrl(intent, destination),
  );

  // Diagnostic logging for OAuth callback flow
  try {
    // eslint-disable-next-line no-console
    console.debug("OAuthCallback: flow=", flow, "intent=", intent, "destination=", destination, "callbackUrl=", callbackUrl, "postOAuthUrl=", postOAuthUrl);
  } catch {}

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-sm px-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />
        <p className="mt-4 text-gray-600">Completing sign in…</p>
        <AuthenticateWithRedirectCallback
          signInUrl={callbackUrl}
          signUpUrl={callbackUrl}
          signInForceRedirectUrl={postOAuthUrl}
          signUpForceRedirectUrl={postOAuthUrl}
          signInFallbackRedirectUrl={postOAuthUrl}
          signUpFallbackRedirectUrl={postOAuthUrl}
          continueSignUpUrl={postOAuthUrl}
        />
      </div>
    </div>
  );
}
