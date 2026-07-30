import React from 'react';
import { CheckIcon } from 'lucide-react';

interface WizardStepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export const WizardStepIndicator: React.FC<WizardStepIndicatorProps> = ({ steps, currentStep }) => {
  return (
    <div className="w-full px-1">
      <div className="mb-4 flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;
          
          return (
            <div key={index} className="flex min-w-0 flex-1 items-center">
              {/* Step Circle */}
              <div className="flex items-center">
                <div                  className={`
                    flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-all duration-200
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
                  className="mx-4 h-0.5 flex-1 transition-all duration-200"                  style={{
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
      <div className="grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          
          return (
            <div 
              key={index} 
              className="truncate px-2 text-center text-sm font-medium"
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
