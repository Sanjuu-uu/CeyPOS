import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, MonitorSpeaker, ShieldCheck } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { useEmployeeOnboard } from "../../../context/EmployeeOnboardContext";
import { postJSON, authFetch } from "../../../lib/api";
import {
  clearTerminalSession,
  saveTerminalSession,
} from "../../../lib/shopContext";
import { db } from "../../../lib/db";
import { TEAM_SETUP_CACHE_KEY } from "../../../lib/authFlow";
import "../ShopWizard/styles/ShopWizard.css";

const cardVariants = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
};

export const EmployeeOnboardStep3: React.FC = () => {
  const { user } = useUser();
  const { formData, updateFormData, setError, error, isBusy, setIsBusy } =
    useEmployeeOnboard();

  const [code, setCode] = useState("");
  const [shopId, setShopId] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [pairStatus, setPairStatus] = useState<
    "idle" | "registering" | "pending" | "approved" | "error"
  >("idle");

  const userEmail = user?.primaryEmailAddress?.emailAddress || "";

  useEffect(() => {
    if (!requestId || pairStatus !== "pending" || !shopId) return;

    const interval = window.setInterval(async () => {
      try {
        const res = await authFetch(
          `/api/terminals/pairing/status/${encodeURIComponent(requestId)}?shopId=${encodeURIComponent(shopId)}`,
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
            shopId,
            userEmail,
            requestId,
          });
          if (!claim.ok || !claim.terminalId) {
            setError(claim.error || "Failed to claim terminal session");
            setPairStatus("error");
            return;
          }
          saveTerminalSession({
            shopId,
            terminalId: claim.terminalId,
            terminalToken: claim.terminalToken,
            terminalType: "register",
            label: claim.label,
          });
          await db.connectWebSocket(shopId, {
            terminalId: claim.terminalId,
            terminalToken: claim.terminalToken,
          });
          updateFormData({ terminalPaired: true });
          setPairStatus("approved");
        } else if (body.status === "rejected") {
          setError("Pairing request was rejected by the Owner / Manager.");
          setPairStatus("error");
        }
      } catch {
        // keep polling
      }
    }, 2500);

    return () => window.clearInterval(interval);
  }, [requestId, pairStatus, shopId, userEmail, setError, updateFormData]);

  const registerAndPair = async () => {
    if (!userEmail || !user || !code.trim()) {
      setError("Enter the main terminal pairing code");
      return;
    }

    setIsBusy(true);
    setError(null);
    setPairStatus("registering");

    try {
      const result = await postJSON<{
        ok: boolean;
        shopId: string;
        dbFileName: string;
      }>("/api/team/register", {
        ownerEmail: formData.mainTerminalEmail.trim(),
        userEmail,
        displayName: formData.displayName.trim(),
        clerkUserId: user.id,
        accountType: "team",
        phone: formData.phone,
      });

      const resolvedShopId = result.shopId;
      setShopId(resolvedShopId);

      localStorage.setItem(
        TEAM_SETUP_CACHE_KEY,
        JSON.stringify({
          accountType: "team",
          teamOnboarded: true,
          userEmail,
          mainTerminalEmail: formData.mainTerminalEmail.trim(),
          displayName: formData.displayName.trim(),
          phone: formData.phone,
          shopId: resolvedShopId,
          dbFileName: result.dbFileName,
        }),
      );

      await user.update({
        unsafeMetadata: {
          ...(user.unsafeMetadata || {}),
          accountType: "team",
          teamOnboarded: true,
          mainTerminalEmail: formData.mainTerminalEmail.trim(),
          displayName: formData.displayName.trim(),
          phone: formData.phone,
          shopId: resolvedShopId,
          dbFileName: result.dbFileName,
          shopCompleted: true,
        },
      });

      clearTerminalSession();

      const pairing = await postJSON<{ ok: boolean; requestId: string; error?: string }>(
        "/api/terminals/pairing/request",
        {
          shopId: resolvedShopId,
          userEmail,
          code: code.trim().toUpperCase(),
          deviceMeta: { userAgent: navigator.userAgent },
        },
      );

      setRequestId(pairing.requestId);
      setPairStatus("pending");
    } catch (err) {
      setPairStatus("error");
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setIsBusy(false);
    }
  };

  const goToDashboard = () => {
    window.location.replace("/dashboard");
  };

  return (
    <div className="w-full flex justify-center">
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        className="w-full max-w-lg"
      >
        <div
          className="p-8 shadow-lg"
          style={{
            backgroundColor: "var(--main--white)",
            borderRadius: "var(--radius--16px)",
            border: "1px solid var(--gray--200)",
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-[#c5f542]/30">
              <MonitorSpeaker size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Connect Main Terminal
              </h2>
              <p className="text-sm text-gray-600">
                Enter the pairing code shown on the primary terminal.
              </p>
            </div>
          </div>

          {pairStatus === "approved" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg p-4">
                <ShieldCheck size={18} />
                <span>
                  Terminal connected. Welcome, {formData.displayName}!
                </span>
              </div>
              <button
                type="button"
                onClick={goToDashboard}
                className="w-full rounded-full bg-[#c5f542] text-black font-semibold py-3"
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            <>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="CY-1234-5678"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 font-mono text-center tracking-widest mb-3"
                style={{ height: "48px" }}
                disabled={pairStatus === "pending" || pairStatus === "registering"}
              />
              {error && (
                <p className="text-sm text-red-600 mb-3">{error}</p>
              )}
              <button
                type="button"
                onClick={() => void registerAndPair()}
                disabled={
                  isBusy ||
                  pairStatus === "pending" ||
                  pairStatus === "registering" ||
                  !code.trim()
                }
                className="w-full rounded-full bg-[#c5f542] text-black font-semibold py-3 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {pairStatus === "pending" ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Waiting for Owner / Manager approval…
                  </>
                ) : pairStatus === "registering" || isBusy ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Connecting…
                  </>
                ) : (
                  "Connect Terminal"
                )}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
