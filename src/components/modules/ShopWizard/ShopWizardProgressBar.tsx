import React from 'react';
import { motion } from 'framer-motion';
import { useShopWizard } from '../../../context/ShopWizardContext';
import './styles/ShopWizard.css';

// Update interface to accept the modal setter function
interface ShopWizardProgressBarProps {
  className?: string;
  setIsSkipModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ShopWizardProgressBar: React.FC<ShopWizardProgressBarProps> = ({ className = '', setIsSkipModalOpen }) => {
  const { currentStep, nextStep, previousStep, canProceed } = useShopWizard();
  const totalSteps = 6;

  // --- FIX APPLIED HERE ---
  // Override 'canProceed' for the Review & Confirm step (Step 5)
  // as it should always allow the user to move to the final step (Step 6).
  const shouldAllowNext = canProceed || currentStep === 5;

  const handleNext = () => {
    // Use the shouldAllowNext logic
    if (shouldAllowNext && currentStep < totalSteps) {
      nextStep();
    }
  };

  const handleSkip = () => {
    // Now just opens the modal in the parent component
    if (currentStep < totalSteps) {
      setIsSkipModalOpen(true); 
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      previousStep();
    }
  };

  // Determine if the current step can be skipped (assuming only Step 3 for now)
  const isCurrentStepSkippable = currentStep === 3;

  return (
    <div className={`w-full flex flex-col items-center ${className}`}>
      {/* Centered Small Width Progress Bar */}
      <div className="flex items-center justify-between w-full max-w-4xl mb-4">
        <div className="flex-1">
          {currentStep > 1 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePrevious}
              className="button-outline"
              style={{
                height: '32px',
                minWidth: '110px',
                padding: '0 14px',
                fontSize: '12px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <svg
                style={{ width: '14px', height: '14px' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Go back
            </motion.button>
          )}
        </div>
        <div className="relative" style={{ width: '33%' }}>
          {/* Progress Bar with Gaps */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            height: '6px',
            gap: '3px'
          }}>
            {/* 6 Segments with Gaps */}
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                style={{
                  flex: 1,
                  height: '6px',
                  backgroundColor: 'var(--gray--200)',
                  borderRadius: '3px',
                  border: '1px solid #d2d3d5',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Fill Each Segment Based on Progress */}
                {index < Math.ceil(((currentStep - 1) / (totalSteps - 1)) * 6) && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: index < Math.floor(((currentStep - 1) / (totalSteps - 1)) * 6) ? '100%' :
                            `${(((currentStep - 1) / (totalSteps - 1)) * 6 - Math.floor(((currentStep - 1) / (totalSteps - 1)) * 6)) * 100}%`
                    }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      height: '100%',
                      backgroundColor: '#c5f542',
                      borderRadius: '2px'
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 flex justify-end gap-3">
          {/* Skip Button - Triggers the modal via props */}
          {isCurrentStepSkippable && currentStep < totalSteps && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSkip}
              className="button-primary"
              style={{
                height: '32px',
                minWidth: '60px',
                padding: '0 14px',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: '#c5f542',
                color: '#000000',
                border: '1px solid #c5f542',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Skip
            </motion.button>
          )}

          {/* Next/Complete Button - Uses shouldAllowNext for logic */}
          <motion.button
            whileHover={{ scale: shouldAllowNext ? 1.02 : 1 }}
            whileTap={{ scale: shouldAllowNext ? 0.98 : 1 }}
            onClick={handleNext}
            disabled={!shouldAllowNext || currentStep >= totalSteps}
            className={shouldAllowNext && currentStep < totalSteps ? "button-primary" : "button-outline"}
            style={{
              height: '32px',
              minWidth: '110px',
              padding: '0 14px',
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: shouldAllowNext && currentStep < totalSteps ? '#c5f542' : 'var(--gray--200)',
              color: shouldAllowNext && currentStep < totalSteps ? '#000000' : 'var(--gray--500)',
              border: '1px solid var(--gray--300)',
              cursor: shouldAllowNext && currentStep < totalSteps ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            {currentStep >= totalSteps ? 'Complete' : 'Next'}
            {currentStep < totalSteps && (
              <svg
                style={{ width: '14px', height: '14px' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
};