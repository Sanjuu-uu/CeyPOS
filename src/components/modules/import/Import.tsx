import React, { useState, useRef } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { 
  Upload, 
  FileText, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  X,
  Plus,
  Eye,
  Trash2,
  Database,
  Package,
  Users,
  BarChart3,
  Settings
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { db } from '../../../lib/db';

interface ImportTemplate {
  id: string;
  name: string;
  type: 'products' | 'customers' | 'sales' | 'inventory';
  description: string;
  icon: React.ReactNode;
  fields: string[];
  sampleData: any[];
}

interface ImportHistory {
  id: string;
  fileName: string;
  type: string;
  status: 'success' | 'failed' | 'processing';
  recordsImported: number;
  totalRecords: number;
  timestamp: string;
  errors?: string[];
}

export const Import: React.FC = () => {
  const { currentShop } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'import' | 'templates' | 'history'>('import');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<'products' | 'customers' | 'sales' | 'inventory'>('products');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  // Import templates
  const templates: ImportTemplate[] = [
    {
      id: '1',
      name: 'Products Import',
      type: 'products',
      description: 'Import product catalog with inventory levels',
      icon: <Package size={20} />,
      fields: ['name', 'category', 'price', 'stock', 'barcode', 'imageUrl'],
      sampleData: [
        { name: 'Coffee Beans', category: 'Beverages', price: 12.99, stock: 50, barcode: '123456789', imageUrl: '' },
        { name: 'Green Tea', category: 'Beverages', price: 8.99, stock: 30, barcode: '987654321', imageUrl: '' }
      ]
    },
    {
      id: '2',
      name: 'Customers Import',
      type: 'customers',
      description: 'Import customer database with contact information',
      icon: <Users size={20} />,
      fields: ['name', 'email', 'phone', 'address', 'dateJoined'],
      sampleData: [
        { name: 'John Doe', email: 'john@example.com', phone: '555-0123', address: '123 Main St', dateJoined: '2024-01-15' },
        { name: 'Jane Smith', email: 'jane@example.com', phone: '555-0456', address: '456 Oak Ave', dateJoined: '2024-02-20' }
      ]
    },
    {
      id: '3',
      name: 'Sales Data Import',
      type: 'sales',
      description: 'Import historical sales transactions',
      icon: <BarChart3 size={20} />,
      fields: ['date', 'customer', 'items', 'total', 'paymentMethod'],
      sampleData: [
        { date: '2024-03-15', customer: 'john@example.com', items: 'Coffee Beans x2', total: 25.98, paymentMethod: 'card' },
        { date: '2024-03-15', customer: 'jane@example.com', items: 'Green Tea x1', total: 8.99, paymentMethod: 'cash' }
      ]
    },
    {
      id: '4',
      name: 'Inventory Update',
      type: 'inventory',
      description: 'Bulk update inventory levels and pricing',
      icon: <Database size={20} />,
      fields: ['productId', 'stock', 'price', 'lastUpdated'],
      sampleData: [
        { productId: 'P001', stock: 45, price: 12.99, lastUpdated: '2024-03-15' },
        { productId: 'P002', stock: 28, price: 8.99, lastUpdated: '2024-03-15' }
      ]
    }
  ];

  // Import history
  const importHistory: ImportHistory[] = [
    {
      id: '1',
      fileName: 'products_march_2024.csv',
      type: 'Products',
      status: 'success',
      recordsImported: 150,
      totalRecords: 150,
      timestamp: '2024-03-15T10:30:00Z'
    },
    {
      id: '2',
      fileName: 'customers_backup.xlsx',
      type: 'Customers',
      status: 'failed',
      recordsImported: 0,
      totalRecords: 200,
      timestamp: '2024-03-14T15:45:00Z',
      errors: ['Invalid email format in row 15', 'Missing required field: phone']
    },
    {
      id: '3',
      fileName: 'inventory_update.csv',
      type: 'Inventory',
      status: 'success',
      recordsImported: 89,
      totalRecords: 95,
      timestamp: '2024-03-13T09:20:00Z'
    }
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !currentShop) return;

    setIsProcessing(true);
    
    // Simulate import process
    setTimeout(() => {
      // Mock successful import with some failed records
      const totalRecords = Math.floor(Math.random() * 100) + 50;
      const failedRecords = Math.floor(Math.random() * 5);
      const successRecords = totalRecords - failedRecords;
      
      setImportResults({
        success: successRecords,
        failed: failedRecords,
        errors: failedRecords > 0 ? [
          'Row 15: Invalid price format',
          'Row 23: Missing required field: category',
          'Row 45: Duplicate barcode detected'
        ].slice(0, failedRecords) : []
      });
      
      setIsProcessing(false);
      setSelectedFile(null);
    }, 3000);
  };

  const downloadTemplate = (template: ImportTemplate) => {
    // Create CSV content
    const headers = template.fields.join(',');
    const rows = template.sampleData.map(row => 
      template.fields.map(field => row[field] || '').join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.toLowerCase().replace(/\s+/g, '_')}_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle size={16} className="text-green-600" />;
      case 'failed': return <AlertCircle size={16} className="text-red-600" />;
      case 'processing': return <Settings size={16} className="text-yellow-600 animate-spin" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="heading-h2">Data Import Wizard</h1>
        <Button
          variant="outline"
          icon={<Download size={16} />}
          onClick={() => downloadTemplate(templates.find(t => t.type === importType) || templates[0])}
        >
          Download Template
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'import', label: 'Import Data', icon: <Upload size={16} /> },
            { id: 'templates', label: 'Templates', icon: <FileText size={16} /> },
            { id: 'history', label: 'Import History', icon: <Database size={16} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-verde-primary text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Import Tab */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* Import Type Selection */}
          <Card title="Select Import Type" className="border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {templates.map(template => (
                <button
                  key={template.id}
                  onClick={() => setImportType(template.type)}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    importType === template.type
                      ? 'border-verde-primary bg-verde-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      importType === template.type ? 'bg-verde-primary text-gray-900' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {template.icon}
                    </div>
                    <h3 className="font-medium text-gray-900">{template.name}</h3>
                  </div>
                  <p className="text-sm text-gray-500">{template.description}</p>
                </button>
              ))}
            </div>
          </Card>

          {/* File Upload */}
          <Card title="Upload File" className="border border-gray-100">
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-verde-primary bg-verde-primary/5' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {selectedFile ? selectedFile.name : 'Drop your file here or click to browse'}
                </h3>
                <p className="text-gray-500 mb-4">
                  Supports CSV, Excel (XLSX), and TSV files up to 10MB
                </p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.tsv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {selectedFile && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}

              {selectedFile && !isProcessing && !importResults && (
                <div className="flex space-x-3">
                  <Button
                    variant="primary"
                    icon={<Upload size={16} />}
                    onClick={handleImport}
                    fullWidth
                  >
                    Start Import
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Processing Status */}
          {isProcessing && (
            <Card className="border border-gray-100">
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Processing Import...</h3>
                <p className="text-gray-500">Please wait while we process your file</p>
              </div>
            </Card>
          )}

          {/* Import Results */}
          {importResults && (
            <Card title="Import Results" className="border border-gray-100">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-900">Successfully Imported</span>
                    </div>
                    <p className="text-2xl font-bold text-green-900 mt-1">{importResults.success}</p>
                  </div>
                  
                  {importResults.failed > 0 && (
                    <div className="p-4 bg-red-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <span className="font-medium text-red-900">Failed Records</span>
                      </div>
                      <p className="text-2xl font-bold text-red-900 mt-1">{importResults.failed}</p>
                    </div>
                  )}
                </div>

                {importResults.errors.length > 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-medium text-yellow-900 mb-2">Errors Found:</h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      {importResults.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex space-x-3">
                  <Button
                    variant="primary"
                    onClick={() => setImportResults(null)}
                  >
                    Import Another File
                  </Button>
                  {importResults.failed > 0 && (
                    <Button
                      variant="outline"
                      icon={<Download size={16} />}
                    >
                      Download Error Report
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {templates.map(template => (
            <Card key={template.id} className="border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    {template.icon}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-500">{template.description}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Download size={14} />}
                  onClick={() => downloadTemplate(template)}
                >
                  Download
                </Button>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Required Fields:</h4>
                <div className="flex flex-wrap gap-2">
                  {template.fields.map(field => (
                    <span
                      key={field}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                    >
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <Card title="Import History" className="border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Records
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {importHistory.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">{item.fileName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{item.type}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(item.status)}
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {item.recordsImported} / {item.totalRecords}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500">{formatDate(item.timestamp)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button className="text-gray-400 hover:text-gray-600">
                          <Eye size={16} />
                        </button>
                        <button className="text-gray-400 hover:text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};