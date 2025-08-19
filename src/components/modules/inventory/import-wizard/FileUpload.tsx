import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadIcon, FileIcon, CheckCircleIcon, XCircleIcon } from 'lucide-react';

interface FileUploadProps {
  uploadedFile?: File | null;
  uploadProgress?: number;
  onFileUpload: (file: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  uploadedFile, 
  uploadProgress = 0, 
  onFileUpload 
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setUploadError(null);
    if (rejectedFiles.length > 0) {
      setUploadError('Please upload an Excel (.xlsx) file only');
      return;
    }
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('File size must be less than 10MB');
        return;
      }
      // Accept only .xlsx/.xls
      if (!file.name.match(/\.xlsx?$/i)) {
        setUploadError('Only Excel files (.xlsx, .xls) are allowed');
        return;
      }
      onFileUpload(file);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
  });

  const isUploading = uploadProgress > 0 && uploadProgress < 100;
  const isCompleted = uploadProgress === 100;
  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="w-full max-w-md">
        <h3 
          className="text-lg font-bold text-center mb-4"
          style={{ color: 'var(--gray--900)' }}
        >
          Upload Your Excel File (.xlsx)
        </h3>
        
        {!uploadedFile ? (
          <div 
            {...getRootProps()}
            className={`
              border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200
              ${isDragActive || dragActive 
                ? 'border-green-400 bg-green-50' 
                : 'border-gray-300 hover:border-gray-400'
              }
            `}
            style={{ 
              borderRadius: 'var(--radius--12px)',
              backgroundColor: isDragActive ? '#c5f542/10' : 'transparent',
            }}
          >
            <input {...getInputProps()} />
            <div 
              className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
              style={{ 
                backgroundColor: 'var(--gray--100)',
                borderRadius: 'var(--radius--40px)',
              }}
            >
              <UploadIcon 
                size={20} 
                style={{ color: 'var(--gray--600)' }}
              />
            </div>
            <p 
              className="text-base font-medium mb-2"
              style={{ color: 'var(--gray--900)' }}
            >
              {isDragActive ? 'Drop your file here' : 'Drag & drop your Excel (.xlsx) file here'}
            </p>
            <p 
              className="text-sm mb-3"
              style={{ color: 'var(--gray--600)' }}
            >
              or click to browse files
            </p>
            <button
              type="button"
              className="button-outline"
            >
              Choose File
            </button>
            <div 
              className="mt-4 text-xs text-center"
              style={{ color: 'var(--gray--500)' }}
            >
              Supported format: Excel (.xlsx, .xls) • Maximum file size: 10MB
            </div>
          </div>
        ) : (
          <div 
            className="p-4 border rounded-lg"
            style={{ 
              borderColor: 'var(--gray--200)',
              borderRadius: 'var(--radius--12px)',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ 
                  backgroundColor: 'var(--gray--100)',
                  borderRadius: 'var(--radius--8px)',
                }}
              >
                <FileIcon 
                  size={18} 
                  style={{ color: 'var(--gray--600)' }}
                />
              </div>
              <div>
                <p className="text-sm font-medium">{uploadedFile.name}</p>
                <p className="text-xs" style={{ color: 'var(--gray--600)' }}>
                  {(uploadedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              {isCompleted ? (
                <CheckCircleIcon 
                  size={20} 
                  style={{ color: '#c5f542' }}
                />
              ) : isUploading ? (
                <div 
                  className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: '#c5f542' }}
                />
              ) : null}
            </div>
            {isUploading && (
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: 'var(--gray--600)' }}>Uploading...</span>
                  <span style={{ color: 'var(--gray--600)' }}>{uploadProgress}%</span>
                </div>
                <div 
                  className="w-full h-1.5 rounded-full"
                  style={{ backgroundColor: 'var(--gray--200)' }}
                >
                  <div 
                    className="h-full rounded-full transition-all duration-300"
                    style={{ 
                      width: `${uploadProgress}%`,
                      backgroundColor: '#c5f542',
                    }}
                  />
                </div>
              </div>
            )}
            {isCompleted && (
              <div 
                className="text-xs p-2 rounded-lg"
                style={{ 
                  backgroundColor: 'var(--verde-naturale--primary)/10',
                  color: 'var(--gray--700)',
                  borderRadius: 'var(--radius--6px)',
                }}
              >
                File uploaded successfully! Click Next to proceed with validation.
              </div>
            )}
            <div 
              className="mt-4 text-xs text-center"
              style={{ color: 'var(--gray--500)' }}
            >
              Supported format: Excel (.xlsx, .xls) • Maximum file size: 10MB
            </div>
          </div>
        )}
        {uploadError && (
          <div 
            className="mt-3 p-3 rounded-lg flex items-center gap-2"
            style={{ 
              backgroundColor: 'var(--red--50)',
              borderRadius: 'var(--radius--8px)',
            }}
          >
            <XCircleIcon 
              size={16} 
              style={{ color: 'var(--red--500)' }}
            />
            <p 
              className="text-xs font-medium"
              style={{ color: 'var(--red--700)' }}
            >
              {uploadError}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
