import React from "react";
import { motion } from "framer-motion";
import { useEmployeeOnboard } from "../../../context/EmployeeOnboardContext";
import "../ShopWizard/styles/ShopWizard.css";

interface EmployeeOnboardProgressBarProps {
  className?: string;
  onNext?: () => void | Promise<void>;
  nextLabel?: string;
  hideNext?: boolean;
}

export const EmployeeOnboardProgressBar: React.FC<
  EmployeeOnboardProgressBarProps
> = ({ className = "", onNext, nextLabel = "Next", hideNext = false }) => {
  const { currentStep, totalSteps, nextStep, previousStep, canProceed, isBusy } =
    useEmployeeOnboard();

  const handleNext = async () => {
    if (!canProceed || isBusy) return;
    if (onNext) {
      await onNext();
    } else {
      nextStep();
    }
  };

  return (
    <div className={`w-full flex flex-col items-center ${className}`}>
      <div className="flex items-center justify-between w-full max-w-4xl mb-4">
        <div className="flex-1">
          {currentStep > 1 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={previousStep}
              disabled={isBusy}
              className="button-outline"
              style={{
                height: "32px",
                minWidth: "110px",
                padding: "0 14px",
                fontSize: "12px",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <svg
                style={{ width: "14px", height: "14px" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Go back
            </motion.button>
          )}
        </div>
        <div className="relative" style={{ width: "33%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
              height: "6px",
              gap: "3px",
            }}
          >
            {Array.from({ length: totalSteps }, (_, index) => (
              <div
                key={index}
                style={{
                  flex: 1,
                  height: "6px",
                  backgroundColor: "var(--gray--200)",
                  borderRadius: "3px",
                  border: "1px solid #d2d3d5",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {index < currentStep && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      height: "100%",
                      backgroundColor: "#c5f542",
                      borderRadius: "2px",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 flex justify-end gap-3">
          {currentStep < totalSteps && !hideNext && (
            <motion.button
              whileHover={{ scale: canProceed && !isBusy ? 1.02 : 1 }}
              whileTap={{ scale: canProceed && !isBusy ? 0.98 : 1 }}
              onClick={() => void handleNext()}
              disabled={!canProceed || isBusy}
              className={
                canProceed && !isBusy ? "button-primary" : "button-outline"
              }
              style={{
                height: "32px",
                minWidth: "110px",
                padding: "0 14px",
                fontSize: "12px",
                fontWeight: 500,
                backgroundColor:
                  canProceed && !isBusy ? "#c5f542" : "var(--gray--200)",
                color:
                  canProceed && !isBusy ? "#000000" : "var(--gray--500)",
                border: "1px solid var(--gray--300)",
                cursor: canProceed && !isBusy ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              {isBusy ? "Please wait…" : nextLabel}
              {!isBusy && (
                <svg
                  style={{ width: "14px", height: "14px" }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
};
