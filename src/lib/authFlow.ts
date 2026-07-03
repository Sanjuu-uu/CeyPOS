/** Shared auth/onboarding helpers for Clerk sign-in, sign-up, and post-auth routing. */

export const ACCOUNT_INTENT_KEY = "ceypos::accountIntent";
export const TEAM_SETUP_CACHE_KEY = "ceypos::teamSetup";
export const PENDING_OAUTH_KEY = "ceypos::pendingOauth";

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

/** Clear all client-side auth/onboarding state (call before wizard cancel sign-out). */
export function clearAuthStorage(): void {
  sessionStorage.removeItem(ACCOUNT_INTENT_KEY);
  sessionStorage.removeItem(PENDING_OAUTH_KEY);
  localStorage.removeItem(TEAM_SETUP_CACHE_KEY);
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

export function getPostRegisterPath(intent: AccountIntent): string {
  return intent === "employee" ? "/team-onboard" : "/shop-wizard";
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

export function buildOAuthRedirectCompleteUrl(path: string): string {
  return `${window.location.origin}${path}`;
}
