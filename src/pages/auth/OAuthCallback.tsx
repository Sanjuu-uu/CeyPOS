import { useEffect, useMemo } from "react";
import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import { useSearchParams } from "react-router-dom";
import {
  parseAccountParam,
  persistAccountIntent,
  readAccountIntent,
  buildRegisterHref,
  buildPostOAuthUrl,
  buildOAuthRedirectCompleteUrl,
} from "../../lib/authFlow";

/**
 * Clerk OAuth return URL. Keeps users in our app — never on accounts.dev/sign-up.
 * @see https://clerk.com/docs/react/reference/components/control/authenticate-with-redirect-callback
 */
export default function OAuthCallback() {
  const [params] = useSearchParams();

  const intent = useMemo(() => {
    const fromUrl = parseAccountParam(`?${params.toString()}`);
    return fromUrl || readAccountIntent() || ("owner" as const);
  }, [params]);

  useEffect(() => {
    persistAccountIntent(intent);
  }, [intent]);

  const redirectParam = params.get("redirect");
  const registerPath = buildRegisterHref(intent);
  const postOAuthPath = buildPostOAuthUrl(intent, redirectParam || undefined);

  const loginUrl = buildOAuthRedirectCompleteUrl("/login");
  const signUpUrl = buildOAuthRedirectCompleteUrl(registerPath);
  const postOAuthUrl = buildOAuthRedirectCompleteUrl(postOAuthPath);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-sm px-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />
        <p className="mt-4 text-gray-600">Completing sign in…</p>
        <AuthenticateWithRedirectCallback
          signInUrl={loginUrl}
          signUpUrl={signUpUrl}
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
