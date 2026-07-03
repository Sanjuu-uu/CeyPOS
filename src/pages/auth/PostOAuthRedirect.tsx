import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import {
  parseAccountParam,
  persistAccountIntent,
  readAccountIntent,
  getPostRegisterPath,
  intentToMetadataAccountType,
  clearAccountIntent,
  buildRegisterHref,
  sanitizeRedirectTarget,
  type AccountIntent,
} from "../../lib/authFlow";

/**
 * Landing page after Google/Apple OAuth completes.
 * Waits for Clerk session, writes accountType metadata, then opens the correct wizard.
 */
export default function PostOAuthRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const handledRef = useRef(false);
  const [waitAttempts, setWaitAttempts] = useState(0);

  const intent: AccountIntent =
    parseAccountParam(`?${params.toString()}`) ||
    readAccountIntent() ||
    "owner";

  useEffect(() => {
    persistAccountIntent(intent);
  }, [intent]);

  useEffect(() => {
    if (handledRef.current || !isLoaded) {
      return;
    }

    if (!isSignedIn || !user) {
      if (waitAttempts >= 30) {
        navigate(buildRegisterHref(intent), { replace: true });
      }
      return;
    }

    handledRef.current = true;

    void (async () => {
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
        console.error("PostOAuthRedirect: metadata update failed", err);
      }

      clearAccountIntent();
      const redirectParam = params.get("redirect");
      const destination = sanitizeRedirectTarget(
        redirectParam,
        getPostRegisterPath(intent),
      );
      navigate(destination, { replace: true });
    })();
  }, [intent, isLoaded, isSignedIn, navigate, user, waitAttempts]);

  useEffect(() => {
    if (!isLoaded || isSignedIn || handledRef.current) {
      return;
    }

    const timer = window.setInterval(() => {
      setWaitAttempts((count) => count + 1);
    }, 200);

    return () => window.clearInterval(timer);
  }, [isLoaded, isSignedIn]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center px-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />
        <p className="mt-4 text-gray-600">Setting up your account…</p>
      </div>
    </div>
  );
}
