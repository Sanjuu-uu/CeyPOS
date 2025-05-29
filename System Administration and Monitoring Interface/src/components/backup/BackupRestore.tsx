import React, { useState } from 'react';
import { SaveIcon, UploadIcon, DownloadIcon, TrashIcon, CheckCircleIcon } from 'lucide-react';
import { toast } from 'sonner';
const BackupRestore: React.FC = () => {
  const [backupProgress, setBackupProgress] = useState<number | null>(null);
  const [restoreProgress, setRestoreProgress] = useState<number | null>(null);
  const backupHistory = [{
    id: 1,
    name: 'Full Backup',
    date: '2023-06-15 08:00:12',
    size: '1.2 GB',
    status: 'Completed'
  }, {
    id: 2,
    name: 'Incremental Backup',
    date: '2023-06-14 08:00:05',
    size: '245 MB',
    status: 'Completed'
  }, {
    id: 3,
    name: 'Incremental Backup',
    date: '2023-06-13 08:00:09',
    size: '312 MB',
    status: 'Completed'
  }, {
    id: 4,
    name: 'Full Backup',
    date: '2023-06-12 08:00:01',
    size: '1.1 GB',
    status: 'Completed'
  }];
  const startBackup = () => {
    setBackupProgress(0);
    const interval = setInterval(() => {
      setBackupProgress(prev => {
        if (prev === null) return 0;
        if (prev >= 100) {
          clearInterval(interval);
          toast.success('Backup completed successfully');
          return null;
        }
        return prev + 10;
      });
    }, 500);
  };
  const startRestore = () => {
    setRestoreProgress(0);
    const interval = setInterval(() => {
      setRestoreProgress(prev => {
        if (prev === null) return 0;
        if (prev >= 100) {
          clearInterval(interval);
          toast.success('Restore completed successfully');
          return null;
        }
        return prev + 5;
      });
    }, 500);
  };
  const downloadBackup = (id: number) => {
    toast.success(`Downloading backup #${id}`);
  };
  const deleteBackup = (id: number) => {
    toast.success(`Backup #${id} deleted`);
  };
  return <div className="h-full">
      <div className="bg-white dark:bg-gray-800 p-4 mb-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-2">Backup & Restore</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Manage database backups and restore operations.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center mb-4">
            <SaveIcon className="mr-2 text-blue-500" size={20} />
            <h3 className="font-medium">Create Backup</h3>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Backup Type
                </label>
                <select className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                  <option>Full Backup</option>
                  <option>Incremental Backup</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Compression
                </label>
                <select className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                  <option>Standard (Recommended)</option>
                  <option>High</option>
                  <option>None</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <input type="text" className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" placeholder="Optional backup description" />
            </div>
            {backupProgress !== null && <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span>{backupProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{
                width: `${backupProgress}%`
              }}></div>
                </div>
                <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">
                  {backupProgress < 100 ? 'Backing up database...' : 'Backup complete!'}
                </p>
              </div>}
            <button onClick={startBackup} disabled={backupProgress !== null} className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:opacity-50">
              Start Backup
            </button>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center mb-4">
            <UploadIcon className="mr-2 text-blue-500" size={20} />
            <h3 className="font-medium">Restore Database</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Restore Point
              </label>
              <select className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                <option>Full Backup - 2023-06-15 08:00:12</option>
                <option>Incremental Backup - 2023-06-14 08:00:05</option>
                <option>Incremental Backup - 2023-06-13 08:00:09</option>
                <option>Full Backup - 2023-06-12 08:00:01</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Restore Options
                </label>
                <select className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                  <option>Complete Restore</option>
                  <option>Data Only</option>
                  <option>Schema Only</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Target Environment
                </label>
                <select className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                  <option>Production</option>
                  <option>Testing</option>
                  <option>Development</option>
                </select>
              </div>
            </div>
            <div className="flex items-center">
              <input type="checkbox" id="confirm" className="mr-2" />
              <label htmlFor="confirm" className="text-sm">
                I understand this will overwrite the current database
              </label>
            </div>
            {restoreProgress !== null && <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span>{restoreProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{
                width: `${restoreProgress}%`
              }}></div>
                </div>
                <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">
                  {restoreProgress < 100 ? 'Restoring database...' : 'Restore complete!'}
                </p>
              </div>}
            <button onClick={startRestore} disabled={restoreProgress !== null} className="w-full mt-2 bg-amber-600 hover:bg-amber-700 text-white py-2 px-4 rounded-md disabled:opacity-50">
              Start Restore
            </button>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="font-medium mb-4">Backup History</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {backupHistory.map(backup => <tr key={backup.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center">
                      <CheckCircleIcon size={16} className="mr-2 text-green-500" />
                      {backup.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {backup.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {backup.size}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 rounded-full">
                      {backup.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      <button onClick={() => downloadBackup(backup.id)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                        <DownloadIcon size={18} />
                      </button>
                      <button onClick={() => deleteBackup(backup.id)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                        <TrashIcon size={18} />
                      </button>
                    </div>
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>;
};
export default BackupRestore;