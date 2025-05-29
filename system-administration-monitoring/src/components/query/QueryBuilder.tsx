import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { PlayIcon, SaveIcon, ClipboardCopyIcon, DownloadIcon } from 'lucide-react';
import { toast } from 'sonner';
const QueryBuilder: React.FC = () => {
  const [query, setQuery] = useState<string>('SELECT * FROM products\nWHERE category_id = 1\nORDER BY price DESC;');
  const [results, setResults] = useState<any[]>([{
    id: 1,
    name: 'Premium Coffee Machine',
    price: '599.99',
    category_id: 1
  }, {
    id: 5,
    name: 'Espresso Maker',
    price: '299.99',
    category_id: 1
  }, {
    id: 12,
    name: 'French Press',
    price: '49.99',
    category_id: 1
  }]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setQuery(value);
    }
  };
  const executeQuery = () => {
    setIsExecuting(true);
    // Simulate query execution
    setTimeout(() => {
      setIsExecuting(false);
      setExecutionTime(Math.random() * 200 + 50);
      toast.success('Query executed successfully');
    }, 800);
  };
  const saveQuery = () => {
    toast.success('Query saved to favorites');
  };
  const copyQuery = () => {
    navigator.clipboard.writeText(query);
    toast.success('Query copied to clipboard');
  };
  const downloadResults = () => {
    toast.success('Results downloaded as CSV');
  };
  return <div className="h-full flex flex-col">
      <div className="bg-white dark:bg-gray-800 p-4 mb-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-2">SQL Query Builder</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Write and execute SQL queries with syntax highlighting and
          autocomplete.
        </p>
      </div>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Query Editor</h3>
            <div className="flex space-x-2">
              <button onClick={executeQuery} disabled={isExecuting} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm">
                <PlayIcon size={16} className="mr-1" />
                {isExecuting ? 'Executing...' : 'Execute'}
              </button>
              <button onClick={saveQuery} className="flex items-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-3 py-1 rounded text-sm">
                <SaveIcon size={16} className="mr-1" />
                Save
              </button>
              <button onClick={copyQuery} className="flex items-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-3 py-1 rounded text-sm">
                <ClipboardCopyIcon size={16} className="mr-1" />
                Copy
              </button>
            </div>
          </div>
          <div className="flex-1 border rounded-lg overflow-hidden">
            <Editor height="100%" defaultLanguage="sql" value={query} onChange={handleEditorChange} theme="vs-dark" options={{
            minimap: {
              enabled: false
            },
            fontSize: 14,
            wordWrap: 'on',
            automaticLayout: true
          }} />
          </div>
        </div>
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Results</h3>
            <div className="flex items-center space-x-4">
              {executionTime && <span className="text-sm text-gray-600 dark:text-gray-400">
                  Execution time: {executionTime.toFixed(2)}ms
                </span>}
              <button onClick={downloadResults} disabled={!results.length} className="flex items-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-3 py-1 rounded text-sm">
                <DownloadIcon size={16} className="mr-1" />
                Export
              </button>
            </div>
          </div>
          <div className="flex-1 border rounded-lg overflow-auto bg-white dark:bg-gray-800">
            {results.length > 0 ? <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    {Object.keys(results[0]).map(key => <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {key}
                      </th>)}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {results.map((row, i) => <tr key={i}>
                      {Object.values(row).map((value, j) => <td key={j} className="px-6 py-4 whitespace-nowrap text-sm">
                          {value as React.ReactNode}
                        </td>)}
                    </tr>)}
                </tbody>
              </table> : <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                No results to display
              </div>}
          </div>
        </div>
      </div>
    </div>;
};
export default QueryBuilder;