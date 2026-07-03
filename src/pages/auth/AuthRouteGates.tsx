import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import Register from "../register/Register";
import TeamOnboard from "../team/TeamOnboard";
import {
  parseAccountParam,
  readAccountIntent,
  getPostRegisterPath,
  persistAccountIntent,
  buildPostOAuthUrl,
  PENDING_OAUTH_KEY,
  OAUTH_JUST_COMPLETED_KEY,
} from "../../lib/authFlow";

const SESSION_GRACE_MS = 15000;

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

function oauthGraceActive(): boolean {
  const raw = sessionStorage.getItem(OAUTH_JUST_COMPLETED_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts < SESSION_GRACE_MS;
}

/** Register — signed-in users go to post-oauth; wait during OAuth return instead of re-showing the form. */
export function RegisterPageGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const location = useLocation();
  const [oauthWaitDone, setOauthWaitDone] = useState(false);

  const intent = useMemo(() => {
    const urlIntent = parseAccountParam(location.search);
    if (location.search.includes("account=employee")) {
      return urlIntent;
    }
    return readAccountIntent() || urlIntent;
  }, [location.search]);

  const pendingOAuth = sessionStorage.getItem(PENDING_OAUTH_KEY);
  const inOAuthGrace = oauthGraceActive();
  const awaitingOAuth =
    Boolean(pendingOAuth || inOAuthGrace) && !isSignedIn;

  useEffect(() => {
    persistAccountIntent(intent);
  }, [intent]);

  useEffect(() => {
    if (!awaitingOAuth) {
      setOauthWaitDone(true);
      return;
    }
    setOauthWaitDone(false);
    const timer = window.setTimeout(() => setOauthWaitDone(true), SESSION_GRACE_MS);
    return () => window.clearTimeout(timer);
  }, [awaitingOAuth]);

  if (!isLoaded || (awaitingOAuth && !oauthWaitDone)) {
    return <AuthLoading message="Completing sign in…" />;
  }

  if (isSignedIn && user) {
    return (
      <Navigate
        to={buildPostOAuthUrl(intent, getPostRegisterPath(intent))}
        replace
      />
    );
  }

  if (awaitingOAuth && oauthWaitDone) {
    return (
      <Navigate
        to={buildPostOAuthUrl(intent, getPostRegisterPath(intent))}
        replace
      />
    );
  }

  return <Register />;
}

/** Employee onboarding wizard — requires Clerk session (waits after OAuth). */
export function TeamOnboardGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const [graceDone, setGraceDone] = useState(false);

  const pendingOAuth = sessionStorage.getItem(PENDING_OAUTH_KEY);
  const inOAuthGrace = oauthGraceActive() || Boolean(pendingOAuth);
  const graceMs = inOAuthGrace ? SESSION_GRACE_MS : 4000;

  useEffect(() => {
    if (!isLoaded || isSignedIn) {
      setGraceDone(true);
      return;
    }

    setGraceDone(false);
    const timer = window.setTimeout(() => setGraceDone(true), graceMs);
    return () => window.clearTimeout(timer);
  }, [graceMs, isLoaded, isSignedIn]);

  useEffect(() => {
    if (isSignedIn) {
      sessionStorage.removeItem(OAUTH_JUST_COMPLETED_KEY);
      sessionStorage.removeItem(PENDING_OAUTH_KEY);
    }
  }, [isSignedIn]);

  if (!isLoaded || (!isSignedIn && !graceDone)) {
    return <AuthLoading message="Setting up your account…" />;
  }

  if (!isSignedIn) {
    return <Navigate to="/register?account=employee" replace />;
  }

  return <TeamOnboard />;
}
