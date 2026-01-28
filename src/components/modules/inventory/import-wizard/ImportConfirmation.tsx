import React, { useState } from 'react';
import { CheckCircleIcon, AlertTriangleIcon, PackageIcon } from 'lucide-react';

interface ValidationData {
  total: number;
  successful: number;
  errors: number;
  warnings: number;
}

interface ImportConfirmationProps {
  data: ValidationData;
  onConfirm: () => void;
}

export const ImportConfirmation: React.FC<ImportConfirmationProps> = ({ data, onConfirm }) => {
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importComplete, setImportComplete] = useState(false);

  const handleConfirmImport = async () => {
    setImporting(true);
    setImportProgress(0);

    // Simulate import progress
    for (let i = 0; i <= 100; i += 10) {
      setImportProgress(i);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    setImporting(false);
    setImportComplete(true);
    
    // Call the parent's onConfirm after a brief delay
    setTimeout(() => {
      onConfirm();
    }, 1500);
  };

  if (importComplete) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center">
        <div 
          className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
          style={{ 
            backgroundColor: 'var(--verde-naturale--primary)',
            borderRadius: 'var(--radius--40px)',
          }}
        >
          <CheckCircleIcon 
            size={32} 
            style={{ color: 'var(--gray--900)' }}
          />
        </div>
        
        <h3 
          className="text-2xl font-bold mb-4"
          style={{ color: 'var(--gray--900)' }}
        >
          Import Completed Successfully!
        </h3>
        
        <p 
          className="text-lg mb-6"
          style={{ color: 'var(--gray--600)' }}
        >
          {data.successful} items have been imported to your inventory.
        </p>
        
        <div 
          className="text-sm p-4 rounded-lg"
          style={{ 
            backgroundColor: 'var(--verde-naturale--primary)/10',
            color: 'var(--gray--700)',
            borderRadius: 'var(--radius--12px)',
          }}
        >
          Your inventory has been successfully updated. You can now view and manage the imported items.
        </div>
      </div>
    );
  }

  if (importing) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center">
        <div 
          className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
          style={{ 
            backgroundColor: 'var(--gray--100)',
            borderRadius: 'var(--radius--40px)',
          }}
        >
          <div 
            className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--verde-naturale--primary)' }}
          />
        </div>
        
        <h3 
          className="text-xl font-bold mb-4"
          style={{ color: 'var(--gray--900)' }}
        >
          Importing Data...
        </h3>
        
        <p 
          className="text-base mb-6"
          style={{ color: 'var(--gray--600)' }}
        >
          Please wait while we import your inventory data
        </p>
        
        <div className="w-full max-w-md">
          <div className="flex justify-between text-sm mb-2">
            <span style={{ color: 'var(--gray--600)' }}>Progress</span>
            <span style={{ color: 'var(--gray--600)' }}>{importProgress}%</span>
          </div>
          <div 
            className="w-full h-3 rounded-full"
            style={{ backgroundColor: 'var(--gray--200)' }}
          >
            <div 
              className="h-full rounded-full transition-all duration-300"
              style={{ 
                width: `${importProgress}%`,
                backgroundColor: 'var(--verde-naturale--primary)',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="max-w-4xl mx-auto">
        <h3 
          className="text-xl font-bold text-center mb-8"
          style={{ color: 'var(--gray--900)' }}
        >
          Confirm Import
        </h3>

        {/* Summary Overview */}
        <div 
          className="p-6 rounded-lg mb-6"
          style={{ 
            backgroundColor: 'var(--gray--50)',
            borderRadius: 'var(--radius--16px)',
          }}
        >
          <h4 
            className="text-lg font-semibold mb-4"
            style={{ color: 'var(--gray--900)' }}
          >
            Import Summary
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ 
                  backgroundColor: 'var(--verde-naturale--primary)',
                  borderRadius: 'var(--radius--12px)',
                }}
              >
                <PackageIcon 
                  size={20} 
                  style={{ color: 'var(--gray--900)' }}
                />
              </div>
              <div>
                <p 
                  className="text-sm"
                  style={{ color: 'var(--gray--600)' }}
                >
                  Total Items
                </p>
                <p 
                  className="text-lg font-semibold"
                  style={{ color: 'var(--gray--900)' }}
                >
                  {data.total}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ 
                  backgroundColor: 'var(--verde-naturale--primary)',
                  borderRadius: 'var(--radius--12px)',
                }}
              >
                <CheckCircleIcon 
                  size={20} 
                  style={{ color: 'var(--gray--900)' }}
                />
              </div>
              <div>
                <p 
                  className="text-sm"
                  style={{ color: 'var(--gray--600)' }}
                >
                  Valid Records
                </p>
                <p 
                  className="text-lg font-semibold"
                  style={{ color: 'var(--gray--900)' }}
                >
                  {data.successful}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ 
                  backgroundColor: 'var(--yellow--200)',
                  borderRadius: 'var(--radius--12px)',
                }}
              >
                <AlertTriangleIcon 
                  size={20} 
                  style={{ color: 'var(--yellow--700)' }}
                />
              </div>
              <div>
                <p 
                  className="text-sm"
                  style={{ color: 'var(--gray--600)' }}
                >
                  Warnings
                </p>
                <p 
                  className="text-lg font-semibold"
                  style={{ color: 'var(--gray--900)' }}
                >
                  {data.warnings}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* What will happen */}
        <div 
          className="p-6 rounded-lg mb-6"
          style={{ 
            border: '1px solid var(--gray--200)',
            borderRadius: 'var(--radius--12px)',
          }}
        >
          <h4 
            className="text-lg font-semibold mb-4"
            style={{ color: 'var(--gray--900)' }}
          >
            What will happen during import:
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircleIcon 
                size={20} 
                style={{ color: 'var(--verde-naturale--primary)' }}
              />
              <span style={{ color: 'var(--gray--700)' }}>
                {data.successful} new inventory items will be added
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <CheckCircleIcon 
                size={20} 
                style={{ color: 'var(--verde-naturale--primary)' }}
              />
              <span style={{ color: 'var(--gray--700)' }}>
                Product categories will be automatically organized
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <CheckCircleIcon 
                size={20} 
                style={{ color: 'var(--verde-naturale--primary)' }}
              />
              <span style={{ color: 'var(--gray--700)' }}>
                Stock levels will be updated in real-time
              </span>
            </div>
            
            {data.warnings > 0 && (
              <div className="flex items-center gap-3">
                <AlertTriangleIcon 
                  size={20} 
                  style={{ color: 'var(--yellow--500)' }}
                />
                <span style={{ color: 'var(--gray--700)' }}>
                  {data.warnings} items have warnings but will still be imported
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <button
            onClick={handleConfirmImport}
            className="button-primary px-8 py-4 font-medium transition-all duration-200 flex items-center gap-3"
            style={{ 
              borderRadius: 'var(--radius--12px)',
              backgroundColor: 'var(--verde-naturale--primary)',
              color: 'var(--gray--900)',
              border: 'none',
            }}
          >
            <CheckCircleIcon size={20} />
            Confirm Import ({data.successful} items)
          </button>
        </div>

        {/* Safety Notice */}
        <div 
          className="mt-6 text-xs text-center p-4 rounded-lg"
          style={{ 
            backgroundColor: 'var(--gray--50)',
            color: 'var(--gray--600)',
            borderRadius: 'var(--radius--12px)',
          }}
        >
          <strong>Note:</strong> This action cannot be undone. Make sure you have a backup of your current inventory data.
        </div>
      </div>
    </div>
  );
};
