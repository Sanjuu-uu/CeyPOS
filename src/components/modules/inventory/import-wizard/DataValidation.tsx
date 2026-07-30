import React from 'react';

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
}

export const DataValidation: React.FC<DataValidationProps> = ({ data }) => {
  const validationItems: ValidationItem[] = data.validationIssues || [];
  const getSuccessRate = () => {
    if (data.total === 0) return 0;
    return Math.round((data.successful / data.total) * 100);
  };

// (Removed duplicate/old code before the function component)

// (Removed duplicate variable declarations)

  return (
    <div className="w-full">
      <div className="mx-auto flex min-h-[420px] w-full max-w-3xl flex-col justify-center space-y-5">
        <h3
          className="text-center text-lg font-bold"
          style={{ color: 'var(--gray--900)' }}
        >
          Data Validation
        </h3>
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-gray-100 p-3 text-center" style={{ backgroundColor: 'var(--gray--50)' }}>
            <p className="text-2xl font-bold" style={{ color: 'var(--gray--900)' }}>{data.total}</p>
            <p className="text-xs" style={{ color: 'var(--gray--600)' }}>Total Records</p>
          </div>
          <div className="rounded-2xl border border-gray-100 p-3 text-center" style={{ backgroundColor: 'var(--gray--50)' }}>
            <p className="text-2xl font-bold" style={{ color: 'var(--gray--900)' }}>{data.successful}</p>
            <p className="text-xs" style={{ color: 'var(--gray--600)' }}>Valid Records</p>
          </div>
          <div className="rounded-2xl border border-gray-100 p-3 text-center" style={{ backgroundColor: 'var(--gray--50)' }}>
            <p className="text-2xl font-bold" style={{ color: 'var(--gray--900)' }}>{data.errors}</p>
            <p className="text-xs" style={{ color: 'var(--gray--600)' }}>Errors</p>
          </div>
          <div className="rounded-2xl border border-gray-100 p-3 text-center" style={{ backgroundColor: 'var(--gray--50)' }}>
            <p className="text-2xl font-bold" style={{ color: 'var(--gray--900)' }}>{data.warnings}</p>
            <p className="text-xs" style={{ color: 'var(--gray--600)' }}>Warnings</p>
          </div>
        </div>
        {/* Success Rate */}
        <div className="rounded-2xl border border-gray-100 p-4" style={{ backgroundColor: 'var(--gray--50)' }}>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-base font-semibold" style={{ color: 'var(--gray--900)' }}>Validation Success Rate</h4>
            <span className="text-xl font-bold text-gray-950">{getSuccessRate()}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full" style={{ backgroundColor: 'var(--gray--200)' }}>
            <div className="h-full rounded-full bg-black transition-all duration-500" style={{ width: `${getSuccessRate()}%` }} />
          </div>
        </div>
        {/* Issues List */}
        {validationItems.length > 0 && (
          <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid var(--gray--200)' }}>
            <div className="p-4 border-b" style={{ backgroundColor: 'var(--gray--50)', borderColor: 'var(--gray--200)' }}>
              <h4 className="font-semibold" style={{ color: 'var(--gray--900)' }}>Validation Issues</h4>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {validationItems.map((item, index) => (
                <div key={index} className="flex items-center gap-4 border-b p-4 last:border-b-0" style={{ borderColor: 'var(--gray--200)' }}>
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
        {data.errors > 0 && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium" style={{ color: 'var(--red--600)' }}>
            Please fix the errors in your file before proceeding.
          </p>
        )}
      </div>
    </div>
  );
};
