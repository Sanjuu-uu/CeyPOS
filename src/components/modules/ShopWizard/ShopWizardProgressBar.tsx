import React from 'react';
import { motion } from 'framer-motion';
import { useShopWizard } from '../../../context/ShopWizardContext';
import './styles/ShopWizard.css';

interface ShopWizardProgressBarProps {
  className?: string;
}

export const ShopWizardProgressBar: React.FC<ShopWizardProgressBarProps> = ({ className = '' }) => {
  // Use the correct function name from context
  const { currentStep, nextStep, previousStep, canProceed } = useShopWizard();
  const totalSteps = 6;

  const handleNext = () => {
    if (canProceed && currentStep < totalSteps) {
      nextStep();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      previousStep(); // Use the correct function name
    }
  };

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
            gap: '3px' // Add gap between segments
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
        <div className="flex-1 flex justify-end">
          <motion.button
            whileHover={{ scale: canProceed ? 1.02 : 1 }}
            whileTap={{ scale: canProceed ? 0.98 : 1 }}
            onClick={handleNext}
            disabled={!canProceed || currentStep >= totalSteps}
            className={canProceed && currentStep < totalSteps ? "button-primary" : "button-outline"}
            style={{
              height: '32px',
              minWidth: '110px',
              padding: '0 14px',
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: canProceed && currentStep < totalSteps ? '#c5f542' : 'var(--gray--200)',
              color: canProceed && currentStep < totalSteps ? '#000000' : 'var(--gray--500)',
              border: '1px solid var(--gray--300)',
              cursor: canProceed && currentStep < totalSteps ? 'pointer' : 'not-allowed',
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