import React, { useEffect, useMemo, useState, useRef } from "react";
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
  Monitor,
  Edit2,
  Check,
  Package,
  Users,
  AlertTriangle,
  ShoppingCart,
  Activity,
  Circle,
} from "lucide-react";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { postJSON } from "../../../lib/api";
import { db } from "../../../lib/db";
import { useApp } from "../../../context/AppContext";
import { TerminalInfo } from "../../../types";

// ─── Types ────────────────────────────────────────────────────────────────────
type MobileSessionType = "barcode" | "checkout";
type SessionState = "idle" | "creating" | "pending" | "linked" | "error";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const extractOwnerEmail = (shopId: string) => {
  const value = String(shopId || "").trim();
  const idx = value.indexOf("_id");
  return idx > 0 ? value.slice(0, idx) : value;
};

// ─── SessionWizard (mobile) ───────────────────────────────────────────────────
interface SessionWizardProps {
  sessionType: MobileSessionType | null;
  onClose: () => void;
  shopId: string;
  userEmail: string;
  userId: string | null;
  sidebarCollapsed: boolean;
}

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

      if (!result?.scanUrl) throw new Error("Failed to generate QR session URL.");

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
      setSessionError(
        err instanceof Error ? err.message : "Failed to create session.",
      );
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
              <p className="text-sm text-red-600">
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

// ─── TerminalCard ─────────────────────────────────────────────────────────────
const TerminalCard: React.FC<{
  terminal: TerminalInfo;
  products: Array<{ id: string; name: string; stock: number }>;
  isSelf: boolean;
  selfLabel?: string;
  selfReservations?: Record<string, number>;
  currencySymbol: string;
}> = ({ terminal, products, isSelf, selfLabel, selfReservations, currencySymbol }) => {
  const reservations = isSelf ? (selfReservations || {}) : terminal.reservations;
  const label = isSelf ? (selfLabel || terminal.label) : terminal.label;
  const cartEntries = Object.entries(reservations).filter(([, qty]) => qty > 0);

  const ago = !isSelf
    ? Math.floor((Date.now() - terminal.lastSeen) / 1000)
    : null;

  return (
    <div
      className={`rounded-xl border p-4 ${isSelf ? "border-[#ecff76] bg-[#ecff76]/5" : "border-gray-200 bg-white"}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isSelf ? "bg-[#ecff76] text-gray-900" : "bg-gray-900 text-white"}`}
          >
            <Monitor size={15} />
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900">{label}</p>
            <p className="text-[10px] text-gray-400 font-mono">
              {terminal.terminalId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Circle
            size={8}
            className={
              isSelf
                ? "fill-green-500 text-green-500"
                : ago !== null && ago < 30
                  ? "fill-green-500 text-green-500"
                  : "fill-amber-400 text-amber-400"
            }
          />
          <span className="text-[10px] text-gray-500">
            {isSelf ? "This terminal" : ago !== null && ago < 30 ? "Active" : `${ago}s ago`}
          </span>
        </div>
      </div>

      {cartEntries.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1">
            <ShoppingCart size={10} /> Cart ({cartEntries.length} items)
          </p>
          {cartEntries.map(([productId, qty]) => {
            const product = products.find((p) => p.id === productId);
            return (
              <div
                key={productId}
                className="flex items-center justify-between bg-gray-50 rounded-lg px-2.5 py-1.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Package size={12} className="text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-700 truncate">
                    {product?.name || productId}
                  </span>
                </div>
                <span className="text-xs font-bold text-gray-900 ml-2 flex-shrink-0 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                  ×{qty}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-1">
          <ShoppingCart size={12} />
          Cart is empty
        </p>
      )}
    </div>
  );
};

// ─── StockReservationTable ─────────────────────────────────────────────────────
const StockReservationTable: React.FC<{
  products: Array<{ id: string; name: string; stock: number }>;
  allTerminals: Array<{ terminalId: string; label: string; reservations: Record<string, number>; isSelf: boolean }>;
  getAvailableStock: (productId: string, totalStock: number) => number;
}> = ({ products, allTerminals, getAvailableStock }) => {
  // Only show products that have at least one reservation
  const reservedProducts = products.filter((p) =>
    allTerminals.some((t) => (t.reservations[p.id] || 0) > 0),
  );

  if (reservedProducts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Activity size={28} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">No active reservations across terminals.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
              Product
            </th>
            <th className="text-center py-2 px-3 text-xs font-medium text-gray-500">
              Total Stock
            </th>
            {allTerminals.map((t) => (
              <th
                key={t.terminalId}
                className="text-center py-2 px-3 text-xs font-medium text-gray-500"
              >
                {t.label}
                {t.isSelf && (
                  <span className="ml-1 text-[10px] text-[#8a9928]">(you)</span>
                )}
              </th>
            ))}
            <th className="text-center py-2 px-3 text-xs font-medium text-green-700">
              Available
            </th>
          </tr>
        </thead>
        <tbody>
          {reservedProducts.map((product) => {
            const available = getAvailableStock(product.id, product.stock);
            const isCritical = available === 0;
            const isLow = available > 0 && available <= 2;

            return (
              <tr
                key={product.id}
                className={`border-b border-gray-50 last:border-0 ${isCritical ? "bg-red-50" : ""}`}
              >
                <td className="py-2 px-3 font-medium text-gray-800">
                  {product.name}
                </td>
                <td className="py-2 px-3 text-center text-gray-500">
                  {product.stock}
                </td>
                {allTerminals.map((t) => {
                  const qty = t.reservations[product.id] || 0;
                  return (
                    <td key={t.terminalId} className="py-2 px-3 text-center">
                      {qty > 0 ? (
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${t.isSelf ? "bg-[#ecff76] text-gray-900" : "bg-gray-900 text-white"}`}
                        >
                          {qty}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="py-2 px-3 text-center">
                  <span
                    className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold ${
                      isCritical
                        ? "bg-red-100 text-red-700"
                        : isLow
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                    }`}
                  >
                    {isCritical && (
                      <AlertTriangle size={10} className="mr-1" />
                    )}
                    {available}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ─── Main Sessions component ──────────────────────────────────────────────────
export const Sessions: React.FC = () => {
  const {
    activeShopId,
    isSidebarCollapsed,
    terminalId,
    terminalLabel,
    setTerminalLabel,
    activeTerminals,
    cart,
    currentShop,
    getAvailableStock,
  } = useApp();

  const { user } = useUser();
  const userEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    "";
  const userId = user?.id ?? null;
  const shopId = activeShopId ?? "";

  const [activeTab, setActiveTab] = useState<"terminals" | "mobile">(
    "terminals",
  );

  // ── Terminal label editing ──
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(terminalLabel);
  const labelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingLabel) {
      setLabelDraft(terminalLabel);
      setTimeout(() => labelInputRef.current?.focus(), 50);
    }
  }, [editingLabel, terminalLabel]);

  const commitLabel = () => {
    const trimmed = labelDraft.trim();
    if (trimmed) setTerminalLabel(trimmed);
    setEditingLabel(false);
  };

  // ── Mobile session state ──
  const [showWizard, setShowWizard] = useState(false);
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

  const startSession = (sessionType: MobileSessionType) => {
    setActiveSession(sessionType);
    setShowWizard(true);
  };

  // ── Products for reservation table ──
  const products = useMemo(() => {
    if (!currentShop) return [];
    return db.products.getByShopId(currentShop.id).map((p) => ({
      id: p.id,
      name: p.name,
      stock: p.stock,
    }));
  }, [currentShop]);

  // Self reservations from current cart
  const selfReservations = useMemo<Record<string, number>>(() => {
    const r: Record<string, number> = {};
    for (const item of cart) {
      r[item.id] = item.quantity;
    }
    return r;
  }, [cart]);

  // All terminals including self for the table
  const allTerminalsForTable = useMemo(() => {
    const self = {
      terminalId,
      label: terminalLabel,
      reservations: selfReservations,
      isSelf: true,
    };
    const others = activeTerminals.map((t) => ({
      terminalId: t.terminalId,
      label: t.label,
      reservations: t.reservations,
      isSelf: false,
    }));
    return [self, ...others];
  }, [terminalId, terminalLabel, selfReservations, activeTerminals]);

  const currencySymbol = currentShop?.currency ?? "$";

  const totalActiveTerminals = 1 + activeTerminals.length;
  const totalCartItems = cart.length;
  const totalReservedProducts = new Set([
    ...Object.keys(selfReservations),
    ...activeTerminals.flatMap((t) => Object.keys(t.reservations)),
  ]).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="heading-h2">Sessions</h1>
          <p className="mt-1 text-gray-600 text-sm">
            Manage POS terminals and mobile sessions connected to this shop.
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-gray-100 rounded-xl p-1">
          {(["terminals", "mobile"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "terminals" ? (
                <span className="flex items-center gap-1.5">
                  <Monitor size={14} />
                  POS Terminals
                  {totalActiveTerminals > 0 && (
                    <span className="bg-gray-900 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                      {totalActiveTerminals}
                    </span>
                  )}
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Smartphone size={14} />
                  Mobile Sessions
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── POS Terminals Tab ── */}
      {activeTab === "terminals" && (
        <div className="space-y-5">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                label: "Active Terminals",
                value: totalActiveTerminals,
                icon: <Monitor size={18} />,
                color: "text-blue-600 bg-blue-50",
              },
              {
                label: "Items in Your Cart",
                value: totalCartItems,
                icon: <ShoppingCart size={18} />,
                color: "text-[#8a9928] bg-[#ecff76]/30",
              },
              {
                label: "Reserved Products",
                value: totalReservedProducts,
                icon: <Package size={18} />,
                color:
                  totalReservedProducts > 0
                    ? "text-amber-700 bg-amber-50"
                    : "text-gray-500 bg-gray-50",
              },
            ].map((stat) => (
              <Card key={stat.label} className="border border-gray-100">
                <div className="p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-2xl font-black text-gray-900">
                      {stat.value}
                    </p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Terminal cards */}
          <Card className="border border-gray-100">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Users size={16} />
                  Connected Terminals
                </h2>
                <p className="text-xs text-gray-400">
                  Updates live via BroadcastChannel
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {/* This terminal */}
                <div className="rounded-xl border-2 border-[#ecff76] bg-[#ecff76]/5 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#ecff76] flex items-center justify-center">
                        <Monitor size={15} className="text-gray-900" />
                      </div>
                      <div>
                        {editingLabel ? (
                          <div className="flex items-center gap-1">
                            <input
                              ref={labelInputRef}
                              value={labelDraft}
                              onChange={(e) => setLabelDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitLabel();
                                if (e.key === "Escape") setEditingLabel(false);
                              }}
                              className="text-sm font-semibold border-b-2 border-[#ecff76] bg-transparent outline-none w-36"
                            />
                            <button
                              onClick={commitLabel}
                              className="p-0.5 rounded hover:bg-[#ecff76]/40"
                            >
                              <Check size={13} className="text-green-700" />
                            </button>
                            <button
                              onClick={() => setEditingLabel(false)}
                              className="p-0.5 rounded hover:bg-gray-100"
                            >
                              <X size={13} className="text-gray-400" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <p className="font-semibold text-sm text-gray-900">
                              {terminalLabel}
                            </p>
                            <button
                              onClick={() => setEditingLabel(true)}
                              className="p-0.5 rounded hover:bg-[#ecff76]/40 opacity-60 hover:opacity-100"
                            >
                              <Edit2 size={11} />
                            </button>
                          </div>
                        )}
                        <p className="text-[10px] text-gray-400 font-mono">
                          {terminalId}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Circle
                        size={8}
                        className="fill-green-500 text-green-500"
                      />
                      <span className="text-[10px] text-gray-500">
                        This terminal
                      </span>
                    </div>
                  </div>

                  {cart.length > 0 ? (
                    <div className="space-y-1.5">
                      <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1">
                        <ShoppingCart size={10} /> Cart ({cart.length} items)
                      </p>
                      {cart.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between bg-white rounded-lg px-2.5 py-1.5 border border-[#ecff76]/40"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Package
                              size={12}
                              className="text-gray-400 flex-shrink-0"
                            />
                            <span className="text-xs text-gray-700 truncate">
                              {item.name}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-gray-900 ml-2 flex-shrink-0 bg-[#ecff76] px-2 py-0.5 rounded-full">
                            ×{item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 flex items-center gap-1.5">
                      <ShoppingCart size={12} />
                      Cart is empty
                    </p>
                  )}
                </div>

                {/* Other terminals */}
                {activeTerminals.map((terminal) => (
                  <TerminalCard
                    key={terminal.terminalId}
                    terminal={terminal}
                    products={products}
                    isSelf={false}
                    currencySymbol={currencySymbol}
                  />
                ))}

                {/* Empty state when alone */}
                {activeTerminals.length === 0 && (
                  <div className="rounded-xl border-2 border-dashed border-gray-200 p-6 flex flex-col items-center justify-center text-center text-gray-400">
                    <Monitor
                      size={28}
                      className="mb-2 opacity-30"
                    />
                    <p className="text-sm font-medium">No other terminals</p>
                    <p className="text-xs mt-1">
                      Open another browser tab with the same shop to see it
                      appear here automatically.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Stock reservations table */}
          <Card className="border border-gray-100">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Package size={16} />
                  Stock Reservations
                </h2>
                <p className="text-xs text-gray-400">
                  Items held in carts across all terminals
                </p>
              </div>
              <StockReservationTable
                products={products}
                allTerminals={allTerminalsForTable}
                getAvailableStock={getAvailableStock}
              />
            </div>
          </Card>

          {/* How it works */}
          <Card className="border border-gray-100 bg-blue-50/40">
            <div className="p-5">
              <h3 className="font-semibold text-sm text-gray-800 mb-3">
                How multi-terminal inventory works
              </h3>
              <ul className="space-y-2 text-xs text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-gray-900 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    1
                  </span>
                  When you add a product to your cart, that quantity is{" "}
                  <strong>reserved for this terminal</strong> and other
                  terminals can instantly see the reduced available stock.
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-gray-900 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    2
                  </span>
                  If Soap has 2 units and Terminal A adds 2 to cart, Terminal B
                  will see 0 available and cannot add it.
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-gray-900 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    3
                  </span>
                  Reservations are released when a cart is cleared or a
                  checkout completes. Live stock is updated across all terminals
                  after every sale.
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-400 text-gray-900 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    !
                  </span>
                  This works across browser tabs on the same machine. For
                  cross-machine terminals, ensure all terminals are connected to
                  the same backend and the WebSocket stays active.
                </li>
              </ul>
            </div>
          </Card>
        </div>
      )}

      {/* ── Mobile Sessions Tab ── */}
      {activeTab === "mobile" && (
        <div className="space-y-5">
          <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-5 md:grid-cols-2">
            {(
              [
                {
                  id: "barcode" as MobileSessionType,
                  title: "Start Import Session",
                  description:
                    "Create a secure mobile barcode-import session for this exact shop account.",
                  icon: <QrCode size={28} />,
                  color: "#b39efc",
                },
                {
                  id: "checkout" as MobileSessionType,
                  title: "Start Checkout Session",
                  description:
                    "Create a secure mobile checkout session for real-time cart sync with desktop.",
                  icon: <Smartphone size={28} />,
                  color: "#ef94b5",
                },
              ] as const
            ).map((session) => (
              <motion.div
                key={session.id}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.15 }}
              >
                <Card className="mx-auto h-full w-full max-w-md border border-gray-100 transition-shadow duration-200 hover:shadow-lg">
                  <div className="space-y-4 p-5">
                    <div className="flex items-start justify-between">
                      <div
                        className="rounded-lg p-3"
                        style={{ backgroundColor: `${session.color}20` }}
                      >
                        <div style={{ color: session.color }}>
                          {session.icon}
                        </div>
                      </div>
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                        Secure QR
                      </span>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {session.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-gray-600">
                        {session.description}
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      onClick={() => startSession(session.id)}
                      className="w-full"
                      disabled={!shopId || !userEmail}
                      style={{
                        backgroundColor: session.color,
                        color: "#0f172a",
                        border: "none",
                      }}
                    >
                      {activeByType[session.id]
                        ? "Link Another Device"
                        : "Start Session"}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          <Card className="border border-gray-100">
            <div className="p-6">
              <h2 className="mb-4 text-lg font-semibold">
                Active & Recent Sessions
              </h2>
              {sessionFeed.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No session activity yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {sessionFeed.map((item) => (
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
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

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
