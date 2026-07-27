import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useClerk, useUser } from "@clerk/clerk-react";
import { useEmployeeOnboard } from "../../../context/EmployeeOnboardContext";
import { EmployeeOnboardStep1 } from "./EmployeeOnboardStep1";
import { EmployeeOnboardStep2 } from "./EmployeeOnboardStep2";
import { EmployeeOnboardStep3 } from "./EmployeeOnboardStep3";
import { EmployeeOnboardProgressBar } from "./EmployeeOnboardProgressBar";
import { cancelClerkUserAndSignOut } from "../../../lib/authFlow";
import { postJSON } from "../../../lib/api";
import backgroundImage from "../../../assets/images.jpg";
import "../ShopWizard/styles/ShopWizard.css";

const slideVariants = {
  initial: (direction: string) => ({
    y: direction === "next" ? 200 : -200,
    opacity: 0,
  }),
  animate: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: (direction: string) => ({
    y: direction === "next" ? -200 : 200,
    opacity: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  }),
};

const containerVariants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

const modalBackdropVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalContentVariants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1, transition: { delay: 0.1 } },
  exit: { scale: 0.9, opacity: 0 },
};

export const EmployeeOnboardWizard: React.FC = () => {
  const { currentStep, animationDirection, nextStep, canProceed, formData, setError } =
    useEmployeeOnboard();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <EmployeeOnboardStep1 />;
      case 2:
        return <EmployeeOnboardStep2 />;
      case 3:
        return <EmployeeOnboardStep3 />;
      default:
        return <EmployeeOnboardStep1 />;
    }
  };

  const handleStepNext = async () => {
    if (!canProceed) return;
    if (currentStep === 2 && !formData.phoneVerified) {
      setError("Verify your phone number before continuing.");
      return;
    }
    nextStep();
  };

  const [cancelError, setCancelError] = useState<string | null>(null);

  const handleCancelConfirm = async () => {
    setIsDeleting(true);
    setCancelError(null);

    if (formData.shopId) {
      try {
        await postJSON("/api/team/cancel-onboard", {
          shopId: formData.shopId,
          ownerEmail: formData.mainTerminalEmail.trim(),
        });
      } catch (error) {
        console.warn("Employee cancel: shop cleanup failed", error);
      }
    }

    await cancelClerkUserAndSignOut({
      user,
      signOut,
      redirectUrl: `${window.location.origin}/`,
      onDeleteError: () => {
        setCancelError(
          "Could not delete your Clerk account automatically. You may need to remove it from Clerk Dashboard → Users. Proceeding to sign out.",
        );
      },
      onSignOutError: (error) => {
        console.error("Employee cancel: signOut failed", error);
      },
    });
  };

  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="h-screen flex flex-col"
        style={{
          backgroundColor: "var(--main--white)",
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          overflow: "hidden",
        }}
      >
        <motion.div
          className="navigation"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            flexShrink: 0,
          }}
        >
          <div className="navigation-container">
            <div className="navigation-left">
              <div className="navigation-logo">
                <svg width="92" height="28" viewBox="0 0 92 28" fill="none">
                  <rect width="92" height="28" rx="8" />
                  <text
                    x="46"
                    y="18"
                    textAnchor="middle"
                    fill="var(--gray--900)"
                    fontSize="12"
                    fontWeight="600"
                  >
                    CeyPOS
                  </text>
                </svg>
              </div>
            </div>
            <div className="nav-menu">
              <h3
                style={{
                  color: "var(--gray--900)",
                  letterSpacing: "-.01em",
                  marginTop: 0,
                  marginBottom: 0,
                  fontSize: "24px",
                  fontWeight: 600,
                  lineHeight: 1.2,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Employee Setup In CeyPOS
              </h3>
            </div>
            <div className="navigation-right">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(true)}
                className="button-danger-small"
                disabled={isDeleting}
              >
                Cancel
              </button>
            </div>
          </div>
        </motion.div>

        <div
          className="flex-1 flex items-center justify-center px-4 overflow-hidden"
          style={{ height: "calc(100vh - 140px)", position: "relative" }}
        >
          <div className="w-full max-w-5xl" style={{ height: "100%" }}>
            <AnimatePresence mode="wait" custom={animationDirection}>
              <motion.div
                key={currentStep}
                custom={animationDirection}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full h-full flex items-center justify-center"
                style={{ position: "absolute", top: 0, left: 0, right: 0 }}
              >
                <div
                  className="w-full max-h-full"
                  style={{ overflowY: "auto", padding: "20px 0" }}
                >
                  {renderStep()}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <motion.div
          className="w-full px-6 pb-4 pt-2"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            flexShrink: 0,
            zIndex: 10,
          }}
        >
          <div className="max-w-5xl mx-auto">
            <EmployeeOnboardProgressBar
              onNext={handleStepNext}
              hideNext={currentStep < 3}
            />
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {isCancelModalOpen && (
          <motion.div
            variants={modalBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
              backdropFilter: "blur(4px)",
            }}
            onClick={() => !isDeleting && setIsCancelModalOpen(false)}
          >
            <motion.div
              variants={modalContentVariants}
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                width: "100%",
                maxWidth: "420px",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                overflow: "hidden",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: "24px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
                  Cancel Employee Setup?
                </h3>
                <p style={{ fontSize: "14px", color: "var(--gray--600)", margin: 0 }}>
                  This will permanently delete your account. You can sign up again
                  later as an Employee or Owner / Manager.
                </p>
                {cancelError && (
                  <p style={{ fontSize: "13px", color: "#dc2626", marginTop: "12px" }}>
                    {cancelError}
                  </p>
                )}
              </div>
              <div
                style={{
                  backgroundColor: "#F9FAFB",
                  padding: "16px 24px",
                  borderTop: "1px solid #E5E7EB",
                  display: "flex",
                  gap: "12px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  disabled={isDeleting}
                  className="button-secondary-small"
                >
                  No, continue
                </button>
                <button
                  type="button"
                  onClick={() => void handleCancelConfirm()}
                  disabled={isDeleting}
                  className="button-danger-solid-small"
                >
                  {isDeleting ? "Deleting…" : "Yes, cancel & delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
