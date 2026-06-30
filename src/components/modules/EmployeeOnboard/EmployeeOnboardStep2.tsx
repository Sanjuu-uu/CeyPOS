import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mail, AlertCircle, CheckCircle } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { useEmployeeOnboard } from "../../../context/EmployeeOnboardContext";
import { postJSON } from "../../../lib/api";
import "../ShopWizard/styles/ShopWizard.css";

const cardVariants = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
};

interface VerificationError {
  error: string;
  code?: string;
  attemptsRemaining?: number;
  retryAfter?: number;
}

function parseErrorResponse(err: unknown): VerificationError {
  if (err instanceof Error) {
    try {
      const parsed = JSON.parse(err.message);
      return parsed;
    } catch {
      return { error: err.message };
    }
  }
  return { error: "Verification failed" };
}

export const EmployeeOnboardStep2: React.FC = () => {
  const { user } = useUser();
  const { formData, updateFormData, setError, error, isBusy, setIsBusy } =
    useEmployeeOnboard();
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(null);

  const userEmail = user?.primaryEmailAddress?.emailAddress || "";

  useEffect(() => {
    if (!sent && formData.phone && userEmail) {
      void sendCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendCode = async () => {
    if (!userEmail || !formData.phone) return;
    setIsBusy(true);
    setError(null);
    setInfo(null);
    setRetryAfterSeconds(null);
    try {
      const result = await postJSON<{ ok: boolean; devCode?: string }>(
        "/api/team/verify/send-code",
        { userEmail, phone: formData.phone },
      );
      setSent(true);
      if (result.devCode) {
        setInfo(`🔧 Development mode - Code: ${result.devCode}`);
      } else {
        setInfo("✓ Verification code sent to your phone.");
      }
    } catch (err) {
      const errorData = parseErrorResponse(err);
      if (errorData.retryAfter) {
        setRetryAfterSeconds(errorData.retryAfter);
        setError(`${errorData.error}\nPlease wait ${Math.ceil(errorData.retryAfter / 60)} minute(s).`);
      } else {
        setError(errorData.error || "Failed to send code");
      }
    } finally {
      setIsBusy(false);
    }
  };

  const verifyCode = async () => {
    if (!userEmail || !formData.phone || !code.trim()) {
      setError("Please enter the 6-digit verification code");
      return;
    }
    setIsBusy(true);
    setError(null);
    setAttemptsRemaining(null);
    try {
      await postJSON("/api/team/verify/check-code", {
        userEmail,
        phone: formData.phone,
        code: code.trim(),
      });
      updateFormData({ phoneVerified: true });
      setInfo("✓ Phone verified successfully!");
    } catch (err) {
      updateFormData({ phoneVerified: false });
      const errorData = parseErrorResponse(err);
      
      let errorMsg = errorData.error || "Invalid verification code";
      
      if (errorData.attemptsRemaining !== undefined) {
        setAttemptsRemaining(errorData.attemptsRemaining);
        if (errorData.attemptsRemaining === 0) {
          errorMsg = "Too many failed attempts. Please request a new code.";
        } else {
          errorMsg += ` (${errorData.attemptsRemaining} ${errorData.attemptsRemaining === 1 ? "attempt" : "attempts"} remaining)`;
        }
      }
      
      setError(errorMsg);
    } finally {
      setIsBusy(false);
    }
  };

  const canResend = !isBusy && !retryAfterSeconds;

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
          <div className="text-center mb-6">
            <div className="inline-flex items-center bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-4 py-2 rounded-full text-xs font-medium mb-4">
              📱 Phone Verification
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Enter Verification Code
            </h2>
            <p className="text-sm text-gray-600">
              We sent a 6-digit code to <strong>{formData.phone}</strong>
            </p>
          </div>

          {info && !error && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{info}</span>
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span className="whitespace-pre-line">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setError(null);
                  }}
                  maxLength={6}
                  autoComplete="one-time-code"
                  disabled={formData.phoneVerified}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-full text-xl text-center tracking-[0.75em] font-mono bg-gray-50"
                  placeholder="123456"
                  style={{ letterSpacing: "0.75em", paddingLeft: "0.375em" }}
                />
              </div>
            </div>

            {!formData.phoneVerified ? (
              <>
                <button
                  type="button"
                  onClick={() => void verifyCode()}
                  disabled={isBusy || code.length < 6}
                  className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white py-3 rounded-full text-sm font-medium transition-colors"
                >
                  {isBusy ? "Verifying…" : "Verify Code"}
                </button>

                <button
                  type="button"
                  onClick={() => void sendCode()}
                  disabled={!canResend}
                  className="w-full text-sm text-gray-900 hover:text-gray-700 disabled:text-gray-400 font-medium transition-colors"
                >
                  {retryAfterSeconds
                    ? `Resend in ${Math.ceil(retryAfterSeconds)} seconds`
                    : "Resend verification code"}
                </button>
              </>
            ) : (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm text-center flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>Phone verified — continue to connect your terminal.</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
