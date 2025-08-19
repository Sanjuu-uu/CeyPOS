import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { WizardStepIndicator } from './WizardStepIndicator';
import { TemplateDownload } from './TemplateDownload';
import { FileUpload } from './FileUpload';
import { DataValidation } from './DataValidation';
import { ImportConfirmation } from './ImportConfirmation';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, X } from 'lucide-react';

interface ImportWizardProps {
  onClose?: () => void;
  onImportComplete?: (data: any) => void;
}

export const ImportWizard: React.FC<ImportWizardProps> = ({ onClose, onImportComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationData, setValidationData] = useState({
    total: 0,
    successful: 0,
    errors: 0,
    warnings: 0,
    backendError: null,
    validationIssues: [],
  });
  // Get shopId from ShopWizardContext/localStorage
  const shopId = localStorage.getItem('ceypos-shop-id') || '';

  const steps = [
    'Download Template',
    'Upload File',
    'Validate Data',
    'Confirm Import'
  ];

  const handleFileUpload = async (file: File) => {
  setUploadedFile(file);
  setUploadProgress(0);
  setValidationData({ total: 0, successful: 0, errors: 0, warnings: 0, backendError: null, validationIssues: [] });
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('shopId', shopId);
      setUploadProgress(10);
      const response = await axios.post('/api/inventory/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          }
        },
      });
      setUploadProgress(100);
      setValidationData({
        total: response.data.total || response.data.inserted || 0,
        successful: response.data.successful || response.data.inserted || 0,
        errors: response.data.errors || 0,
        warnings: response.data.warnings || 0,
        backendError: null,
        validationIssues: response.data.validationIssues || [],
      });
    } catch (err: any) {
      setUploadProgress(100);
      setValidationData({
        total: 0,
        successful: 0,
        errors: 1,
        warnings: 0,
        backendError: err?.response?.data?.error || 'Upload failed',
        validationIssues: err?.response?.data?.validationIssues || [],
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
        return <DataValidation data={validationData} onValidationComplete={nextStep} />;
      case 4:
        return <ImportConfirmation data={validationData} onConfirm={handleComplete} />;
      default:
        return <TemplateDownload onNext={nextStep} />;
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-40">
      {/* The backdrop that sits behind the modal */}
      <div className="absolute inset-0 top-[40px] bg-black/5 backdrop-blur-sm"></div>
      
      <div 
        className="bg-white shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col relative z-10 mt-[40px]"
        style={{ 
          borderRadius: 'var(--radius--16px)',
          border: '1px solid var(--gray--200)',
        }}
      >
        {/* Header */}
        <div 
          className="p-6 border-b flex-shrink-0"
          style={{ 
            borderColor: 'var(--gray--200)',
            borderTopLeftRadius: 'var(--radius--16px)',
            borderTopRightRadius: 'var(--radius--16px)',
          }}
        >
          <div className="flex justify-between items-center mb-6">
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
        <div className="flex-1 p-6 overflow-y-auto min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="h-full"
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div 
          className="p-6 border-t flex justify-between items-center flex-shrink-0"
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
              disabled={currentStep === 2 && !uploadedFile}
              className="flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                borderRadius: 'var(--radius--40px)',
                backgroundColor: currentStep === 2 && !uploadedFile ? 'var(--gray--300)' : '#c5f542',
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