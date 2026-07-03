/** Shared auth/onboarding helpers for Clerk sign-in, sign-up, and post-auth routing. */

export const ACCOUNT_INTENT_KEY = "ceypos::accountIntent";
export const PENDING_OAUTH_KEY = "ceypos::pendingOauth";
export const OAUTH_JUST_COMPLETED_KEY = "ceypos::oauthJustCompleted";

export type AccountIntent = "owner" | "employee";

/** Clerk unsafeMetadata uses `team` for employee accounts. */
export type MetadataAccountType = "owner" | "team";

export function parseAccountParam(search: string): AccountIntent {
  const account = new URLSearchParams(search).get("account");
  if (account === "employee" || account === "team") return "employee";
  return "owner";
}

export function persistAccountIntent(intent: AccountIntent): void {
  sessionStorage.setItem(ACCOUNT_INTENT_KEY, intent);
}

export function readAccountIntent(): AccountIntent | null {
  const raw = sessionStorage.getItem(ACCOUNT_INTENT_KEY);
  if (raw === "owner" || raw === "employee") return raw;
  return null;
}

export function clearAccountIntent(): void {
  sessionStorage.removeItem(ACCOUNT_INTENT_KEY);
}

/** Resolve owner vs employee from URL query, preserving explicit employee in URL. */
export function resolveAccountIntent(search: string): AccountIntent {
  const urlIntent = parseAccountParam(search);
  if (search.includes("account=employee")) {
    return urlIntent;
  }
  return readAccountIntent() || urlIntent;
}

export function markOAuthPending(source: string): void {
  sessionStorage.setItem(PENDING_OAUTH_KEY, source);
}

export function clearOAuthPending(): void {
  sessionStorage.removeItem(PENDING_OAUTH_KEY);
}

export function readOAuthPending(): string | null {
  return sessionStorage.getItem(PENDING_OAUTH_KEY);
}

/** Clear all client-side auth/onboarding state (call before wizard cancel sign-out). */
export function clearAuthStorage(): void {
  sessionStorage.removeItem(ACCOUNT_INTENT_KEY);
  sessionStorage.removeItem(PENDING_OAUTH_KEY);
  sessionStorage.removeItem(OAUTH_JUST_COMPLETED_KEY);
  localStorage.removeItem("ceypos::teamSetup");
  localStorage.removeItem("ceypos::rememberedEmail");
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith("ceypos:mobile-session:") ||
          key.startsWith("ceypos:terminal:"))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore
  }
}

/** Employee onboarding wizard — final destination after Google/email sign-up. */
export const TEAM_ONBOARD_PATH = "/team-onboard";

/** Owner shop setup wizard — final destination after Google/email sign-up. */
export const SHOP_WIZARD_PATH = "/shop-wizard";

export function getPostRegisterPath(intent: AccountIntent): string {
  return intent === "employee" ? TEAM_ONBOARD_PATH : SHOP_WIZARD_PATH;
}

export function getAccountTypeLabel(intent: AccountIntent): string {
  return intent === "employee" ? "Employee" : "Owner / Manager";
}

export function intentToMetadataAccountType(
  intent: AccountIntent,
): MetadataAccountType {
  return intent === "employee" ? "team" : "owner";
}

export function metadataToAccountIntent(
  accountType: unknown,
): AccountIntent | null {
  if (accountType === "team") return "employee";
  if (accountType === "owner") return "owner";
  return null;
}

/** Safe in-app redirect target (blocks open redirects). */
export function sanitizeRedirectTarget(
  target: string | null | undefined,
  fallback = "/",
): string {
  if (!target || !target.startsWith("/") || target.startsWith("//")) {
    return fallback;
  }
  return target;
}

export function buildRegisterHref(intent: AccountIntent): string {
  return intent === "employee" ? "/register?account=employee" : "/register?account=owner";
}

/** Clerk OAuth must return to this route so the session can be activated. */
export const OAUTH_CALLBACK_PATH = "/auth/sso-callback";

export function buildOAuthCallbackUrl(
  flow: "login" | "register",
  accountIntent: AccountIntent,
  redirectTo?: string,
): string {
  const params = new URLSearchParams();
  params.set("account", accountIntent);
  params.set("flow", flow);
  const destination = redirectTo ?? getPostRegisterPath(accountIntent);
  params.set("redirect", destination);
  return `${OAUTH_CALLBACK_PATH}?${params.toString()}`;
}

export type RegisterOAuthUrls = {
  callbackPath: string;
  callbackUrl: string;
  completePath: string;
  completeUrl: string;
  destination: string;
};

/** OAuth redirect URLs for register-page Google/Apple buttons (owner + employee). */
export function buildRegisterOAuthUrls(
  accountIntent: AccountIntent,
): RegisterOAuthUrls {
  const destination = getPostRegisterPath(accountIntent);
  const callbackPath = buildOAuthCallbackUrl("register", accountIntent, destination);
  const completePath = buildPostOAuthUrl(accountIntent, destination);
  return {
    callbackPath,
    callbackUrl: buildOAuthRedirectCompleteUrl(callbackPath),
    completePath,
    completeUrl: buildOAuthRedirectCompleteUrl(completePath),
    destination,
  };
}

export function resolvePostAuthDestination(options: {
  metadataAccountType?: unknown;
  sessionIntent?: AccountIntent | null;
  teamOnboarded?: boolean;
  shopReady?: boolean;
}): string {
  const intent = options.sessionIntent ?? null;
  const isTeam =
    options.metadataAccountType === "team" || intent === "employee";
  const isOwner =
    options.metadataAccountType === "owner" ||
    (!isTeam && (intent === "owner" || intent === null));

  if (isTeam && !options.teamOnboarded) {
    return "/team-onboard";
  }
  if (isOwner && !options.shopReady) {
    return "/shop-wizard";
  }
  return "/dashboard";
}

export function buildOAuthRedirectUrl(
  basePath: "/login" | "/register",
  redirectTo: string,
  accountIntent?: AccountIntent,
): string {
  const params = new URLSearchParams();

  if (basePath === "/login") {
    params.set("redirect", redirectTo);
    if (accountIntent) {
      params.set("account", accountIntent);
    }
  } else if (accountIntent) {
    params.set("account", accountIntent);
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function buildPostOAuthUrl(
  accountIntent: AccountIntent,
  redirectTo?: string,
): string {
  const params = new URLSearchParams();
  params.set("account", accountIntent);
  const destination = redirectTo ?? getPostRegisterPath(accountIntent);
  params.set("redirect", destination);
  return `/auth/post-oauth?${params.toString()}`;
}

export function buildOAuthRedirectCompleteUrl(path: string): string {
  return `${window.location.origin}${path}`;
}
