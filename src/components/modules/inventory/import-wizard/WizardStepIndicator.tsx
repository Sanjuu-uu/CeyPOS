import React from 'react';
import { CheckIcon } from 'lucide-react';

interface WizardStepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export const WizardStepIndicator: React.FC<WizardStepIndicatorProps> = ({ steps, currentStep }) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;
          
          return (
            <div key={index} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex items-center">
                <div                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200
                    ${isCompleted 
                      ? 'text-black' 
                      : isActive 
                        ? 'text-black' 
                        : 'text-gray-400'
                    }
                  `}style={{
                    backgroundColor: isCompleted 
                      ? '#c5f542' 
                      : isActive 
                        ? '#c5f542' 
                        : 'var(--gray--200)',
                    borderRadius: 'var(--radius--40px)',
                  }}
                >
                  {isCompleted ? (
                    <CheckIcon size={18} />
                  ) : (
                    stepNumber
                  )}
                </div>
              </div>
              
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div 
                  className="flex-1 h-0.5 mx-4 transition-all duration-200"                  style={{
                    backgroundColor: stepNumber < currentStep 
                      ? '#c5f542' 
                      : 'var(--gray--200)',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      
      {/* Step Labels */}
      <div className="flex justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          
          return (
            <div 
              key={index} 
              className="text-sm font-medium text-center flex-1"
              style={{
                color: isActive ? 'var(--gray--900)' : 'var(--gray--500)',
              }}
            >
              {step}
            </div>
          );
        })}
      </div>
    </div>
  );
};
