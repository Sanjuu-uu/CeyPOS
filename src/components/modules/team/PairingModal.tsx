import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, MonitorSpeaker, ShieldCheck } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { useApp } from "../../../context/AppContext";
import { postJSON } from "../../../lib/api";
import { saveTerminalSession } from "../../../lib/shopContext";
import { db } from "../../../lib/db";

export const PairingModal: React.FC = () => {
  const { user } = useUser();
  const { activeShopId, pairingRequired, refreshShopContext, memberScope } = useApp();
  const [code, setCode] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "pending" | "approved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const userEmail = user?.primaryEmailAddress?.emailAddress || "";

  useEffect(() => {
    if (!requestId || status !== "pending" || !activeShopId) return;

    const interval = window.setInterval(async () => {
      try {
        const res = await fetch(
          `/api/terminals/pairing/status/${encodeURIComponent(requestId)}?shopId=${encodeURIComponent(activeShopId)}`,
        );
        const body = await res.json();
        if (body.status === "approved") {
          const claim = await postJSON<{
            ok: boolean;
            terminalId: string;
            terminalToken: string;
            label?: string;
            error?: string;
          }>("/api/terminals/pairing/claim", {
            shopId: activeShopId,
            userEmail,
            requestId,
          });
          if (!claim.ok || !claim.terminalId) {
            setError(claim.error || "Failed to claim terminal session");
            setStatus("error");
            return;
          }
          saveTerminalSession({
            shopId: activeShopId,
            terminalId: claim.terminalId,
            terminalToken: claim.terminalToken,
            terminalType: "register",
            label: claim.label,
          });
          await db.connectWebSocket(activeShopId, {
            terminalId: claim.terminalId,
            terminalToken: claim.terminalToken,
          });
          setStatus("approved");
          window.dispatchEvent(new CustomEvent("ceypos:terminal-updated", { detail: { terminalId: claim.terminalId } }));
          await refreshShopContext();
        } else if (body.status === "rejected") {
          setError("Pairing request was rejected by the shop owner.");
          setStatus("error");
        }
      } catch {
        // keep polling
      }
    }, 2500);

    return () => window.clearInterval(interval);
  }, [requestId, status, activeShopId, userEmail, refreshShopContext]);

  const submitCode = async () => {
    if (!activeShopId || !userEmail || !code.trim()) return;
    setError(null);
    setStatus("pending");
    try {
      const result = await postJSON<{ ok: boolean; requestId: string; error?: string }>(
        "/api/terminals/pairing/request",
        {
          shopId: activeShopId,
          userEmail,
          code: code.trim().toUpperCase(),
          deviceMeta: { userAgent: navigator.userAgent },
        },
      );
      setRequestId(result.requestId);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Pairing failed");
    }
  };

  if (!pairingRequired) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100"
          initial={{ scale: 0.95, y: 12 }}
          animate={{ scale: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-[#c5f542]/30">
              <MonitorSpeaker size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Connect Register Terminal</h2>
              <p className="text-sm text-gray-600">Enter the pairing code shown on the primary terminal.</p>
            </div>
          </div>

          {status === "approved" ? (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg p-4">
              <ShieldCheck size={18} />
              <span>Terminal connected. Welcome, {memberScope?.displayName}.</span>
            </div>
          ) : (
            <>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="CY-1234-5678"
                className="w-full rounded-lg border border-gray-200 px-4 py-3 font-mono text-center tracking-widest mb-3"
                disabled={status === "pending"}
              />
              {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
              <button
                type="button"
                onClick={submitCode}
                disabled={status === "pending" || !code.trim()}
                className="w-full rounded-lg bg-[#c5f542] text-black font-semibold py-3 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {status === "pending" ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Waiting for owner approval…
                  </>
                ) : (
                  "Connect Terminal"
                )}
              </button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
