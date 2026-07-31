import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, X } from 'lucide-react';
import { WizardStepIndicator } from './WizardStepIndicator';
import { TemplateDownload } from './TemplateDownload';
import { FileUpload } from './FileUpload';
import { DataValidation, type ValidationSummary } from './DataValidation';
import { ImportConfirmation } from './ImportConfirmation';
import { useShopWizard } from '../../../../context/ShopWizardContext';
import { useApp } from '../../../../context/AppContext';
import { authFetch } from '../../../../lib/api';
import { API_ROUTES } from '../../../../lib/apiRoutes';

interface ImportWizardProps {
  onClose?: () => void;
  onImportComplete?: (data: ValidationSummary) => void;
}

export const ImportWizard: React.FC<ImportWizardProps> = ({ onClose, onImportComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationData, setValidationData] = useState<ValidationSummary>({
    total: 0,
    successful: 0,
    errors: 0,
    warnings: 0,
    backendError: null,
    validationIssues: [],
  });
  const { shopId: wizardShopId } = useShopWizard();
  const { currentShop, isSidebarCollapsed } = useApp();

  const shopId = useMemo(() => {
    if (wizardShopId) {
      return wizardShopId;
    }
    const contextShopId = currentShop?.id?.replace(/^shop_/, '') || '';
    return contextShopId;
  }, [currentShop?.id, wizardShopId]);

  const steps = [
    'Download Template',
    'Upload File',
    'Validate Data',
    'Confirm Import'
  ];

  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    setUploadProgress(0);
    setValidationData({
      total: 0,
      successful: 0,
      errors: 0,
      warnings: 0,
      backendError: null,
      validationIssues: [],
    });
    if (!shopId) {
      setValidationData((prev) => ({
        ...prev,
        backendError: 'Shop is not ready. Complete setup or reload the analytics workspace.',
      }));
      return;
    }
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('shopId', shopId);
      setUploadProgress(10);
      const response = await authFetch(API_ROUTES.inventory.upload, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw Object.assign(new Error(data?.error || 'Upload failed'), { payload: data });
      }
      setUploadProgress(100);
      setValidationData({
        total: data.total || data.inserted || 0,
        successful: data.successful || data.inserted || 0,
        errors: data.errors || 0,
        warnings: data.warnings || 0,
        backendError: null,
        validationIssues: data.validationIssues || [],
      });
    } catch (error) {
      setUploadProgress(100);
      let backendError: string | null = 'Upload failed';
      let validationIssues: ValidationSummary['validationIssues'] = [];

      const payload = (error as { payload?: Partial<ValidationSummary> & { error?: string } })?.payload;
      if (payload) {
        if (typeof payload.error === 'string') {
          backendError = payload.error;
        }
        if (Array.isArray(payload.validationIssues)) {
          validationIssues = payload.validationIssues as ValidationSummary['validationIssues'];
        }
      } else if (error instanceof Error && error.message) {
        backendError = error.message;
      }

      setValidationData({
        total: 0,
        successful: 0,
        errors: 1,
        warnings: 0,
        backendError,
        validationIssues,
      });
    }
  };

  // Remove handleValidation, validation is now backend-driven

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    if (onImportComplete) {
      onImportComplete(validationData);
    } else {
      alert('Import completed!');
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <TemplateDownload onNext={nextStep} />;
      case 2:
        return <FileUpload uploadedFile={uploadedFile} uploadProgress={uploadProgress} onFileUpload={handleFileUpload} />;
      case 3:
        return <DataValidation data={validationData} />;
      case 4:
        return <ImportConfirmation data={validationData} onConfirm={handleComplete} />;
      default:
        return <TemplateDownload onNext={nextStep} />;
    }
  };

  return (
    <div
      className={`fixed bottom-0 right-0 top-[60px] z-40 flex items-center justify-center p-4 md:p-6 ${
        isSidebarCollapsed ? 'left-0 md:left-16' : 'left-0 md:left-60'
      }`}
    >
      {/* The backdrop that sits behind the modal */}
      <div className="absolute inset-0 bg-black/5 backdrop-blur-sm"></div>
      
      <div
        className="relative z-10 flex h-[min(85vh,820px)] max-h-full w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl"
        style={{ 
          borderRadius: 'var(--radius--16px)',
          border: '1px solid var(--gray--200)',
        }}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 border-b px-6 py-5"
          style={{ 
            borderColor: 'var(--gray--200)',
            borderTopLeftRadius: 'var(--radius--16px)',
            borderTopRightRadius: 'var(--radius--16px)',
          }}
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 
                className="text-2xl font-bold mb-1"
                style={{ color: 'var(--gray--900)' }}
              >
                Import Inventory
              </h2>
              <p 
                className="text-sm"
                style={{ color: 'var(--gray--600)' }}
              >
                Import your inventory data in just a few simple steps
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-full transition-all duration-200 hover:bg-gray-100"
                style={{ borderRadius: 'var(--radius--40px)' }}
              >
                <X 
                  className="w-5 h-5" 
                  style={{ color: 'var(--gray--600)' }}
                />
              </button>
            )}
          </div>
          <WizardStepIndicator steps={steps} currentStep={currentStep} />
        </div>

        {/* Content */}
        <div className="flex min-h-0 flex-1 items-center overflow-y-auto px-6 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="w-full"
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div
          className="flex flex-shrink-0 items-center justify-between gap-4 border-t bg-gray-50/80 px-6 py-4"
          style={{ 
            borderColor: 'var(--gray--200)',
            borderBottomLeftRadius: 'var(--radius--16px)',
            borderBottomRightRadius: 'var(--radius--16px)',
          }}
        >
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className="button-outline flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeftIcon size={16} />
            Previous
          </button>
          
          <div 
            className="text-sm font-medium"
            style={{ color: 'var(--gray--500)' }}
          >
            Step {currentStep} of {steps.length}
            {validationData.backendError && (
              <span className="text-red-500 ml-4">Error: {validationData.backendError}</span>
            )}
          </div>
          
          {currentStep < 4 ? (
            <button
              onClick={nextStep}
              disabled={
                (currentStep === 2 && !uploadedFile) ||
                (currentStep === 3 && validationData.errors > 0)
              }
              className="flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                borderRadius: 'var(--radius--40px)',
                backgroundColor:
                  (currentStep === 2 && !uploadedFile) ||
                  (currentStep === 3 && validationData.errors > 0)
                    ? 'var(--gray--300)'
                    : '#c5f542',
                color: '#000000',
                border: 'none',
                padding: '9px 23px',
                fontWeight: 500,
                fontSize: '14px',
                transition: 'all 0.3s',
              }}
            >
              Next
              <ArrowRightIcon size={16} />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="flex items-center gap-2"
              style={{ 
                borderRadius: 'var(--radius--40px)',
                backgroundColor: '#c5f542',
                color: '#000000',
                border: 'none',
                padding: '9px 23px',
                fontWeight: 500,
                fontSize: '14px',
                transition: 'all 0.3s',
              }}
            >
              Complete Import
              <CheckIcon size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
