import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, MonitorSpeaker, ShieldCheck } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { useEmployeeOnboard } from "../../../context/EmployeeOnboardContext";
import { postJSON, authFetch, waitForApiReady } from "../../../lib/api";
import {
  saveTerminalSession,
} from "../../../lib/shopContext";
import { db } from "../../../lib/db";
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
  const [shopId, setShopId] = useState<string | null>(formData.shopId || null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [pairStatus, setPairStatus] = useState<
    "idle" | "registering" | "pending" | "approved" | "error"
  >("idle");
  const [registerError, setRegisterError] = useState<string | null>(null);

  const userEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    "";

  const finalizeOnboarding = useCallback(
    async (resolvedShopId: string, dbFileName: string) => {
      if (!user) return;

      await user.update({
        unsafeMetadata: {
          ...(user.unsafeMetadata || {}),
          accountType: "team",
          teamOnboarded: true,
          terminalPaired: true,
          mainTerminalEmail: formData.mainTerminalEmail.trim(),
          displayName: formData.displayName.trim(),
          phone: formData.phone,
          shopId: resolvedShopId,
          dbFileName,
          shopCompleted: true,
        },
      });

      updateFormData({
        terminalPaired: true,
        shopId: resolvedShopId,
        dbFileName,
      });
    },
    [formData, updateFormData, user, userEmail],
  );

  useEffect(() => {
    if (!requestId || pairStatus !== "pending" || !shopId) return;

    const interval = window.setInterval(async () => {
      try {
        const res = await authFetch(
          `/api/terminals/pairing/status/${encodeURIComponent(requestId)}?shopId=${encodeURIComponent(shopId)}`,
        );
        const body = await res.json();
        console.debug("[ceypos:pairing] status poll", { requestId, shopId, body });
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
          console.log("[ceypos:pairing] claim response", claim);
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

          const dbFileName =
            formData.dbFileName ||
            (typeof user?.unsafeMetadata?.dbFileName === "string"
              ? user.unsafeMetadata.dbFileName
              : "");

          await finalizeOnboarding(shopId, dbFileName);
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
  }, [
    finalizeOnboarding,
    formData.dbFileName,
    requestId,
    pairStatus,
    shopId,
    user?.unsafeMetadata?.dbFileName,
    userEmail,
    setError,
  ]);

  useEffect(() => {
    if (!userEmail || !user || shopId || registerError) return;

    let cancelled = false;
    (async () => {
      setPairStatus("registering");
      setRegisterError(null);
      try {
        await waitForApiReady();
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
          phoneVerificationSkipped: formData.phoneVerificationSkipped,
        });

        if (cancelled) return;

        setShopId(result.shopId);
        updateFormData({
          shopId: result.shopId,
          dbFileName: result.dbFileName,
        });

        await user.update({
          unsafeMetadata: {
            ...(user.unsafeMetadata || {}),
            accountType: "team",
            teamOnboarded: false,
            terminalPaired: false,
            shopCompleted: false,
            mainTerminalEmail: formData.mainTerminalEmail.trim(),
            displayName: formData.displayName.trim(),
            phone: formData.phone,
            shopId: result.shopId,
            dbFileName: result.dbFileName,
          },
        });

        setPairStatus("idle");
      } catch (err) {
        if (!cancelled) {
          setRegisterError(
            err instanceof Error ? err.message : "Registration failed",
          );
          setPairStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    formData.displayName,
    formData.mainTerminalEmail,
    formData.phone,
    registerError,
    shopId,
    updateFormData,
    user,
    userEmail,
  ]);

  const submitPairingCode = async () => {
    if (!userEmail || !shopId || !code.trim()) {
      setError("Enter the main terminal pairing code");
      return;
    }

    setIsBusy(true);
    setError(null);
    setPairStatus("registering");

    try {
      const trimmedCode = code.trim().toUpperCase();
      const payload = {
        shopId,
        userEmail,
        code: trimmedCode,
        deviceMeta: { userAgent: navigator.userAgent },
      };
      console.log("[ceypos:pairing] submit", payload);
      await waitForApiReady();
      const pairing = await postJSON<{ ok: boolean; requestId: string; error?: string }>(
        "/api/terminals/pairing/request",
        payload,
      );
      console.log("[ceypos:pairing] request success", pairing);

      setRequestId(pairing.requestId);
      setPairStatus("pending");
    } catch (err) {
      console.error("[ceypos:pairing] request failed", err, { shopId, userEmail, code: code.trim().toUpperCase() });
      setPairStatus("error");
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setIsBusy(false);
    }
  };

  const goToAnalytics = () => {
    window.location.replace("/analytics");
  };

  React.useEffect(() => {
    if (pairStatus === "approved") {
      window.location.replace("/analytics");
    }
  }, [pairStatus]);

  if (registerError) {
    return (
      <div className="w-full flex justify-center">
        <div className="max-w-lg w-full p-8 bg-white rounded-2xl border border-red-200 text-center">
          <p className="text-red-600 mb-4">{registerError}</p>
          <button
            type="button"
            onClick={() => {
              setRegisterError(null);
              setPairStatus("idle");
            }}
            className="rounded-full bg-gray-900 text-white px-6 py-2 text-sm"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

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
                Ask your Owner / Manager for the pairing code shown on Sessions →
                Connect Register Terminal.
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
                onClick={goToAnalytics}
                className="w-full rounded-full bg-[#c5f542] text-black font-semibold py-3"
              >
                Go to Analytics
              </button>
            </div>
          ) : (
            <>
              {pairStatus === "registering" && !shopId ? (
                <div className="flex items-center justify-center gap-2 py-8 text-gray-600">
                  <Loader2 className="animate-spin" size={18} />
                  Registering your employee account…
                </div>
              ) : (
                <>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="CY-1234-5678"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 font-mono text-center tracking-widest mb-3"
                    style={{ height: "48px" }}
                    disabled={pairStatus === "pending" || isBusy || !shopId}
                  />
                  {error && (
                    <p className="text-sm text-red-600 mb-3">{error}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => void submitPairingCode()}
                    disabled={
                      isBusy ||
                      pairStatus === "pending" ||
                      !shopId ||
                      !code.trim()
                    }
                    className="w-full rounded-full bg-[#c5f542] text-black font-semibold py-3 disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {pairStatus === "pending" ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Waiting for Owner / Manager approval…
                      </>
                    ) : isBusy ? (
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
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
