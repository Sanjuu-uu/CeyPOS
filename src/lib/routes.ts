export const APP_ROUTES = {
  home: "/",
  marketingHome: "/home",
  login: "/login",
  register: "/register",
  about: "/about",
  features: "/features",
  pricing: "/pricing",
  support: "/support",
  contact: "/contact",
  analytics: "/analytics",
  admin: "/admin",
  shopWizard: "/shop-wizard",
  teamOnboard: "/team-onboard",
  mobileSessions: "/mobilesessions",
  mobileScan: "/mobilesessions/scan",
  oauthCallback: "/auth/sso-callback",
  postOAuth: "/auth/post-oauth",
  publicReceipt: "/r/:token",
} as const;

export const MARKETING_ROUTE_PATHS = [
  APP_ROUTES.about,
  APP_ROUTES.features,
  APP_ROUTES.pricing,
  APP_ROUTES.support,
  APP_ROUTES.contact,
] as const;

export function getSetupRoute(accountType: "owner" | "team") {
  return accountType === "team" ? APP_ROUTES.teamOnboard : APP_ROUTES.shopWizard;
}

export function getWorkspaceRoute(params: {
  accountType: "owner" | "team";
  forceWizard: boolean;
}) {
  return params.forceWizard
    ? getSetupRoute(params.accountType)
    : APP_ROUTES.analytics;
}
