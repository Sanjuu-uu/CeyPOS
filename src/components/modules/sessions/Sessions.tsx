import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import QRCode from "qrcode";
import { useUser } from "@clerk/clerk-react";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { postJSON, getJSON } from "../../../lib/api";
import { db } from "../../../lib/db";
import { useApp } from "../../../context/AppContext";
import { RegisterTerminalWizard } from "./RegisterTerminalWizard";

type MobileSessionType = "barcode" | "checkout";
type SessionType = MobileSessionType | "register";

// ─── Mobile Session Wizard (QR flow) ─────────────────────────────────────────

interface SessionWizardProps {
  sessionType: MobileSessionType | null;
  onClose: () => void;
  shopId: string;
  userEmail: string;
  userId: string | null;
  sidebarCollapsed: boolean;
  onSessionCreated?: (sessionId: string, scanUrl: string, expiresAt: string) => void;
}

// ─── Detail panel helpers ─────────────────────────────────────────────────────

/** Renders a QR code from a scan URL, self-contained with loading state. */
const SessionQR: React.FC<{ scanUrl: string }> = ({ scanUrl }) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    void QRCode.toDataURL(scanUrl, {
      width: 160,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    }).then(setDataUrl).catch(() => setDataUrl(null));
  }, [scanUrl]);

  if (!dataUrl) {
    return (
      <div className="w-[140px] h-[140px] flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <span className="text-xs font-medium text-gray-400">Loading QR</span>
      </div>
    );
  }
  return (
    <img
      src={dataUrl}
      alt="Session QR code"
      className="w-[140px] h-[140px] rounded-lg border border-gray-200"
    />
  );
};

/** Live countdown until session expiry. */
const SessionExpiry: React.FC<{ expiresAt: string }> = ({ expiresAt }) => {
  const [secs, setSecs] = useState(() =>
    Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000)),
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecs(Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  if (secs <= 0) {
    return <span className="text-xs font-medium text-red-500">Expired</span>;
  }
  return (
    <span className="text-xs font-medium text-amber-600">
      Expires in {secs}s
    </span>
  );
};

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
  onSessionCreated,
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
      onSessionCreated?.(result.sessionId, result.scanUrl, result.expiresAt);
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
        className={`absolute right-0 bottom-0 top-[60px] left-0 ${sidebarCollapsed ? "md:left-16" : "md:left-60"} bg-black/10 backdrop-blur-sm`}
      />
      <div
        className={`absolute right-0 bottom-0 top-[60px] left-0 ${sidebarCollapsed ? "md:left-16" : "md:left-60"} flex items-center justify-center p-4 md:p-6`}
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
              className="rounded-lg border border-[#dfdfda] bg-white px-3 py-2 text-xs font-medium text-[#555550] transition-colors hover:border-black hover:text-black"
              aria-label="Close session wizard"
            >
              Close
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
                        <span className="text-sm font-medium">Creating...</span>
                      ) : (
                        <span className="text-sm font-medium">QR pending</span>
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
                    <span className={`h-2 w-2 rounded-full ${sessionState === "linked" ? "bg-green-500" : sessionState === "error" ? "bg-red-500" : "bg-amber-400"}`} />
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
              variant="primary"
              className="bg-[#c5f542] text-black hover:bg-[#b8ea34]"
              onClick={() => {
                if (sessionLink) navigator.clipboard.writeText(sessionLink);
              }}
              disabled={!sessionLink}
            >
              Copy Link
            </Button>
            <Button
              variant="primary"
              className="bg-[#c5f542] text-black hover:bg-[#b8ea34]"
              onClick={() => void createSession()}
              disabled={sessionState === "creating"}
            >
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
  const { activeShopId, isSidebarCollapsed, memberScope, setCurrentModule, currentUser } = useApp();
  const { user } = useUser();
  const userEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    "";
  const userId = user?.id ?? null;
  const shopId = activeShopId ?? "";
  const canManageTerminals =
    memberScope?.role === "owner" || memberScope?.role === "manager";

  const [showRegisterWizard, setShowRegisterWizard] = useState(false);
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
      expiresAt?: string;
    }>
  >([]);
  const [registerTerminals, setRegisterTerminals] = useState<
    Array<{
      terminalId: string;
      label: string;
      pairedMemberName?: string;
      lastSeenAt?: string | null;
    }>
  >([]);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [confirmingRevoke, setConfirmingRevoke] = useState<string | null>(null);
  const [revokingSession, setRevokingSession] = useState<string | null>(null);
  const [sessionScanUrls, setSessionScanUrls] = useState<
    Record<string, { scanUrl: string; expiresAt: string }>
  >({});

  const registerTerminalLimit = memberScope?.plan.maxRegisterTerminals ?? 0;
  const registerTerminalCount = registerTerminals.length;
  // TEMP: bypass register cap so terminal pairing can be tested freely.
  const registerLimitReached = false;
  const registerLimitText = `${registerTerminalCount}/${registerTerminalLimit} registers`;

  const refreshActiveSessions = useCallback(async () => {
    if (!shopId || !userEmail) return;
    try {
      const data = await getJSON<{
        ok: boolean;
        terminals: Array<{
          terminal_id: string;
          terminal_type: string;
          label: string;
          paired_member_name?: string;
          last_seen_at?: string | null;
        }>;
        mobileSessions: Array<{
          session_id: string;
          session_type: string;
          status: string;
          created_at: string;
          expires_at: string;
          created_by_email?: string;
          scan_url?: string | null;
        }>;
      }>(
        `/api/terminals/active?shopId=${encodeURIComponent(shopId)}&userEmail=${encodeURIComponent(userEmail)}`,
      );

      setRegisterTerminals(
        (data.terminals || [])
          .filter((terminal) => terminal.terminal_type === "register")
          .map((terminal) => ({
            terminalId: terminal.terminal_id,
            label: terminal.label,
            pairedMemberName: terminal.paired_member_name,
            lastSeenAt: terminal.last_seen_at,
          })),
      );

      setSessionFeed(
        (data.mobileSessions || []).map((session) => ({
          sessionId: session.session_id,
          type: session.session_type,
          status: session.status === "active" ? "linked" : "created",
          at: new Date(session.created_at).toLocaleTimeString(),
          actor: session.created_by_email,
          expiresAt: session.expires_at,
        })),
      );

      const scanMap: Record<string, { scanUrl: string; expiresAt: string }> = {};
      for (const session of data.mobileSessions || []) {
        if (session.scan_url) {
          scanMap[session.session_id] = {
            scanUrl: session.scan_url,
            expiresAt: session.expires_at,
          };
        }
      }
      setSessionScanUrls((prev) => ({ ...prev, ...scanMap }));
    } catch {
      // keep current UI state on transient failures
    }
  }, [shopId, userEmail]);

  useEffect(() => {
    void refreshActiveSessions();
  }, [refreshActiveSessions]);

  useEffect(() => {
    if (!shopId) return;
    const unsubscribe = db.on("sessionUpdated", () => {
      void refreshActiveSessions();
    });
    return () => unsubscribe();
  }, [shopId, refreshActiveSessions]);

  // ── Auto-delete pending sessions when they expire ────────────────────────────
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (const item of sessionFeed) {
      if (item.status === "linked") continue;

      // Prefer expiresAt from scanUrls map, fall back to feed item field
      const expiresAt = sessionScanUrls[item.sessionId]?.expiresAt ?? item.expiresAt;
      if (!expiresAt) continue;

      const msLeft = Date.parse(expiresAt) - Date.now();
      if (msLeft <= 0) {
        // Already expired — queue microtask so we don't setState during render
        const id = setTimeout(() => {
          setSessionFeed((prev) => prev.filter((f) => f.sessionId !== item.sessionId));
          setSessionScanUrls((prev) => {
            const next = { ...prev };
            delete next[item.sessionId];
            return next;
          });
          setExpandedSession((prev) => (prev === item.sessionId ? null : prev));
          setConfirmingRevoke((prev) => (prev === item.sessionId ? null : prev));
          // Fire-and-forget revoke so the server record is also cleaned up
          void postJSON("/api/mobile/sessions/revoke", {
            sessionId: item.sessionId,
            shopId,
            userEmail,
          }).catch(() => { /* already gone on server */ });
        }, 0);
        timers.push(id);
      } else {
        const id = setTimeout(() => {
          setSessionFeed((prev) => prev.filter((f) => f.sessionId !== item.sessionId));
          setSessionScanUrls((prev) => {
            const next = { ...prev };
            delete next[item.sessionId];
            return next;
          });
          setExpandedSession((prev) => (prev === item.sessionId ? null : prev));
          setConfirmingRevoke((prev) => (prev === item.sessionId ? null : prev));
          void postJSON("/api/mobile/sessions/revoke", {
            sessionId: item.sessionId,
            shopId,
            userEmail,
          }).catch(() => { /* already gone on server */ });
        }, msLeft);
        timers.push(id);
      }
    }

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionFeed, sessionScanUrls]);

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

  const handleRevoke = async (sessionId: string) => {
    setRevokingSession(sessionId);
    try {
      await postJSON("/api/mobile/sessions/revoke", { sessionId, shopId, userEmail });
      await refreshActiveSessions();
      setExpandedSession((prev) => (prev === sessionId ? null : prev));
    } catch {
      await refreshActiveSessions();
    } finally {
      setRevokingSession(null);
      setConfirmingRevoke(null);
    }
  };

  const handleRevokeTerminal = async (terminalId: string) => {
    setRevokingSession(terminalId);
    try {
      await postJSON("/api/terminals/revoke", { terminalId, shopId, userEmail });
      await refreshActiveSessions();
    } finally {
      setRevokingSession(null);
      setConfirmingRevoke(null);
    }
  };

  const handleSessionCreated = (
    sessionId: string,
    scanUrl: string,
    expiresAt: string,
  ) => {
    if (shopId && activeSession) {
      const normalizedShop = String(shopId).replace(/^shop_/, "");
      localStorage.setItem(
        `ceypos:mobile-session:${normalizedShop}:${activeSession}`,
        sessionId,
      );
    }
    setSessionScanUrls((prev) => ({ ...prev, [sessionId]: { scanUrl, expiresAt } }));
    void refreshActiveSessions();
  };

  const startSession = (sessionType: SessionType) => {
    if (sessionType === "register") {
      if (!canManageTerminals || registerLimitReached) {
        return;
      }
      setShowRegisterWizard(true);
    } else {
      setActiveSession(sessionType);
      setShowMobileWizard(true);
    }
  };

  const sessions: Array<{
    id: SessionType;
    title: string;
    description: string;
    features: string[];
  }> = [
    {
      id: "barcode",
      title: "Start Import Session",
      description:
        "Create a secure mobile barcode-import session for this exact shop account.",
      features: ["Mobile barcode scanning", "Inventory sync", "Offline capability"],
    },
    {
      id: "checkout",
      title: "Start Checkout Session",
      description:
        "Create a secure mobile checkout session for real-time cart sync with desktop.",
      features: ["Mobile checkout", "Customer management", "Receipt generation"],
    },
  ];

  if (canManageTerminals) {
    sessions.unshift({
      id: "register",
      title: "Connect Register Terminal",
      description:
        "Pair an additional register terminal for multi-station checkout with owner approval",
      features: ["Multi-terminal support", "Secure pairing code", "Real-time sync"],
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="page-subheading mt-2">
            Connect and manage different devices with your CeyPoS shop
          </p>
        </div>
      </div>

      {/* Session Cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {sessions.map((session) => (
          <motion.div
            key={session.id}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="h-full transition-all duration-200">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor:
                        (session.id === "barcode" ||
                          session.id === "checkout") &&
                        activeByType[session.id as MobileSessionType]
                        ? "#c5f542"
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
                  {session.id === "register" && (
                    <p className={`text-xs ${registerLimitReached ? "text-red-600" : "text-gray-500"}`}>
                      {registerLimitReached
                        ? "Register terminal limit reached for the current plan."
                        : `Available for this shop plan: ${registerLimitText}.`}
                    </p>
                  )}
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
                    (session.id === "register" && (!canManageTerminals || !shopId || !userEmail)) ||
                    (session.id !== "register" && (!shopId || !userEmail))
                  }
                  style={{ backgroundColor: "#c5f542", color: "black", border: "none" }}
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
      <Card title="Active sessions" subtitle="Connected devices and pending mobile links">
        <div>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-[#eeeeeb] bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-[#c5f542] rounded-full animate-pulse" />
                <div>
                  <p className="font-medium text-[#181818]">Primary Terminal</p>
                  <p className="text-sm text-[#777773]">
                    {currentUser?.terminalId
                      ? `This device — ${currentUser.name || memberScope?.displayName || "Connected"}`
                      : "Current device — Always active"}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-gradient-to-r from-gray-100 to-gray-200 px-2 py-1 text-[10px] font-semibold text-[#777773]">
                ACTIVE
              </span>
            </div>

            {registerTerminals.map((terminal) => {
              const isConfirming = confirmingRevoke === terminal.terminalId;
              const isRevoking = revokingSession === terminal.terminalId;

              return (
                <div
                  key={terminal.terminalId}
                  className="flex items-center justify-between rounded-xl border border-[#eeeeeb] bg-white p-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-2 bg-[#c5f542] rounded-full animate-pulse flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-[#181818]">{terminal.label}</p>
                      <p className="text-sm text-[#777773] truncate">
                        Register terminal
                        {terminal.pairedMemberName
                          ? ` — ${terminal.pairedMemberName}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="rounded-full bg-gradient-to-r from-gray-100 to-gray-200 px-2 py-1 text-[10px] font-semibold text-[#777773]">
                      ACTIVE
                    </span>
                    {canManageTerminals &&
                      (isConfirming ? (
                        <>
                          <button
                            onClick={() => void handleRevokeTerminal(terminal.terminalId)}
                            disabled={isRevoking}
                            className="rounded-full bg-[#c5f542] px-3 py-1.5 text-xs font-medium text-black hover:bg-[#b8ea34] disabled:opacity-50"
                          >
                            Revoke
                          </button>
                          <button
                            onClick={() => setConfirmingRevoke(null)}
                            className="rounded-full bg-[#c5f542] px-3 py-1.5 text-xs font-medium text-black hover:bg-[#b8ea34]"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmingRevoke(terminal.terminalId)}
                          className="rounded-full bg-[#c5f542] px-3 py-1.5 text-xs font-medium text-black hover:bg-[#b8ea34] transition-colors"
                          title="Revoke register terminal"
                        >
                          Revoke
                        </button>
                      ))}
                  </div>
                </div>
              );
            })}

            {sessionFeed.length === 0 && registerTerminals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No additional sessions active</p>
                <p className="text-xs mt-1">
                  Start a session above to connect more devices
                </p>
              </div>
            ) : (
              sessionFeed.map((item) => {
                const isLinked = item.status === "linked";
                const isExpanded = expandedSession === item.sessionId;
                const isConfirming = confirmingRevoke === item.sessionId;
                const isRevoking = revokingSession === item.sessionId;

                return (
                  <div
                    key={item.sessionId}
                    className="rounded-lg border border-gray-200 overflow-hidden"
                  >
                    {/* Main row */}
                    <div
                      className={`flex items-center gap-3 px-3 py-2.5 ${
                        isLinked ? "bg-white" : "bg-white"
                      }`}
                    >
                      {/* Status dot */}
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          isLinked
                            ? "bg-[#c5f542] animate-pulse"
                            : "bg-amber-400"
                        }`}
                      />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {item.type || "session"}
                          </span>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                              isLinked
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {isLinked ? "active" : "pending"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 font-mono truncate">
                          {item.sessionId}
                        </p>
                        {item.actor && (
                          <p className="text-xs text-gray-500">{item.actor}</p>
                        )}
                      </div>

                      {/* Time + actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-xs text-gray-400 mr-1">
                          {item.at}
                        </span>

                        {isConfirming ? (
                          /* Inline confirm row */
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => void handleRevoke(item.sessionId)}
                              disabled={isRevoking}
                              className="rounded-full bg-[#c5f542] px-3 py-1.5 text-xs font-medium text-black hover:bg-[#b8ea34] transition-colors disabled:opacity-50"
                            >
                              {isRevoking ? "Working..." : isLinked ? "Deactivate" : "Delete"}
                            </button>
                            <button
                              onClick={() => setConfirmingRevoke(null)}
                              className="rounded-full bg-[#c5f542] px-3 py-1.5 text-xs font-medium text-black hover:bg-[#b8ea34] transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : isLinked ? (
                          /* Deactivate button for linked sessions */
                          <button
                            onClick={() =>
                              setConfirmingRevoke(item.sessionId)
                            }
                            className="rounded-full bg-[#c5f542] px-3 py-1.5 text-xs font-medium text-black hover:bg-[#b8ea34] transition-colors"
                            title="Deactivate session"
                          >
                            Deactivate
                          </button>
                        ) : (
                          /* View details + delete for pending sessions */
                          <>
                            <button
                              onClick={() =>
                                setExpandedSession(
                                  isExpanded ? null : item.sessionId,
                                )
                              }
                              className="rounded-full bg-[#c5f542] px-3 py-1.5 text-xs font-medium text-black hover:bg-[#b8ea34] transition-colors"
                              title={isExpanded ? "Hide details" : "View details"}
                            >
                              {isExpanded ? "Hide" : "View"}
                            </button>
                            <button
                              onClick={() =>
                                setConfirmingRevoke(item.sessionId)
                              }
                              className="rounded-full bg-[#c5f542] px-3 py-1.5 text-xs font-medium text-black hover:bg-[#b8ea34] transition-colors"
                              title="Delete session"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Expandable details panel (pending sessions only) */}
                    <AnimatePresence>
                      {isExpanded && !isLinked && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          {(() => {
                            const urlInfo = sessionScanUrls[item.sessionId];
                            return (
                              <div className="px-4 py-4 bg-white border-t border-gray-100">
                                <div className="flex gap-4">
                                  {/* QR code column */}
                                  <div className="flex-shrink-0 flex flex-col items-center gap-2">
                                    {urlInfo ? (
                                      <>
                                        <SessionQR scanUrl={urlInfo.scanUrl} />
                                        <SessionExpiry
                                          expiresAt={urlInfo.expiresAt}
                                        />
                                      </>
                                    ) : (
                                      <div className="w-[140px] h-[140px] flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-center gap-2 px-3">
                                        <p className="text-[10px] text-gray-400 leading-tight">
                                          QR unavailable — refresh or recreate the session
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Info column */}
                                  <div className="flex-1 min-w-0 grid grid-cols-1 gap-2.5 content-start">
                                    <div>
                                      <p className="text-[10px] uppercase tracking-wide text-gray-400">
                                        Session ID
                                      </p>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <p className="text-xs font-mono text-gray-700 break-all">
                                          {item.sessionId}
                                        </p>
                                        <button
                                          onClick={() =>
                                            navigator.clipboard.writeText(
                                              item.sessionId,
                                            )
                                          }
                                          className="flex-shrink-0 rounded-full bg-[#c5f542] px-2 py-1 text-[10px] font-medium text-black hover:bg-[#b8ea34] transition-colors"
                                          title="Copy session ID"
                                        >
                                          Copy
                                        </button>
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-[10px] uppercase tracking-wide text-gray-400">
                                        Type
                                      </p>
                                      <p className="text-xs text-gray-700 mt-0.5 capitalize">
                                        {item.type}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] uppercase tracking-wide text-gray-400">
                                        Created by
                                      </p>
                                      <p className="text-xs text-gray-700 mt-0.5">
                                        {item.actor || "—"}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] uppercase tracking-wide text-gray-400">
                                        Created at
                                      </p>
                                      <p className="text-xs text-gray-700 mt-0.5">
                                        {item.at}
                                      </p>
                                    </div>
                                    {urlInfo && (
                                      <button
                                        onClick={() =>
                                          navigator.clipboard.writeText(
                                            urlInfo.scanUrl,
                                          )
                                        }
                                        className="self-start rounded-full bg-[#c5f542] px-3 py-1.5 text-xs font-medium text-black hover:bg-[#b8ea34] transition-colors"
                                      >
                                        Copy scan link
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Card>

      <AnimatePresence>
        {showRegisterWizard && shopId && userEmail && (
          <RegisterTerminalWizard
            onClose={() => {
              setShowRegisterWizard(false);
              void refreshActiveSessions();
            }}
            sidebarCollapsed={isSidebarCollapsed}
            shopId={shopId}
            userEmail={userEmail}
            onManagePlan={() => setCurrentModule("Subscription")}
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
            onSessionCreated={handleSessionCreated}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
