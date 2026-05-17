import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import QRCode from "qrcode";
import { useUser } from "@clerk/clerk-react";
import {
  CheckCircle,
  Copy,
  Loader2,
  QrCode,
  RefreshCw,
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
      const message = err instanceof Error ? err.message : "Failed to create session.";
      setSessionError(message);
      setSessionState("error");
    }
  };

  useEffect(() => {
    if (!sessionType) return;
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
      const action = typeof candidate.action === "string" ? candidate.action : "";
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
        className={`absolute right-0 bottom-0 top-[65px] ${sidebarCollapsed ? "md:left-16" : "md:left-60"} flex items-center justify-center p-3 md:p-5`}
      >
        <div className="relative z-10 flex w-full max-w-xl max-h-[calc(100vh-88px)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-200 p-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-gray-900">
              CeyPOS Mobile {flowLabel} Session
            </h2>
            <p className="text-sm text-gray-600">
              Scan with mobile camera, sign in with the same Google account, then continue to mobile {flowLabel.toLowerCase()}.
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

        <div className="space-y-4 overflow-y-auto p-5">
          <div className="grid gap-3 md:grid-cols-[210px,1fr]">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="mx-auto flex h-[185px] w-[185px] items-center justify-center rounded-lg border border-gray-300 bg-white">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Mobile session QR code" className="h-[170px] w-[170px]" />
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
                <p className="text-xs uppercase tracking-wide text-gray-500">Status</p>
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-800">
                  {sessionState === "linked" ? (
                    <CheckCircle size={16} className="text-green-600" />
                  ) : sessionState === "creating" || sessionState === "pending" ? (
                    <Loader2 size={16} className="animate-spin text-gray-500" />
                  ) : (
                    <Wifi size={16} className="text-gray-500" />
                  )}
                  <span>{statusLine}</span>
                </div>
                {sessionState === "pending" && secondsRemaining > 0 && (
                  <p className="mt-2 text-xs text-gray-500">Expires in {secondsRemaining}s</p>
                )}
                {sessionState === "linked" && linkedAt && (
                  <p className="mt-2 text-xs text-green-700">Linked at {linkedAt}</p>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Session Scope</p>
                <p className="mt-1 break-all text-xs text-gray-800">{scopedOwnerEmail}</p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Mobile Steps</p>
                <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-gray-700">
                  <li>Scan QR with mobile camera.</li>
                  <li>Sign in with same Google account as desktop.</li>
                  <li>Allow camera access on mobile browser.</li>
                  <li>Start scanning for {flowLabel.toLowerCase()}.</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 -mx-5 -mb-5 mt-1 flex flex-wrap items-center gap-2 border-t border-gray-200 bg-white px-5 py-3">
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
            <Button variant="secondary" onClick={() => void createSession()} disabled={sessionState === "creating"}>
              <RefreshCw size={14} className="mr-1" />
              New QR
            </Button>
            <div className="ml-auto">
              <Button variant="primary" onClick={onClose}>
                {sessionState === "linked" ? "Done" : "Close"}
              </Button>
            </div>
          </div>

          {!canCreateSession && (
            <p className="text-sm text-red-600">
              Missing authenticated shop/account context. Re-login on desktop and retry.
            </p>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};

export const Sessions: React.FC = () => {
  const { activeShopId, isSidebarCollapsed } = useApp();
  const { user } = useUser();
  const userEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    "";
  const userId = user?.id ?? null;
  const shopId = activeShopId ?? "";

  const [showWizard, setShowWizard] = useState(false);
  const [activeSession, setActiveSession] = useState<MobileSessionType | null>(null);
  const [sessionFeed, setSessionFeed] = useState<
    Array<{
      sessionId: string;
      type: string;
      status: "created" | "linked";
      at: string;
      actor?: string;
    }>
  >([]);

  useEffect(() => {
    if (!shopId) return;
    const unsubscribe = db.on("sessionUpdated", (event: unknown) => {
      if (!event || typeof event !== "object") return;
      const candidate = event as Record<string, unknown>;
      const payload =
        candidate.payload && typeof candidate.payload === "object"
          ? (candidate.payload as Record<string, unknown>)
          : {};
      const action = typeof candidate.action === "string" ? candidate.action : "";
      if (action !== "linked" && action !== "created") return;
      const sessionId = String(payload.sessionId || "");
      const type = String(payload.sessionType || "");
      if (!sessionId) return;
      const actor = String(payload.linkedBy || payload.createdBy || "");
      setSessionFeed((prev) => [
        {
          sessionId,
          type,
          status: action as "created" | "linked",
          at: new Date().toLocaleTimeString(),
          actor: actor || undefined,
        },
        ...prev.filter((item) => item.sessionId !== sessionId),
      ].slice(0, 5));
    });
    return () => unsubscribe();
  }, [shopId]);

  const activeByType = useMemo(() => {
    const map: Partial<Record<MobileSessionType, boolean>> = {};
    for (const item of sessionFeed) {
      if ((item.type === "barcode" || item.type === "checkout") && item.status === "linked") {
        map[item.type] = true;
      }
    }
    return map;
  }, [sessionFeed]);

  const startSession = (sessionType: MobileSessionType) => {
    setActiveSession(sessionType);
    setShowWizard(true);
  };

  const cards: Array<{
    id: MobileSessionType;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
  }> = [
    {
      id: "barcode",
      title: "Start Import Session",
      description: "Create a secure mobile barcode-import session for this exact shop account.",
      icon: <QrCode size={28} />,
      color: "#b39efc",
    },
    {
      id: "checkout",
      title: "Start Checkout Session",
      description: "Create a secure mobile checkout session for real-time cart sync with desktop.",
      icon: <Smartphone size={28} />,
      color: "#ef94b5",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="heading-h2">Mobile Sessions</h1>
        <p className="mt-2 text-gray-600">
          Start an Import or Checkout mobile session, scan QR, authenticate with the same Google account, and continue in real time.
        </p>
      </div>

      <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-5 md:grid-cols-2">
        {cards.map((session) => (
          <motion.div key={session.id} whileHover={{ y: -3 }} transition={{ duration: 0.15 }}>
            <Card className="mx-auto h-full w-full max-w-md border border-gray-100 transition-shadow duration-200 hover:shadow-lg">
              <div className="space-y-4 p-5">
                <div className="flex items-start justify-between">
                  <div className="rounded-lg p-3" style={{ backgroundColor: `${session.color}20` }}>
                    <div style={{ color: session.color }}>{session.icon}</div>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">Secure QR</span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900">{session.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-600">{session.description}</p>
                </div>
                <Button
                  variant="primary"
                  onClick={() => startSession(session.id)}
                  className="w-full"
                  disabled={!shopId || !userEmail}
                  style={{ backgroundColor: session.color, color: "#0f172a", border: "none" }}
                >
                  {activeByType[session.id] ? "Link Another Device" : "Start Session"}
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="border border-gray-100">
        <div className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Active & Recent Sessions</h2>
          {sessionFeed.length === 0 ? (
            <p className="text-sm text-gray-500">No session activity yet.</p>
          ) : (
            <div className="space-y-2">
              {sessionFeed.map((item) => (
                <div key={item.sessionId} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {item.type || "session"}{" "}
                      <span className={item.status === "linked" ? "text-green-700" : "text-amber-700"}>
                        ({item.status === "linked" ? "active" : "pending"})
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">{item.sessionId}</p>
                    {item.actor && <p className="text-xs text-gray-500">{item.actor}</p>}
                  </div>
                  <span className="text-xs text-gray-600">{item.at}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <AnimatePresence>
        {showWizard && (
          <SessionWizard
            sessionType={activeSession}
            onClose={() => {
              setShowWizard(false);
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
