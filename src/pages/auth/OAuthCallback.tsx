import { useEffect } from "react";
import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import { useSearchParams } from "react-router-dom";
import { parseAccountParam, persistAccountIntent } from "../../lib/authFlow";

/**
 * Clerk OAuth return URL. Required for Google/Apple redirect flows to
 * activate the session before redirectUrlComplete is applied.
 */
export default function OAuthCallback() {
  const [params] = useSearchParams();

  useEffect(() => {
    persistAccountIntent(parseAccountParam(`?${params.toString()}`));
  }, [params]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />
        <p className="mt-4 text-gray-600">Completing sign in…</p>
        <AuthenticateWithRedirectCallback />
      </div>
    </div>
  );
}
