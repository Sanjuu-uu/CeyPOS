import React from 'react';
import { DownloadIcon, FileTextIcon } from 'lucide-react';

interface TemplateDownloadProps {
  onNext?: () => void;
}

export const TemplateDownload: React.FC<TemplateDownloadProps> = ({ onNext }) => {
  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/inventory/template');
      if (!res.ok) throw new Error('Failed to download template');
      const buf = await res.arrayBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'inventory_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Template download failed', err);
      alert('Failed to download template. Please try again or contact support.');
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center text-center">
      <div 
        className="p-8 rounded-2xl mb-8 max-w-2xl"
        style={{ 
          backgroundColor: 'var(--gray--50)',
          borderRadius: 'var(--radius--16px)',
        }}
      >        <div 
          className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
          style={{ 
            backgroundColor: '#c5f542',
            borderRadius: 'var(--radius--40px)',
          }}
        >
          <FileTextIcon 
            size={32} 
            style={{ color: '#000000' }}
          />
        </div>
        
        <h3 
          className="text-xl font-bold mb-4"
          style={{ color: 'var(--gray--900)' }}
        >
          Download Import Template
        </h3>
        
        <p 
          className="text-base mb-6 leading-relaxed"
          style={{ color: 'var(--gray--600)' }}
        >
          To ensure your data is properly formatted, please download our Excel (.xlsx) template. 
          This template includes all the required columns and sample data to guide you.
        </p>
        
        <div 
          className="text-sm p-4 rounded-lg mb-6"
          style={{ 
            backgroundColor: 'var(--gray--100)',
            borderRadius: 'var(--radius--12px)',
            color: 'var(--gray--700)',
          }}
        >
          <strong>Required columns:</strong> inventory_code, barcode_id, name, category, sku, price, cost_price, stock, stock_last_month, restock_suggestion, reorder_threshold, unit_name, pack_size, image_url
        </div>
          <button
          onClick={handleDownloadTemplate}
          className="button-primary px-8 py-4 font-medium transition-all duration-200 flex items-center gap-3 mx-auto"
          style={{ 
            borderRadius: 'var(--radius--12px)',
            backgroundColor: '#c5f542',
            color: '#000000',
            border: 'none',
          }}
        >
          <DownloadIcon size={20} />
          Download Template (.xlsx)
        </button>
      </div>
      
      <div 
        className="text-sm p-4 rounded-lg max-w-lg"
        style={{ 
          backgroundColor: 'var(--gray--50)',
          borderRadius: 'var(--radius--12px)',
          color: 'var(--gray--600)',
        }}
      >
        <strong>Tip:</strong> Make sure to fill in all required fields and keep the file as the provided Excel (.xlsx) format before uploading.
      </div>
      
      {onNext && (        <button
          onClick={onNext}
          className="mt-6 text-sm font-medium transition-colors duration-200"
          style={{ color: '#c5f542' }}
        >
          Skip to upload →
        </button>
      )}
    </div>
  );
};
