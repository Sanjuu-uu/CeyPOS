import { useEffect, useCallback, useMemo, useState, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-react";
import { MainLayout } from "./components/layout/MainLayout";
import { AppProvider } from "./context/AppContext";
import {
  ShopWizardProvider,
  useShopWizard,
  type ShopFormData,
} from "./context/ShopWizardContext";
import { ShopWizard } from "./components/modules/ShopWizard";
import Home from "./pages/home/home";
import Login from "./pages/login/Login";
import Register from "./pages/register/Register";
import AboutUs from "./pages/aboutUs/AboutUs";
import MobileScan from "./pages/mobilesessions/MobileScan";
import TeamOnboard from "./pages/team/TeamOnboard";
import { PublicReceiptView } from "./components/modules/receipts/PublicReceiptView";
import {
  TEAM_SETUP_CACHE_KEY,
  readAccountIntent,
  clearAccountIntent,
  intentToMetadataAccountType,
} from "./lib/authFlow";
import { authFetch, setAuthTokenGetter } from "./lib/api";

// Get Clerk publishable key from environment
const clerkPubKey =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  import.meta.env.CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error(
    "Missing Clerk Publishable Key. Set VITE_CLERK_PUBLISHABLE_KEY or CLERK_PUBLISHABLE_KEY.",
  );
}

// Pre-Authentication App (Marketing/Landing pages)
function PreAuthApp() {
  return (
    <Routes>
      <Route path="/mobilesessions" element={<Navigate to="/mobilesessions/scan" replace />} />
      <Route path="/mobilesessions/scan" element={<MobileScan />} />
      <Route path="/" element={<Home />} />
      <Route path="/home" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/about" element={<AboutUs />} />
      <Route
        path="/features"
        element={<div>Features Page - Coming Soon</div>}
      />
      <Route path="/pricing" element={<div>Pricing Page - Coming Soon</div>} />
      <Route path="/support" element={<div>Support Page - Coming Soon</div>} />
      <Route path="/contact" element={<div>Contact Page - Coming Soon</div>} />
      {/* Redirect any authenticated routes back to home */}
      <Route path="/dashboard/*" element={<Navigate to="/" replace />} />
      <Route path="/shop-wizard" element={<Navigate to="/" replace />} />
      {/* Catch-all route for 404 */}
      <Route path="*" element={<div>Page Not Found - 404</div>} />
    </Routes>
  );
}

// Post-Authentication App (POS System)
type ShopStatus = {
  shopId: string;
  dbFileName: string;
  isCompleted: boolean;
};

type TeamSetupCache = {
  accountType: "team";
  teamOnboarded: true;
  userEmail: string;
  shopId: string;
  dbFileName: string;
  mainTerminalEmail: string;
  displayName: string;
};

function loadTeamSetupCache(userEmail?: string | null): TeamSetupCache | null {
  if (!userEmail) return null;
  try {
    const raw = localStorage.getItem(TEAM_SETUP_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TeamSetupCache>;
    if (
      parsed.accountType !== "team" ||
      parsed.teamOnboarded !== true ||
      parsed.userEmail?.toLowerCase() !== userEmail.toLowerCase() ||
      !parsed.shopId ||
      !parsed.dbFileName
    ) {
      return null;
    }
    return parsed as TeamSetupCache;
  } catch {
    return null;
  }
}

function PostAuthApp() {
  const { user } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress || "";
  const teamSetupCache = useMemo(
    () => loadTeamSetupCache(userEmail),
    [userEmail],
  );

  useEffect(() => {
    if (!user) return;
    const intent = readAccountIntent();
    if (!intent) return;

    const existingType = user.unsafeMetadata?.accountType;
    if (existingType === "team" || existingType === "owner") {
      clearAccountIntent();
      return;
    }

    const metaType = intentToMetadataAccountType(intent);
    if (metaType === "team") {
      void user.update({
        unsafeMetadata: {
          ...(user.unsafeMetadata || {}),
          accountType: "team",
        },
      });
    }
    clearAccountIntent();
  }, [user]);

  const rawMetadata = user?.unsafeMetadata;
  const metadata = useMemo(() => rawMetadata ?? {}, [rawMetadata]);
  const metadataShopId =
    typeof metadata.shopId === "string" ? metadata.shopId : teamSetupCache?.shopId ?? "";
  const metadataDbFileName =
    typeof metadata.dbFileName === "string"
      ? metadata.dbFileName
      : teamSetupCache?.dbFileName ?? "";
  const metadataCompleted = Boolean(
    (metadata.shopCompleted === true || teamSetupCache?.teamOnboarded === true) &&
      metadataShopId &&
      metadataDbFileName
  );

  const wizardInitialFormData = useMemo<Partial<ShopFormData>>(() => {
    const draft: Partial<ShopFormData> = {};

    const fillString = (value: unknown): string | undefined =>
      typeof value === "string" && value.trim().length > 0 ? value : undefined;

    const fillArray = (value: unknown): string[] | undefined => {
      if (!Array.isArray(value)) {
        return undefined;
      }
      const filtered = value.filter(
        (entry): entry is string =>
          typeof entry === "string" && entry.trim().length > 0
      );
      return filtered.length > 0 ? filtered : undefined;
    };

    draft.shopName = fillString(metadata.shopName) ?? draft.shopName;
    draft.ownerName = fillString(metadata.ownerName) ?? draft.ownerName;
    draft.email =
      fillString(metadata.ownerEmail) ??
      fillString(metadata.shopEmail) ??
      draft.email;
    draft.phone = fillString(metadata.phone) ?? draft.phone;
    const typeCandidate = fillString(metadata.shopType);
    if (
      typeCandidate &&
      ["retail", "restaurant", "service", "wholesale"].includes(typeCandidate)
    ) {
      draft.shopType = typeCandidate as ShopFormData["shopType"];
    }
    draft.address = fillString(metadata.address) ?? draft.address;
    draft.city = fillString(metadata.city) ?? draft.city;
    draft.state = fillString(metadata.state) ?? draft.state;
    draft.zipCode = fillString(metadata.zipCode) ?? draft.zipCode;
    draft.country = fillString(metadata.country) ?? draft.country;
    draft.businessLicense =
      fillString(metadata.businessLicense) ?? draft.businessLicense;
    draft.taxId = fillString(metadata.taxId) ?? draft.taxId;
    draft.registrationNumber =
      fillString(metadata.registrationNumber) ?? draft.registrationNumber;
    draft.currency = fillString(metadata.currency) ?? draft.currency;
    draft.timezone = fillString(metadata.timezone) ?? draft.timezone;
    const payments = fillArray(metadata.paymentMethods);
    if (payments) {
      draft.paymentMethods = payments;
    }

    if (
      metadata.operatingHours &&
      typeof metadata.operatingHours === "object"
    ) {
      draft.operatingHours =
        metadata.operatingHours as ShopFormData["operatingHours"];
    }

    return draft;
  }, [metadata]);

  const shopProfile = useMemo(() => {
    const name =
      typeof metadata.shopName === "string" &&
      metadata.shopName.trim().length > 0
        ? metadata.shopName
        : undefined;

    const addressParts = [
      metadata.address,
      metadata.city,
      metadata.state,
      metadata.country,
    ].filter(
      (part): part is string =>
        typeof part === "string" && part.trim().length > 0
    );
    const address =
      addressParts.length > 0 ? addressParts.join(", ") : undefined;

    const contactParts = [
      metadata.ownerName,
      metadata.phone,
      metadata.ownerEmail,
    ].filter(
      (part): part is string =>
        typeof part === "string" && part.trim().length > 0
    );
    const contact =
      contactParts.length > 0 ? contactParts.join(" • ") : undefined;

    return {
      name,
      address,
      contact,
    };
  }, [metadata]);

  const [shopStatus, setShopStatus] = useState<ShopStatus>({
    shopId: metadataShopId,
    dbFileName: metadataDbFileName,
    isCompleted: metadataCompleted,
  });

  useEffect(() => {
    setShopStatus({
      shopId: metadataShopId,
      dbFileName: metadataDbFileName,
      isCompleted: metadataCompleted,
    });
  }, [metadataCompleted, metadataDbFileName, metadataShopId]);

  const handleShopStatusChange = useCallback((update: Partial<ShopStatus>) => {
    setShopStatus((prev) => {
      // Determine what the new state *would* be
      const newShopId =
        typeof update.shopId === "string" ? update.shopId : prev.shopId;
      const newDbFileName =
        typeof update.dbFileName === "string"
          ? update.dbFileName
          : prev.dbFileName;
      const newIsCompleted =
        typeof update.isCompleted === "boolean"
          ? update.isCompleted
          : prev.isCompleted;

      // Check if anything *actually* changed
      if (
        prev.shopId === newShopId &&
        prev.dbFileName === newDbFileName &&
        prev.isCompleted === newIsCompleted
      ) {
        // If nothing changed, return the *previous state object*
        // This stops the re-render loop
        return prev;
      }

      // If things did change, return the new state object
      return {
        shopId: newShopId,
        dbFileName: newDbFileName,
        isCompleted: newIsCompleted,
      };
    });
  }, []);

  const activeShopId = shopStatus.shopId || metadataShopId;

  const accountType =
    metadata.accountType === "team" || teamSetupCache?.accountType === "team"
      ? ("team" as const)
      : ("owner" as const);

  useEffect(() => {
    if (accountType !== "team" || metadataShopId || !userEmail || !user) {
      return;
    }

    const mainTerminalEmail =
      typeof metadata.mainTerminalEmail === "string"
        ? metadata.mainTerminalEmail.trim()
        : "";
    if (!mainTerminalEmail) return;

    const displayName =
      (typeof metadata.displayName === "string" && metadata.displayName.trim()) ||
      user.fullName ||
      userEmail.split("@")[0] ||
      "Employee";

    let cancelled = false;
    (async () => {
      try {
        const response = await authFetch("/api/team/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ownerEmail: mainTerminalEmail,
            userEmail,
            displayName,
            clerkUserId: user.id,
            accountType: "team",
          }),
        });
        const result = await response.json();
        if (!response.ok || !result?.shopId || !result?.dbFileName || cancelled) {
          return;
        }

        localStorage.setItem(
          TEAM_SETUP_CACHE_KEY,
          JSON.stringify({
            accountType: "team",
            teamOnboarded: true,
            userEmail,
            mainTerminalEmail,
            displayName,
            shopId: result.shopId,
            dbFileName: result.dbFileName,
          }),
        );
        setShopStatus({
          shopId: result.shopId,
          dbFileName: result.dbFileName,
          isCompleted: true,
        });
        await user.update({
          unsafeMetadata: {
            ...(user.unsafeMetadata || {}),
            accountType: "team",
            teamOnboarded: true,
            mainTerminalEmail,
            displayName,
            shopId: result.shopId,
            dbFileName: result.dbFileName,
            shopCompleted: true,
          },
        });
      } catch {
        // The team onboarding screen remains the fallback.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accountType, metadata, metadataShopId, user, userEmail]);

  return (
    <AppProvider
      userEmail={userEmail}
      shopId={activeShopId || undefined}
      shopProfile={shopProfile}
      accountType={accountType}
    >
      <ShopWizardProvider
        userEmail={user?.primaryEmailAddress?.emailAddress}
        initialShopId={shopStatus.shopId}
        initialDbFileName={shopStatus.dbFileName}
        initialCompleted={shopStatus.isCompleted}
        initialFormData={wizardInitialFormData}
        onStatusChange={handleShopStatusChange}
      >
        <PostAuthContent
          shopStatus={shopStatus}
          onShopStatusChange={handleShopStatusChange}
        />
      </ShopWizardProvider>
    </AppProvider>
  );
}

interface PostAuthContentProps {
  shopStatus: ShopStatus;
  onShopStatusChange: (update: Partial<ShopStatus>) => void;
}

function PostAuthContent({
  shopStatus,
  onShopStatusChange,
}: PostAuthContentProps) {
  const { user, isLoaded } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress || "";
  const teamSetupCache = useMemo(
    () => loadTeamSetupCache(userEmail),
    [userEmail],
  );
  const metadata = user?.unsafeMetadata ?? {};
  const accountType =
    metadata.accountType === "team" || teamSetupCache?.accountType === "team"
      ? "team"
      : "owner";
  const teamOnboarded =
    metadata.teamOnboarded === true || teamSetupCache?.teamOnboarded === true;
  const {
    isCompleted: wizardCompleted,
    shopId: wizardShopId,
    shopDbFileName,
  } = useShopWizard();

  const [validationState, setValidationState] = useState<
    "checking" | "needs-setup" | "ready" | "error"
  >("checking");
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null
  );
  const [retryToken, setRetryToken] = useState(0);
  const [lastValidated, setLastValidated] = useState<{
    shopId: string;
    dbFileName: string;
  } | null>(null);
  const validationReadyRef = useRef(false);

  const effectiveShopData = useMemo(() => {
    const metadata = user?.unsafeMetadata ?? {};
    const metadataShopId =
      typeof metadata.shopId === "string" ? metadata.shopId : teamSetupCache?.shopId ?? "";
    const metadataDbFileName =
      typeof metadata.dbFileName === "string"
        ? metadata.dbFileName
        : teamSetupCache?.dbFileName ?? "";
    const metadataCompleted =
      metadata.shopCompleted === true || teamSetupCache?.teamOnboarded === true;

    const computedShopId = wizardShopId || shopStatus.shopId || metadataShopId;
    const computedDbFileName =
      shopDbFileName || shopStatus.dbFileName || metadataDbFileName;
    const computedCompleted = Boolean(
      wizardCompleted ||
        shopStatus.isCompleted ||
        (metadataCompleted && metadataShopId && metadataDbFileName)
    );

    return {
      shopId: computedShopId,
      dbFileName: computedDbFileName,
      isCompleted: computedCompleted,
    };
  }, [shopDbFileName, shopStatus, teamSetupCache, user, wizardCompleted, wizardShopId]);

  useEffect(() => {
    if (!isLoaded || !user) {
      return;
    }

    const { shopId, dbFileName, isCompleted } = effectiveShopData;

    if (!isCompleted || !shopId || !dbFileName) {
      setValidationState("needs-setup");
      onShopStatusChange({ isCompleted: false, shopId, dbFileName });
      return;
    }

    if (
      lastValidated &&
      lastValidated.shopId === shopId &&
      lastValidated.dbFileName === dbFileName &&
      validationReadyRef.current
    ) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);

    setValidationState("checking");
    setValidationMessage(null);
    validationReadyRef.current = false;

    (async () => {
      try {
        const response = await authFetch(
          `/api/shop/${encodeURIComponent(shopId)}/exists`,
          {
            signal: controller.signal,
          },
        );
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            payload?.error || response.statusText || "Failed to validate shop"
          );
        }

        if (!payload.exists || !payload.hasMetadata) {
          if (!cancelled) {
            setValidationMessage(
              "Shop validation failed. Please contact CeyPOS administration."
            );
            setValidationState("error");
            setLastValidated(null);
          }
          return;
        }

        if (!cancelled) {
          setLastValidated({ shopId, dbFileName });
          validationReadyRef.current = true;
          setValidationState("ready");
          onShopStatusChange({ isCompleted: true, shopId, dbFileName });
        }
      } catch (error) {
        if (!cancelled) {
          const isAbort =
            error instanceof DOMException && error.name === "AbortError";
          const message = isAbort
            ? "Shop validation timed out. Please retry or contact CeyPOS administration."
            : "Shop validation failed. Please contact CeyPOS administration.";
          setValidationMessage(message);
          setValidationState("error");
          setLastValidated(null);
        }
      } finally {
        window.clearTimeout(timeout);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [
    effectiveShopData,
    isLoaded,
    lastValidated,
    onShopStatusChange,
    retryToken,
    user,
  ]);

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (validationState === "checking") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Validating shop access…</p>
        </div>
      </div>
    );
  }

  if (validationState === "error") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="max-w-lg w-full bg-white shadow-xl rounded-2xl border border-gray-200 p-8 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">
            We hit a snag validating your shop
          </h2>
          {validationMessage && (
            <p className="text-sm text-gray-600 mb-6">{validationMessage}</p>
          )}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setRetryToken((token) => token + 1)}
              className="px-4 py-2 rounded-full bg-gray-900 text-white text-sm font-medium"
            >
              Retry validation
            </button>
            <button
              type="button"
              onClick={() => window.open("mailto:support@ceypossolutions.com")}
              className="px-4 py-2 rounded-full border border-gray-300 text-sm font-medium text-gray-700"
            >
              Contact support
            </button>
          </div>
        </div>
      </div>
    );
  }

  const forceWizard =
    accountType === "owner"
      ? validationState !== "ready"
      : !teamOnboarded || validationState !== "ready";

  return (
    <Routes>
      <Route path="/mobilesessions" element={<Navigate to="/mobilesessions/scan" replace />} />
      <Route path="/mobilesessions/scan" element={<MobileScan />} />
      <Route path="/team-onboard" element={<TeamOnboard />} />
      <Route
        path="/"
        element={
          <Navigate
            to={
              accountType === "team" && !teamOnboarded
                ? "/team-onboard"
                : forceWizard
                  ? accountType === "team"
                    ? "/team-onboard"
                    : "/shop-wizard"
                  : "/dashboard"
            }
            replace
          />
        }
      />
      <Route
        path="/home"
        element={
          <Navigate
            to={
              forceWizard
                ? accountType === "team"
                  ? "/team-onboard"
                  : "/shop-wizard"
                : "/dashboard"
            }
            replace
          />
        }
      />

      <Route
        path="/shop-wizard"
        element={
          accountType === "team" ? (
            <Navigate to="/team-onboard" replace />
          ) : forceWizard ? (
            <ShopWizard />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      <Route
        path="/dashboard/*"
        element={
          accountType === "team" && forceWizard ? (
            <Navigate to="/team-onboard" replace />
          ) : forceWizard && accountType === "owner" ? (
            <Navigate to="/shop-wizard" replace />
          ) : (
            <MainLayout />
          )
        }
      />

      <Route
        path="/about"
        element={
          <Navigate
            to={
              forceWizard
                ? accountType === "team"
                  ? "/team-onboard"
                  : "/shop-wizard"
                : "/dashboard"
            }
            replace
          />
        }
      />
      <Route
        path="/features"
        element={
          <Navigate
            to={
              forceWizard
                ? accountType === "team"
                  ? "/team-onboard"
                  : "/shop-wizard"
                : "/dashboard"
            }
            replace
          />
        }
      />
      <Route
        path="/pricing"
        element={
          <Navigate
            to={
              forceWizard
                ? accountType === "team"
                  ? "/team-onboard"
                  : "/shop-wizard"
                : "/dashboard"
            }
            replace
          />
        }
      />
      <Route
        path="/support"
        element={
          <Navigate
            to={
              forceWizard
                ? accountType === "team"
                  ? "/team-onboard"
                  : "/shop-wizard"
                : "/dashboard"
            }
            replace
          />
        }
      />
      <Route
        path="/contact"
        element={
          <Navigate
            to={
              forceWizard
                ? accountType === "team"
                  ? "/team-onboard"
                  : "/shop-wizard"
                : "/dashboard"
            }
            replace
          />
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AuthApiBridge() {
  const { getToken, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) {
      setAuthTokenGetter(null);
      return;
    }
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken, isLoaded]);

  return null;
}

function App() {
  // Set page title and favicon
  useEffect(() => {
    document.title = "CeyPOS - Point of Sale System";

    const favicon = document.querySelector(
      'link[rel="icon"]'
    ) as HTMLLinkElement;
    if (favicon) {
      favicon.href =
        'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🏪</text></svg>';
    }
  }, []);

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <AuthApiBridge />
      <Router>
        <AppRouter />
      </Router>
    </ClerkProvider>
  );
}

function AppRouter() {
  const { isSignedIn, isLoaded } = useAuth();

  // Show loading while Clerk is loading
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Public routes available regardless of auth state (e.g. e-receipt links).
  return (
    <Routes>
      <Route path="/r/:token" element={<PublicReceiptView />} />
      <Route
        path="*"
        element={isSignedIn ? <PostAuthApp /> : <PreAuthApp />}
      />
    </Routes>
  );
}

export default App;
