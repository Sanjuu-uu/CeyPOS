import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useClerk } from "@clerk/clerk-react";
import {
  parseAccountParam,
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

const MAX_WAIT_MS = 12000;
const POLL_MS = 200;

/**
 * Runs once after /auth/sso-callback activates the Clerk session.
 * Employee destination: /team-onboard
 * Owner destination:     /shop-wizard
 */
export default function PostOAuthRedirect() {
  const clerk = useClerk();
  const location = useLocation();
  const finishedRef = useRef(false);
  const intentRef = useRef<AccountIntent>("owner");
  const destinationRef = useRef("/shop-wizard");

  const params = new URLSearchParams(location.search);
  const intent: AccountIntent =
    parseAccountParam(location.search) ||
    readAccountIntent() ||
    "owner";
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
    const started = Date.now();

    const finish = async (activeUser: NonNullable<typeof clerk.user>) => {
      if (finishedRef.current || cancelled) return;
      finishedRef.current = true;
      clearOAuthPending();

      try {
        const metaType = intentToMetadataAccountType(intentRef.current);
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
      window.location.replace(destinationRef.current);
    };

    const poll = () => {
      if (finishedRef.current || cancelled) return;

      const activeUser = clerk.user;
      const hasSession = Boolean(clerk.session && activeUser);

      if (hasSession && activeUser) {
        void finish(activeUser);
        return;
      }

      if (Date.now() - started >= MAX_WAIT_MS) {
        finishedRef.current = true;
        clearOAuthPending();
        window.location.replace(
          buildRegisterHref(intentRef.current) + "&oauth=session_timeout",
        );
        return;
      }

      timer = window.setTimeout(poll, POLL_MS);
    };

    const boot = async () => {
      if (!clerk.loaded) {
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
  }, [clerk]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center px-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />
        <p className="mt-4 text-gray-600">Setting up your account…</p>
      </div>
    </div>
  );
}
