import React from 'react';
import { CheckCircleIcon, AlertTriangleIcon, XCircleIcon, FileTextIcon } from 'lucide-react';

export interface ValidationItem {
  row: number;
  field: string;
  value: string;
  issue: string;
  type: 'error' | 'warning';
}

export interface ValidationSummary {
  total: number;
  successful: number;
  errors: number;
  warnings: number;
  backendError?: string | null;
  validationIssues?: ValidationItem[];
}

interface DataValidationProps {
  data: ValidationSummary;
  onValidationComplete?: () => void;
}

export const DataValidation: React.FC<DataValidationProps> = ({ data, onValidationComplete }) => {
  const validationItems: ValidationItem[] = data.validationIssues || [];
  const getSuccessRate = () => {
    if (data.total === 0) return 0;
    return Math.round((data.successful / data.total) * 100);
  };

// (Removed duplicate/old code before the function component)

// (Removed duplicate variable declarations)

  return (
    <div className="h-full">
      <div className="max-w-4xl mx-auto">
        <h3 
          className="text-xl font-bold text-center mb-8"
          style={{ color: 'var(--gray--900)' }}
        >
          Data Validation
        </h3>
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--gray--50)', borderRadius: 'var(--radius--12px)' }}>
            <FileTextIcon size={24} className="mx-auto mb-2" style={{ color: 'var(--gray--600)' }} />
            <p className="text-2xl font-bold" style={{ color: 'var(--gray--900)' }}>{data.total}</p>
            <p className="text-sm" style={{ color: 'var(--gray--600)' }}>Total Records</p>
          </div>
          <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--verde-naturale--primary)/10', borderRadius: 'var(--radius--12px)' }}>
            <CheckCircleIcon size={24} className="mx-auto mb-2" style={{ color: 'var(--verde-naturale--primary)' }} />
            <p className="text-2xl font-bold" style={{ color: 'var(--gray--900)' }}>{data.successful}</p>
            <p className="text-sm" style={{ color: 'var(--gray--600)' }}>Valid Records</p>
          </div>
          <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--red--50)', borderRadius: 'var(--radius--12px)' }}>
            <XCircleIcon size={24} className="mx-auto mb-2" style={{ color: 'var(--red--500)' }} />
            <p className="text-2xl font-bold" style={{ color: 'var(--gray--900)' }}>{data.errors}</p>
            <p className="text-sm" style={{ color: 'var(--gray--600)' }}>Errors</p>
          </div>
          <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--yellow--50)', borderRadius: 'var(--radius--12px)' }}>
            <AlertTriangleIcon size={24} className="mx-auto mb-2" style={{ color: 'var(--yellow--500)' }} />
            <p className="text-2xl font-bold" style={{ color: 'var(--gray--900)' }}>{data.warnings}</p>
            <p className="text-sm" style={{ color: 'var(--gray--600)' }}>Warnings</p>
          </div>
        </div>
        {/* Success Rate */}
        <div className="p-6 rounded-lg mb-6" style={{ backgroundColor: 'var(--gray--50)', borderRadius: 'var(--radius--12px)' }}>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-semibold" style={{ color: 'var(--gray--900)' }}>Validation Success Rate</h4>
            <span className="text-2xl font-bold" style={{ color: 'var(--verde-naturale--primary)' }}>{getSuccessRate()}%</span>
          </div>
          <div className="w-full h-3 rounded-full" style={{ backgroundColor: 'var(--gray--200)' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${getSuccessRate()}%`, backgroundColor: 'var(--verde-naturale--primary)' }} />
          </div>
        </div>
        {/* Issues List */}
        {validationItems.length > 0 && (
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--gray--200)', borderRadius: 'var(--radius--12px)' }}>
            <div className="p-4 border-b" style={{ backgroundColor: 'var(--gray--50)', borderColor: 'var(--gray--200)' }}>
              <h4 className="font-semibold" style={{ color: 'var(--gray--900)' }}>Validation Issues</h4>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {validationItems.map((item, index) => (
                <div key={index} className="p-4 border-b last:border-b-0 flex items-center gap-4" style={{ borderColor: 'var(--gray--200)' }}>
                  {item.type === 'error' ? (
                    <XCircleIcon size={20} style={{ color: 'var(--red--500)' }} />
                  ) : (
                    <AlertTriangleIcon size={20} style={{ color: 'var(--yellow--500)' }} />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm" style={{ color: 'var(--gray--900)' }}>Row {item.row}: {item.issue}</p>
                    <p className="text-xs" style={{ color: 'var(--gray--600)' }}>Field: {item.field} • Value: "{item.value || 'Empty'}"</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${item.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Action Buttons */}
        <div className="mt-8 flex justify-center gap-4">
          {data.errors > 0 ? (
            <p className="text-center" style={{ color: 'var(--red--600)' }}>Please fix the errors in your file before proceeding.</p>
          ) : (
            <button onClick={onValidationComplete} className="button-primary px-8 py-3 font-medium transition-all duration-200" style={{ borderRadius: 'var(--radius--12px)', backgroundColor: 'var(--verde-naturale--primary)', color: 'var(--gray--900)', border: 'none' }}>Proceed with Import</button>
          )}
        </div>
      </div>
    </div>
  );
};
