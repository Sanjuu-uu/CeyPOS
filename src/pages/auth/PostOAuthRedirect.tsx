import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth, useUser, useClerk } from "@clerk/clerk-react";
import {
  parseAccountParam,
  persistAccountIntent,
  readAccountIntent,
  getPostRegisterPath,
  intentToMetadataAccountType,
  clearAccountIntent,
  sanitizeRedirectTarget,
  PENDING_OAUTH_KEY,
  OAUTH_JUST_COMPLETED_KEY,
  type AccountIntent,
} from "../../lib/authFlow";

const MAX_WAIT_MS = 20000;
const POLL_MS = 250;

/**
 * After OAuth, wait for Clerk session then hard-navigate to the wizard.
 */
export default function PostOAuthRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const clerk = useClerk();
  const location = useLocation();
  const finishedRef = useRef(false);

  const params = new URLSearchParams(location.search);
  const intent: AccountIntent =
    parseAccountParam(location.search) ||
    readAccountIntent() ||
    "owner";

  const redirectParam = params.get("redirect");
  const destination = sanitizeRedirectTarget(
    redirectParam,
    getPostRegisterPath(intent),
  );

  useEffect(() => {
    persistAccountIntent(intent);
  }, [intent]);

  useEffect(() => {
    if (finishedRef.current) return;

    const complete = async (activeUser: NonNullable<typeof user>) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      sessionStorage.removeItem(PENDING_OAUTH_KEY);

      try {
        const metaType = intentToMetadataAccountType(intent);
        const existingType = activeUser.unsafeMetadata?.accountType;
        if (existingType !== "team" && existingType !== "owner") {
          await activeUser.update({
            unsafeMetadata: {
              ...(activeUser.unsafeMetadata || {}),
              accountType: metaType,
            },
          });
        }
      } catch (err) {
        console.error("PostOAuthRedirect: metadata update failed", err);
      }

      clearAccountIntent();
      sessionStorage.setItem(OAUTH_JUST_COMPLETED_KEY, String(Date.now()));
      window.location.replace(destination);
    };

    const hasSession = () =>
      Boolean(isSignedIn && user) || Boolean(clerk.session?.user);

    if (isLoaded && hasSession()) {
      const activeUser = user ?? clerk.user;
      if (activeUser) {
        void complete(activeUser);
      }
      return;
    }

    if (!isLoaded) return;

    const started = Date.now();
    const timer = window.setInterval(() => {
      if (finishedRef.current) {
        window.clearInterval(timer);
        return;
      }

      const activeUser = clerk.user ?? user;
      if (activeUser && (isSignedIn || clerk.session)) {
        window.clearInterval(timer);
        void complete(activeUser);
        return;
      }

      if (Date.now() - started >= MAX_WAIT_MS) {
        window.clearInterval(timer);
        finishedRef.current = true;
        sessionStorage.removeItem(PENDING_OAUTH_KEY);
        sessionStorage.setItem(OAUTH_JUST_COMPLETED_KEY, String(Date.now()));
        window.location.replace(destination);
      }
    }, POLL_MS);

    return () => window.clearInterval(timer);
  }, [
    clerk,
    destination,
    intent,
    isLoaded,
    isSignedIn,
    user,
  ]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center px-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />
        <p className="mt-4 text-gray-600">Setting up your account…</p>
      </div>
    </div>
  );
}
