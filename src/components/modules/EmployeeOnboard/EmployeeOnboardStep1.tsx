import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useEmployeeOnboard } from "../../../context/EmployeeOnboardContext";
import { postJSON } from "../../../lib/api";
import "../ShopWizard/styles/ShopWizard.css";

const cardVariants = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
};

const inputVariants = {
  initial: { y: 15, opacity: 0 },
  animate: (index: number) => ({
    y: 0,
    opacity: 1,
    transition: { duration: 0.4, delay: index * 0.05, ease: "easeOut" },
  }),
};

const countryCodes = [
  { value: "+94", label: "LK +94" },
  { value: "+91", label: "IN +91" },
  { value: "+1", label: "US +1" },
  { value: "+44", label: "UK +44" },
];

export const EmployeeOnboardStep1: React.FC = () => {
  const { formData, updateFormData, setError, nextStep, canProceed } =
    useEmployeeOnboard();
  const [countryCode, setCountryCode] = useState("+94");
  const [localPhone, setLocalPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checkingOwner, setCheckingOwner] = useState(false);
  const autoAdvancedRef = useRef(false);

  useEffect(() => {
    if (!canProceed) {
      autoAdvancedRef.current = false;
      return;
    }
    if (autoAdvancedRef.current) return;
    autoAdvancedRef.current = true;
    const timer = window.setTimeout(() => {
      nextStep();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [canProceed, nextStep]);

  useEffect(() => {
    if (formData.phone) {
      const parts = formData.phone.split(" ");
      const found = countryCodes.find((c) => c.value === parts[0]);
      if (found && parts.length > 1) {
        setCountryCode(found.value);
        setLocalPhone(parts.slice(1).join(" "));
      }
    }
  }, [formData.phone]);

  useEffect(() => {
    const localDigits = localPhone.replace(/\D/g, "").replace(/^0+/, "");
    const combinedPhone =
      localDigits.length >= 7 ? `${countryCode} ${localDigits}`.trim() : "";
    updateFormData({
      displayName: formData.displayName,
      mainTerminalEmail: formData.mainTerminalEmail,
      phone: combinedPhone,
      phoneVerified: false,
    });
  }, [
    countryCode,
    localPhone,
    formData.displayName,
    formData.mainTerminalEmail,
    updateFormData,
  ]);

  const validate = (field: string, value: string) => {
    switch (field) {
      case "displayName":
        return value.trim() ? "" : "Your name is required.";
      case "mainTerminalEmail":
        if (!value.trim()) return "Main terminal email is required.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return "Enter a valid email address.";
        }
        return "";
      case "localPhone":
        if (!value.trim()) return "Phone number is required.";
        if (!/^[0-9\s-]{7,12}$/.test(value)) {
          return "Enter a valid phone number (7–12 digits).";
        }
        return "";
      default:
        return "";
    }
  };

  const handleBlur = async (field: string, value: string) => {
    const message = validate(field, value);
    setErrors((prev) => ({ ...prev, [field]: message }));

    if (field === "mainTerminalEmail" && !message) {
      setCheckingOwner(true);
      setError(null);
      try {
        await postJSON("/api/team/lookup-owner", { ownerEmail: value.trim() });
        updateFormData({ ownerVerified: true });
      } catch {
        updateFormData({ ownerVerified: false });
        setErrors((prev) => ({
          ...prev,
          mainTerminalEmail:
            "No shop found for this main terminal email. Check with your Owner / Manager.",
        }));
      } finally {
        setCheckingOwner(false);
      }
    }
  };

  return (
    <div className="w-full flex justify-center">
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        className="w-full max-w-3xl"
      >
        <div
          className="p-6 shadow-lg"
          style={{
            backgroundColor: "var(--main--white)",
            borderRadius: "var(--radius--16px)",
            border: "1px solid var(--gray--200)",
          }}
        >
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-center mb-6"
          >
            <h2
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "20px",
                fontWeight: 600,
                color: "var(--gray--900)",
                marginBottom: "6px",
              }}
            >
              Connect to Your Shop
            </h2>
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "14px",
                color: "var(--gray--500)",
              }}
            >
              Enter your details and the main terminal email from your Owner /
              Manager.
            </p>
          </motion.div>

          <div className="space-y-4 max-w-xl mx-auto">
            <motion.div custom={0} variants={inputVariants} initial="initial" animate="animate">
              <label className="block text-xs font-medium text-gray-900 mb-1.5">
                Your Name *
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => {
                  updateFormData({ displayName: e.target.value, phoneVerified: false });
                  if (errors.displayName) setErrors((p) => ({ ...p, displayName: "" }));
                }}
                onBlur={(e) => void handleBlur("displayName", e.target.value)}
                placeholder="Enter your full name"
                className="text-field-outline"
                style={{
                  width: "100%",
                  height: "48px",
                  border: `1px solid ${errors.displayName ? "#ef4444" : "var(--gray--200)"}`,
                  borderRadius: "var(--radius--12px)",
                  padding: "0 16px",
                  fontSize: "14px",
                }}
              />
              {errors.displayName && (
                <p className="text-xs text-red-500 mt-1">{errors.displayName}</p>
              )}
            </motion.div>

            <motion.div custom={1} variants={inputVariants} initial="initial" animate="animate">
              <label className="block text-xs font-medium text-gray-900 mb-1.5">
                Main Terminal Email *
              </label>
              <input
                type="email"
                value={formData.mainTerminalEmail}
                onChange={(e) => {
                  updateFormData({
                    mainTerminalEmail: e.target.value,
                    phoneVerified: false,
                    ownerVerified: false,
                  });
                  if (errors.mainTerminalEmail) {
                    setErrors((p) => ({ ...p, mainTerminalEmail: "" }));
                  }
                }}
                onBlur={(e) => void handleBlur("mainTerminalEmail", e.target.value)}
                placeholder="owner@example.com"
                className="text-field-outline font-mono text-sm"
                style={{
                  width: "100%",
                  height: "48px",
                  border: `1px solid ${errors.mainTerminalEmail ? "#ef4444" : "var(--gray--200)"}`,
                  borderRadius: "var(--radius--12px)",
                  padding: "0 16px",
                  fontSize: "14px",
                }}
              />
              {checkingOwner && (
                <p className="text-xs text-gray-500 mt-1">Verifying shop…</p>
              )}
              {errors.mainTerminalEmail && (
                <p className="text-xs text-red-500 mt-1">{errors.mainTerminalEmail}</p>
              )}
            </motion.div>

            <motion.div custom={2} variants={inputVariants} initial="initial" animate="animate">
              <label className="block text-xs font-medium text-gray-900 mb-1.5">
                Phone Number *
              </label>
              <div className="flex">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  style={{
                    height: "48px",
                    border: "1px solid var(--gray--200)",
                    borderRight: "none",
                    borderRadius: "var(--radius--12px) 0 0 var(--radius--12px)",
                    backgroundColor: "var(--gray--100)",
                    padding: "0 12px",
                    fontSize: "14px",
                  }}
                >
                  {countryCodes.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={localPhone}
                  onChange={(e) => {
                    setLocalPhone(e.target.value);
                    updateFormData({ phoneVerified: false });
                    if (errors.localPhone) setErrors((p) => ({ ...p, localPhone: "" }));
                  }}
                  onBlur={(e) => void handleBlur("localPhone", e.target.value)}
                  placeholder="e.g. 771234567"
                  style={{
                    width: "100%",
                    height: "48px",
                    border: `1px solid ${errors.localPhone ? "#ef4444" : "var(--gray--200)"}`,
                    borderRadius: "0 var(--radius--12px) var(--radius--12px) 0",
                    padding: "0 16px",
                    fontSize: "14px",
                  }}
                />
              </div>
              {errors.localPhone && (
                <p className="text-xs text-red-500 mt-1">{errors.localPhone}</p>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
