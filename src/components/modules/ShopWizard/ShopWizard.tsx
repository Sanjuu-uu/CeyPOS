import React, { useState } from "react"; // Import useState
import { motion, AnimatePresence } from "framer-motion";
import { useShopWizard } from "../../../context/ShopWizardContext";
import { useUser, useClerk } from "@clerk/clerk-react"; // Import Clerk hooks
import { ShopWizardStep1 } from "./ShopWizardStep1";
import { ShopWizardStep2 } from "./ShopWizardStep2";
import { ShopWizardStep3 } from "./ShopWizardStep3";
import { ShopWizardStep4 } from "./ShopWizardStep4";
import { ShopWizardStep5 } from "./ShopWizardStep5";
import { ShopWizardStep6 } from "./ShopWizardStep6";
import { ShopWizardProgressBar } from "./ShopWizardProgressBar";
import backgroundImage from "./assets/blog-20background-1.png";
import "./styles/ShopWizard.css"; // Make sure to add new styles to this file

const slideVariants = {
  initial: (direction: string) => ({
    y: direction === "next" ? 200 : -200,
    opacity: 0,
  }),
  animate: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
  exit: (direction: string) => ({
    y: direction === "next" ? -200 : 200,
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  }),
};

const containerVariants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
      staggerChildren: 0.05,
    },
  },
};

// Animation variants for the modal
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

export const ShopWizard: React.FC = () => {
  const { currentStep, animationDirection } = useShopWizard();
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user } = useUser();
  const { signOut } = useClerk();

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <ShopWizardStep1 />;
      case 2:
        return <ShopWizardStep2 />;
      case 3:
        return <ShopWizardStep3 />;
      case 4:
        return <ShopWizardStep4 />;
      case 5:
        return <ShopWizardStep5 />;
      case 6:
        return <ShopWizardStep6 />;
      default:
        return <ShopWizardStep1 />;
    }
  };

  // Handles the final confirmation to delete the user account
  const handleCancelConfirm = async () => {
    if (!user) return;

    setIsDeleting(true);
    try {
      // Delete the user from Clerk
      await user.delete();
      // Sign out and redirect to the home page (or your sign-up page)
      await signOut({ redirectUrl: "/" });
    } catch (error) {
      console.error("Error deleting user:", error);
      // Handle error, e.g., show a notification to the user
      setIsDeleting(false);
    }
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
          overflow: "hidden", // Prevent scrollbar during animations
        }}
      >
        {/* Navigation Bar - Dashboard Style */}
        <motion.div
          className="navigation"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            flexShrink: 0, // Prevent navbar from shrinking
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
                Shop Creation In CeyPOS
              </h3>
            </div>

            <div className="navigation-right">
              <div className="navigation-button-group">
                {/* --- MODIFIED BUTTON --- */}
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(true)}
                  className="button-danger-small" // Use new red button style
                  disabled={isDeleting}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content - Centered and Optimized */}
        <div
          className="flex-1 flex items-center justify-center px-4 overflow-hidden"
          style={{
            height: "calc(100vh - 140px)", // Fixed height
            position: "relative",
          }}
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

        {/* Progress Bar - Compact Footer */}
        <motion.div
          className="w-full px-6 pb-4 pt-2"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            flexShrink: 0, // Prevent footer from shrinking
            zIndex: 10, // Ensure footer stays on top
          }}
        >
          <div className="max-w-5xl mx-auto">
            <ShopWizardProgressBar className="w-full" />
          </div>
        </motion.div>
      </motion.div>

      {/* --- CANCEL CONFIRMATION MODAL (Updated Professional Look) --- */}
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
            onClick={() => !isDeleting && setIsCancelModalOpen(false)} // Close on overlay click
          >
            <motion.div
              variants={modalContentVariants}
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                width: "100%",
                maxWidth: "420px", // Slightly wider for the icon
                boxShadow:
                  "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                overflow: "hidden", // To ensure rounded corners clip the content
              }}
              onClick={(e) => e.stopPropagation()} // Prevent modal from closing when clicking inside
            >
              {/* Modal Content */}
              <div style={{ display: "flex", padding: "24px" }}>
                {/* Icon */}
                <div
                  style={{
                    flexShrink: 0,
                    marginRight: "16px",
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: "#fef2f2c4", // bg-red-50
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    style={{
                      width: "24px",
                      height: "24px",
                      color: "#DC2626", // text-red-600
                    }}
                  >
                    <path
                      fillRule="evenodd"
                      d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.557 13.004c1.155 2-.29 4.5-2.599 4.5H4.443c-2.308 0-3.753-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>

                {/* Text Content */}
                <div style={{ minWidth: 0 }}>
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: 600,
                      color: "var(--gray--900, #111827)",
                      marginTop: 0,
                      marginBottom: "8px",
                    }}
                  >
                    Cancel Shop Creation?
                  </h3>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "var(--gray--600, #4B5563)",
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    Are you sure you want to cancel? This action is irreversible
                    and will <strong>permanently delete your account</strong>{" "}
                    and all associated shop data.
                  </p>
                </div>
              </div>

              {/* Modal Footer (Button Bar) */}
              <div
                style={{
                  backgroundColor: "#F9FAFB", // bg-gray-50
                  padding: "16px 24px",
                  borderTop: "1px solid #E5E7EB", // border-gray-200
                  display: "flex",
                  gap: "12px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  disabled={isDeleting}
                  className="button-secondary-small" // Use new secondary style
                  style={{ opacity: isDeleting ? 0.7 : 1 }}
                >
                  No, continue
                </button>
                <button
                  type="button"
                  onClick={handleCancelConfirm}
                  disabled={isDeleting}
                  className="button-danger-solid-small" // Use new SOLID red style
                  style={{
                    opacity: isDeleting ? 0.7 : 1,
                    minWidth: "130px", // Prevent layout shift
                  }}
                >
                  {isDeleting ? "Deleting..." : "Yes, cancel & delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
