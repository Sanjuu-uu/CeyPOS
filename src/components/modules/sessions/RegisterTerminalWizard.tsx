import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { postJSON, authFetch } from "../../../lib/api";
import { API_ROUTES } from "../../../lib/apiRoutes";
import { db } from "../../../lib/db";

interface RegisterTerminalWizardProps {
  onClose: () => void;
  sidebarCollapsed: boolean;
  shopId: string;
  userEmail: string;
  onManagePlan?: () => void;
}

type PendingRequest = {
  request_id: string;
  member_name: string;
  member_email: string;
  requested_at: string;
  device_meta?: string | null;
};

export const RegisterTerminalWizard: React.FC<RegisterTerminalWizardProps> = ({
  onClose,
  sidebarCollapsed,
  shopId,
  userEmail,
  onManagePlan,
}) => {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  const loadCode = async () => {
    setLoading(true);
    setError(null);
    setLimitReached(false);
    try {
      const result = await postJSON<{ ok: boolean; code: string; expiresAt: string }>(
        API_ROUTES.terminals.pairingCodeCreate,
        { shopId, userEmail },
      );
      setCode(result.code);
      setExpiresAt(result.expiresAt);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create pairing code";
      if (message.toLowerCase().includes("register terminal limit reached")) {
        setLimitReached(true);
        setError("Register terminal limit reached for the current plan.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadPending = async () => {
    try {
      const params = new URLSearchParams({ shopId, userEmail });
      const res = await authFetch(API_ROUTES.terminals.pairingPending(params));
      const result = await res.json();
      if (res.ok) setPending(result.pending || []);
    } catch {
      // ignore polling errors
    }
  };

  useEffect(() => {
    void loadCode();
    void loadPending();
    const interval = window.setInterval(() => {
      void loadPending();
    }, 3000);

    const unsubscribe = db.on("sessionUpdated", (payload: unknown) => {
      const event = payload as { action?: string };
      if (event?.action === "pairing_pending" || event?.action === "approved") {
        void loadPending();
      }
    });

    return () => {
      window.clearInterval(interval);
      unsubscribe();
    };
  }, [shopId, userEmail]);

  const approve = async (requestId: string) => {
    setApproving(requestId);
    try {
      await postJSON(API_ROUTES.terminals.pairingApprove, { shopId, userEmail, requestId });
      await loadPending();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setApproving(null);
    }
  };

  const reject = async (requestId: string) => {
    try {
      await postJSON(API_ROUTES.terminals.pairingReject, { shopId, userEmail, requestId });
      await loadPending();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reject failed");
    }
  };

  return (
    <div className="fixed inset-0 z-40">
      <div
        className={`absolute right-0 bottom-0 top-[60px] left-0 ${sidebarCollapsed ? "md:left-16" : "md:left-60"} bg-black/10 backdrop-blur-sm`}
      />
      <div
        className={`absolute right-0 bottom-0 top-[60px] left-0 ${sidebarCollapsed ? "md:left-16" : "md:left-60"} flex items-center justify-center p-4 md:p-6`}
      >
        <motion.div
          className="relative z-10 w-full max-w-2xl flex flex-col bg-white shadow-2xl overflow-hidden"
          style={{
            borderRadius: "var(--radius--16px)",
            border: "1px solid var(--gray--200)",
            maxHeight: "min(900px, calc(100dvh - 120px))",
          }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="p-6 border-b flex-shrink-0" style={{ borderColor: "var(--gray--200)" }}>
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold" style={{ color: "var(--gray--900)" }}>
                  Connect Register Terminal
                </h2>
                <p className="text-sm" style={{ color: "var(--gray--600)" }}>
                  Share this code with an employee on their register device
                </p>
              </div>
              <button onClick={onClose} className="rounded-full bg-[#c5f542] px-4 py-2 text-sm font-medium text-black hover:bg-[#b8ea34]" aria-label="Close">
                Close
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto">
            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="rounded-xl border border-gray-200 p-5 text-center bg-gray-50">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Pairing code</p>
              {loading ? (
                <p className="text-sm font-medium text-gray-500">Loading...</p>
              ) : limitReached ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-700">
                    This shop has reached its register terminal limit. Upgrade the plan to add more terminals.
                  </p>
                  <button
                    type="button"
                    onClick={onManagePlan}
                    className="inline-flex items-center rounded-full bg-[#c5f542] px-4 py-2 text-sm font-semibold text-black hover:bg-[#b8ea34]"
                    disabled={!onManagePlan}
                  >
                    Manage plan
                  </button>
                </div>
              ) : (
                <p className="text-3xl font-mono font-bold tracking-widest text-gray-900">{code || "—"}</p>
              )}
              {expiresAt && (
                <p className="text-xs text-gray-500 mt-2">
                  Expires {new Date(expiresAt).toLocaleTimeString()}
                </p>
              )}
              <button
                type="button"
                onClick={loadCode}
                className="mt-4 inline-flex items-center rounded-full bg-[#c5f542] px-4 py-2 text-sm font-medium text-black hover:bg-[#b8ea34]"
              >
                {limitReached ? "Retry" : "Generate new code"}
              </button>
            </div>

            <div>
              <div className="mb-3">
                <h3 className="font-semibold text-gray-900">Pending approvals</h3>
              </div>
              {pending.length === 0 ? (
                <p className="text-sm text-gray-500">No pending register requests.</p>
              ) : (
                <div className="space-y-3">
                  {pending.map((item) => (
                    <div
                      key={item.request_id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{item.member_name}</p>
                        <p className="text-xs text-gray-500">{item.member_email}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => reject(item.request_id)}
                          className="rounded-full bg-[#c5f542] px-3 py-1.5 text-sm font-medium text-black hover:bg-[#b8ea34]"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => approve(item.request_id)}
                          disabled={approving === item.request_id}
                          className="rounded-full bg-[#c5f542] px-3 py-1.5 text-sm font-medium text-black hover:bg-[#b8ea34] disabled:opacity-60"
                        >
                          {approving === item.request_id ? "Approving…" : "Approve"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
