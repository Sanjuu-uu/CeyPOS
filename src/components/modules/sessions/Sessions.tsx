import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import QRCode from "qrcode";
import { useUser } from "@clerk/clerk-react";
import {
  CheckCircle,
  Copy,
  Loader2,
  MonitorSpeaker,
  QrCode,
  RefreshCw,
  Shield,
  Smartphone,
  Wifi,
  X,
} from "lucide-react";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { postJSON } from "../../../lib/api";
import { db } from "../../../lib/db";
import { useApp } from "../../../context/AppContext";

type MobileSessionType = "barcode" | "checkout";
type SessionType = MobileSessionType | "cashier";

// ─── Cashier Wizard (2FA flow) ────────────────────────────────────────────────

interface CashierWizardProps {
  onClose: () => void;
  sidebarCollapsed: boolean;
}

const CashierWizard: React.FC<CashierWizardProps> = ({
  onClose,
  sidebarCollapsed,
}) => {
  const [step, setStep] = useState(1);
  const [twoFACode, setTwoFACode] = useState("CY-4829-3761");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const handleConnect = () => {
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
      setIsConnected(true);
      setTimeout(() => onClose(), 2000);
    }, 3000);
  };

  const generateNewCode = () => {
    const newCode = `CY-${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`;
    setTwoFACode(newCode);
  };

  return (
    <div className="fixed inset-0 z-40">
      <div
        className={`absolute right-0 bottom-0 top-[40px] ${sidebarCollapsed ? "md:left-16" : "md:left-60"} bg-black/10 backdrop-blur-sm`}
      />
      <div
        className={`absolute right-0 bottom-0 top-[65px] ${sidebarCollapsed ? "md:left-16" : "md:left-60"} flex items-center justify-center px-3 py-2 md:px-5 md:py-3`}
      >
        <div
          className="relative z-10 w-full max-w-2xl flex flex-col bg-white shadow-2xl overflow-hidden"
          style={{
            borderRadius: "var(--radius--16px)",
            border: "1px solid var(--gray--200)",
            maxHeight: "min(900px, calc(100dvh - 120px))",
          }}
        >
          {/* Header */}
          <div
            className="p-6 border-b flex-shrink-0"
            style={{ borderColor: "var(--gray--200)" }}
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: "var(--gray--100)" }}
                >
                  <MonitorSpeaker size={24} />
                </div>
                <div>
                  <h2
                    className="text-xl font-bold"
                    style={{ color: "var(--gray--900)" }}
                  >
                    Connect Cashier Device
                  </h2>
                  <p
                    className="text-sm"
                    style={{ color: "var(--gray--600)" }}
                  >
                    Connect another cashier terminal to your shop
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3].map((stepNum) => (
                <div key={stepNum} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                      stepNum <= step ? "text-black" : "text-gray-400"
                    }`}
                    style={{
                      backgroundColor:
                        stepNum <= step ? "#c5f542" : "var(--gray--200)",
                    }}
                  >
                    {isConnected ? <CheckCircle size={16} /> : stepNum}
                  </div>
                  {stepNum < 3 && (
                    <div
                      className="w-8 h-0.5 mx-2 transition-all duration-200"
                      style={{
                        backgroundColor:
                          stepNum < step ? "#c5f542" : "var(--gray--200)",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 flex flex-col items-center justify-center min-h-0 overflow-y-auto">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center space-y-6 w-full max-w-sm"
                >
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">
                      Initialize Connection
                    </h3>
                    <p className="text-gray-600">
                      Preparing to connect your cashier device
                    </p>
                  </div>
                  <div
                    className="p-6 rounded-lg border"
                    style={{
                      borderColor: "var(--gray--200)",
                      backgroundColor: "var(--gray--50)",
                    }}
                  >
                    <Wifi size={48} className="mx-auto mb-4 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      Make sure your device is connected to the same network
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => setStep(2)}
                    className="w-full"
                  >
                    Start Connection
                  </Button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center space-y-6 w-full max-w-sm"
                >
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Enter 2FA Code</h3>
                    <p className="text-gray-600">
                      Enter this code on your cashier device
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div
                      className="p-6 rounded-lg border text-center"
                      style={{
                        borderColor: "var(--gray--200)",
                        backgroundColor: "var(--gray--50)",
                      }}
                    >
                      <Shield
                        size={32}
                        className="mx-auto mb-4 text-gray-600"
                      />
                      <div
                        className="text-3xl font-mono font-bold mb-4"
                        style={{ color: "var(--gray--900)" }}
                      >
                        {twoFACode}
                      </div>
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() =>
                            navigator.clipboard.writeText(twoFACode)
                          }
                          className="flex items-center gap-2 px-3 py-1 rounded text-sm hover:bg-gray-200 transition-colors"
                        >
                          <Copy size={14} />
                          Copy
                        </button>
                        <button
                          onClick={generateNewCode}
                          className="flex items-center gap-2 px-3 py-1 rounded text-sm hover:bg-gray-200 transition-colors"
                        >
                          <RefreshCw size={14} />
                          New Code
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Code expires in 5 minutes
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => setStep(3)}
                    className="w-full"
                  >
                    Continue
                  </Button>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center space-y-6 w-full max-w-sm"
                >
                  {!isConnecting && !isConnected && (
                    <>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold">
                          Ready to Connect
                        </h3>
                        <p className="text-gray-600">
                          Click connect to establish the session
                        </p>
                      </div>
                      <div
                        className="p-6 rounded-lg border"
                        style={{
                          borderColor: "var(--gray--200)",
                          backgroundColor: "var(--gray--50)",
                        }}
                      >
                        <div className="flex items-center gap-3 justify-center mb-4">
                          <MonitorSpeaker size={24} />
                          <span className="text-lg font-medium">
                            Connect Cashier Device
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Session will be active for this shop
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        onClick={handleConnect}
                        className="w-full"
                      >
                        Connect Device
                      </Button>
                    </>
                  )}

                  {isConnecting && (
                    <>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold">
                          Connecting...
                        </h3>
                        <p className="text-gray-600">
                          Establishing secure connection
                        </p>
                      </div>
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500" />
                      </div>
                    </>
                  )}

                  {isConnected && (
                    <>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-green-600">
                          Connected Successfully!
                        </h3>
                        <p className="text-gray-600">
                          Your device is now connected to the shop
                        </p>
                      </div>
                      <div className="flex items-center justify-center">
                        <CheckCircle size={64} className="text-green-500" />
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Mobile Session Wizard (QR flow) ─────────────────────────────────────────

interface SessionWizardProps {
  sessionType: MobileSessionType | null;
  onClose: () => void;
  shopId: string;
  userEmail: string;
  userId: string | null;
  sidebarCollapsed: boolean;
}

type SessionState = "idle" | "creating" | "pending" | "linked" | "error";

const extractOwnerEmail = (shopId: string) => {
  const value = String(shopId || "").trim();
  const idIndex = value.indexOf("_id");
  if (idIndex > 0) {
    return value.slice(0, idIndex);
  }
  return value;
};

const SessionWizard: React.FC<SessionWizardProps> = ({
  sessionType,
  onClose,
  shopId,
  userEmail,
  userId,
  sidebarCollapsed,
}) => {
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [sessionLink, setSessionLink] = useState<string | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [linkedAt, setLinkedAt] = useState<string | null>(null);
  const createCalledRef = useRef(false);

  const canCreateSession = Boolean(shopId && userEmail && sessionType);
  const flowLabel = sessionType === "checkout" ? "Checkout" : "Import";
  const scopedOwnerEmail = useMemo(() => extractOwnerEmail(shopId), [shopId]);
  const createdSessionId = useMemo(() => {
    if (!sessionLink) return "";
    try {
      return new URL(sessionLink).searchParams.get("session") || "";
    } catch {
      return "";
    }
  }, [sessionLink]);

  const createSession = async () => {
    if (!canCreateSession || !sessionType) return;
    setSessionState("creating");
    setSessionError(null);
    setQrDataUrl(null);
    setSessionLink(null);
    setLinkedAt(null);

    try {
      const result = await postJSON<{
        sessionId: string;
        scanUrl: string | null;
        expiresAt: string;
      }>("/api/mobile/sessions/create", {
        shopId,
        sessionType,
        userEmail,
        userId,
        deviceMeta: {
          userAgent: navigator.userAgent,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });

      if (!result?.scanUrl) {
        throw new Error("Failed to generate QR session URL.");
      }

      const qrUrl = await QRCode.toDataURL(result.scanUrl, {
        width: 260,
        margin: 2,
        color: { dark: "#0f172a", light: "#ffffff" },
      });

      setQrDataUrl(qrUrl);
      setSessionLink(result.scanUrl);
      setSessionExpiresAt(result.expiresAt);
      setSessionState("pending");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create session.";
      setSessionError(message);
      setSessionState("error");
    }
  };

  useEffect(() => {
    if (!sessionType || createCalledRef.current) return;
    createCalledRef.current = true;
    void createSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionType, shopId, userEmail]);

  useEffect(() => {
    if (!sessionExpiresAt || sessionState === "linked") {
      setSecondsRemaining(0);
      return;
    }

    const tick = () => {
      const ms = Date.parse(sessionExpiresAt) - Date.now();
      const next = Math.max(0, Math.floor(ms / 1000));
      setSecondsRemaining(next);
      if (next === 0 && sessionState === "pending") {
        setSessionState("error");
        setSessionError("Session expired. Generate a new QR code.");
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [sessionExpiresAt, sessionState]);

  useEffect(() => {
    if (!createdSessionId || !shopId) return;
    const unsubscribe = db.on("sessionUpdated", (event: unknown) => {
      if (!event || typeof event !== "object") return;
      const candidate = event as Record<string, unknown>;
      const payload =
        candidate.payload && typeof candidate.payload === "object"
          ? (candidate.payload as Record<string, unknown>)
          : {};
      const action =
        typeof candidate.action === "string" ? candidate.action : "";
      if (payload.sessionId !== createdSessionId) return;
      if (action === "linked") {
        setSessionState("linked");
        setLinkedAt(new Date().toLocaleTimeString());
      }
    });
    return () => unsubscribe();
  }, [createdSessionId, shopId]);

  if (!sessionType) return null;

  const statusLine =
    sessionState === "creating"
      ? "Generating secure QR session..."
      : sessionState === "pending"
        ? "Waiting for mobile sign-in and session validation..."
        : sessionState === "linked"
          ? "Mobile authenticated and linked to this shop."
          : sessionError || "Session not ready.";

  return (
    <div className="fixed inset-0 z-40">
      <div
        className={`absolute right-0 bottom-0 top-[40px] ${sidebarCollapsed ? "md:left-16" : "md:left-60"} bg-black/10 backdrop-blur-sm`}
      />
      <div
        className={`absolute right-0 bottom-0 top-[65px] ${sidebarCollapsed ? "md:left-16" : "md:left-60"} flex items-center justify-center px-3 py-2 md:px-5 md:py-3`}
      >
        <div className="relative z-10 flex w-full max-w-xl max-h-[min(900px,calc(100dvh-120px))] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-gray-200 p-6">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-gray-900">
                CeyPOS Mobile {flowLabel} Session
              </h2>
              <p className="text-sm text-gray-600">
                Scan with mobile camera, sign in with the same Google account,
                then continue to mobile {flowLabel.toLowerCase()}.
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 transition-colors hover:bg-gray-100"
              aria-label="Close session wizard"
            >
              <X size={18} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="grid gap-3 md:grid-cols-[210px,1fr]">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="mx-auto flex h-[185px] w-[180px] items-center justify-center rounded-lg border border-gray-300 bg-white">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Mobile session QR code"
                      className="h-[170px] w-[170px]"
                    />
                  ) : (
                    <div className="text-center text-gray-500">
                      {sessionState === "creating" ? (
                        <Loader2 size={42} className="mx-auto animate-spin" />
                      ) : (
                        <QrCode size={52} className="mx-auto" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Status
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-800">
                    {sessionState === "linked" ? (
                      <CheckCircle size={16} className="text-green-600" />
                    ) : sessionState === "creating" ||
                      sessionState === "pending" ? (
                      <Loader2 size={16} className="animate-spin text-gray-500" />
                    ) : (
                      <Wifi size={16} className="text-gray-500" />
                    )}
                    <span>{statusLine}</span>
                  </div>
                  {sessionState === "pending" && secondsRemaining > 0 && (
                    <p className="mt-2 text-xs text-gray-500">
                      Expires in {secondsRemaining}s
                    </p>
                  )}
                  {sessionState === "linked" && linkedAt && (
                    <p className="mt-2 text-xs text-green-700">
                      Linked at {linkedAt}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Session Scope
                  </p>
                  <p className="mt-1 break-all text-xs text-gray-800">
                    {scopedOwnerEmail}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Mobile Steps
                  </p>
                  <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-gray-700">
                    <li>Scan QR with mobile camera.</li>
                    <li>Sign in with same Google account as desktop.</li>
                    <li>Allow camera access on mobile browser.</li>
                    <li>Start scanning for {flowLabel.toLowerCase()}.</li>
                  </ol>
                </div>
              </div>
            </div>

            {!canCreateSession && (
              <p className="mt-3 text-sm text-red-600">
                Missing authenticated shop/account context. Re-login on desktop
                and retry.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 bg-white px-5 py-3">
            <Button
              variant="secondary"
              onClick={() => {
                if (sessionLink) navigator.clipboard.writeText(sessionLink);
              }}
              disabled={!sessionLink}
            >
              <Copy size={14} className="mr-1" />
              Copy Link
            </Button>
            <Button
              variant="secondary"
              onClick={() => void createSession()}
              disabled={sessionState === "creating"}
            >
              <RefreshCw size={14} className="mr-1" />
              New QR
            </Button>
            <div className="ml-auto">
              <Button variant="primary" onClick={onClose}>
                {sessionState === "linked" ? "Done" : "Close"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Sessions Page ────────────────────────────────────────────────────────────

export const Sessions: React.FC = () => {
  const { activeShopId, isSidebarCollapsed } = useApp();
  const { user } = useUser();
  const userEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    "";
  const userId = user?.id ?? null;
  const shopId = activeShopId ?? "";

  const [showCashierWizard, setShowCashierWizard] = useState(false);
  const [showMobileWizard, setShowMobileWizard] = useState(false);
  const [activeSession, setActiveSession] = useState<MobileSessionType | null>(
    null,
  );
  const [sessionFeed, setSessionFeed] = useState<
    Array<{
      sessionId: string;
      type: string;
      status: "created" | "linked";
      at: string;
      actor?: string;
    }>
  >([]);

  // Restore feed from localStorage when shop is known
  useEffect(() => {
    if (!shopId) return;
    try {
      const raw = localStorage.getItem(`ceypos_session_feed_${shopId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessionFeed(parsed);
        }
      }
    } catch {
      // ignore parse errors
    }
  }, [shopId]);

  // Persist feed to localStorage whenever it changes
  useEffect(() => {
    if (!shopId) return;
    try {
      localStorage.setItem(
        `ceypos_session_feed_${shopId}`,
        JSON.stringify(sessionFeed),
      );
    } catch {
      // ignore storage errors
    }
  }, [sessionFeed, shopId]);

  useEffect(() => {
    if (!shopId) return;
    const unsubscribe = db.on("sessionUpdated", (event: unknown) => {
      if (!event || typeof event !== "object") return;
      const candidate = event as Record<string, unknown>;
      const payload =
        candidate.payload && typeof candidate.payload === "object"
          ? (candidate.payload as Record<string, unknown>)
          : {};
      const action =
        typeof candidate.action === "string" ? candidate.action : "";
      if (action !== "linked" && action !== "created") return;
      const sessionId = String(payload.sessionId || "");
      const type = String(payload.sessionType || "");
      if (!sessionId) return;
      const actor = String(payload.linkedBy || payload.createdBy || "");
      setSessionFeed((prev) =>
        [
          {
            sessionId,
            type,
            status: action as "created" | "linked",
            at: new Date().toLocaleTimeString(),
            actor: actor || undefined,
          },
          ...prev.filter((item) => item.sessionId !== sessionId),
        ].slice(0, 5),
      );
    });
    return () => unsubscribe();
  }, [shopId]);

  const activeByType = useMemo(() => {
    const map: Partial<Record<MobileSessionType, boolean>> = {};
    for (const item of sessionFeed) {
      if (
        (item.type === "barcode" || item.type === "checkout") &&
        item.status === "linked"
      ) {
        map[item.type] = true;
      }
    }
    return map;
  }, [sessionFeed]);

  const startSession = (sessionType: SessionType) => {
    if (sessionType === "cashier") {
      setShowCashierWizard(true);
    } else {
      setActiveSession(sessionType);
      setShowMobileWizard(true);
    }
  };

  const sessions: Array<{
    id: SessionType;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    features: string[];
  }> = [
    {
      id: "cashier",
      title: "Connect Cashier Device",
      description:
        "Connect another cashier terminal to your shop for multiple point-of-sale operations",
      icon: <MonitorSpeaker size={32} />,
      color: "#c5f542",
      features: ["Multi-terminal support", "2FA authentication", "Real-time sync"],
    },
    {
      id: "barcode",
      title: "Start Import Session",
      description:
        "Create a secure mobile barcode-import session for this exact shop account.",
      icon: <QrCode size={32} />,
      color: "#b39efc",
      features: ["Mobile barcode scanning", "Inventory sync", "Offline capability"],
    },
    {
      id: "checkout",
      title: "Start Checkout Session",
      description:
        "Create a secure mobile checkout session for real-time cart sync with desktop.",
      icon: <Smartphone size={32} />,
      color: "#ef94b5",
      features: ["Mobile checkout", "Customer management", "Receipt generation"],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-h2">Device Sessions</h1>
          <p className="text-gray-600 mt-2">
            Connect and manage different devices with your CeyPoS shop
          </p>
        </div>
      </div>

      {/* Session Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.map((session) => (
          <motion.div
            key={session.id}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="h-full border border-gray-100 hover:shadow-lg transition-all duration-200">
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: `${session.color}20` }}
                  >
                    <div style={{ color: session.color }}>{session.icon}</div>
                  </div>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor:
                        (session.id === "barcode" ||
                          session.id === "checkout") &&
                        activeByType[session.id as MobileSessionType]
                          ? "#22c55e"
                          : "#e5e7eb",
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-lg text-gray-900">
                    {session.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {session.description}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-900">
                    Features:
                  </h4>
                  <ul className="space-y-1">
                    {session.features.map((feature, index) => (
                      <li
                        key={index}
                        className="flex items-center gap-2 text-xs text-gray-600"
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: session.color }}
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  variant="primary"
                  onClick={() => startSession(session.id)}
                  className="w-full mt-4"
                  disabled={
                    session.id !== "cashier" && (!shopId || !userEmail)
                  }
                  style={{
                    backgroundColor: session.color,
                    color: "black",
                    border: "none",
                  }}
                >
                  {(session.id === "barcode" || session.id === "checkout") &&
                  activeByType[session.id as MobileSessionType]
                    ? "Link Another Device"
                    : "Start Session"}
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Active Sessions */}
      <Card className="border border-gray-100">
        <div className="p-6">
          <h2 className="font-semibold text-lg mb-4">Active Sessions</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <div>
                  <p className="font-medium text-green-900">Main Terminal</p>
                  <p className="text-sm text-green-700">
                    Current device — Always active
                  </p>
                </div>
              </div>
              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                ACTIVE
              </span>
            </div>

            {sessionFeed.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Wifi size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No additional sessions active</p>
                <p className="text-xs mt-1">
                  Start a session above to connect more devices
                </p>
              </div>
            ) : (
              sessionFeed.map((item) => (
                <div
                  key={item.sessionId}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {item.type || "session"}{" "}
                      <span
                        className={
                          item.status === "linked"
                            ? "text-green-700"
                            : "text-amber-700"
                        }
                      >
                        ({item.status === "linked" ? "active" : "pending"})
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">{item.sessionId}</p>
                    {item.actor && (
                      <p className="text-xs text-gray-500">{item.actor}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-600">{item.at}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      <AnimatePresence>
        {showCashierWizard && (
          <CashierWizard
            onClose={() => setShowCashierWizard(false)}
            sidebarCollapsed={isSidebarCollapsed}
          />
        )}
        {showMobileWizard && (
          <SessionWizard
            sessionType={activeSession}
            onClose={() => {
              setShowMobileWizard(false);
              setActiveSession(null);
            }}
            shopId={shopId}
            userEmail={userEmail}
            userId={userId}
            sidebarCollapsed={isSidebarCollapsed}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
