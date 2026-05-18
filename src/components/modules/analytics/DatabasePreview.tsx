import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../../context/AppContext';
import { db } from '../../../lib/db';
import { Card } from './Card';
import { ChevronDown, ChevronRight, Database, RefreshCw } from 'lucide-react';

type TableCell = string | number;

interface TableData {
  name: string;
  columns: string[];
  rows: TableCell[][];
  expanded: boolean;
}

export const DatabasePreview: React.FC = () => {
  const { currentShop } = useApp();
  const [tables, setTables] = useState<TableData[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadDatabaseData = useCallback(() => {
    if (!currentShop) {
      return;
    }

    const tablesData: TableData[] = [];

    // Products/Inventory table
    const products = db.products.getByShopId(currentShop.id);
    if (products.length > 0) {
      const productColumns = ['ID', 'Name', 'Category', 'Price', 'Stock', 'Barcode'];
      const productRows = products.map(p => [
        p.id,
        p.name || '',
        p.category || '',
        `$${p.price?.toFixed(2) || '0.00'}`,
        p.stock || 0,
        p.barcode || ''
      ]);
      tablesData.push({
        name: 'Inventory',
        columns: productColumns,
        rows: productRows,
        expanded: true
      });
    }

    // Sales/Transactions table
    const sales = db.sales.getByShopId(currentShop.id);
    if (sales.length > 0) {
      const salesColumns = ['ID', 'Customer ID', 'Total', 'Items Count', 'Timestamp'];
      const salesRows = sales.map(s => [
        s.id,
        s.customerInfo?.name || s.customerInfo?.email || 'N/A',
        `$${s.total?.toFixed(2) || '0.00'}`,
        s.items?.length || 0,
        new Date(s.timestamp).toLocaleString()
      ]);
      tablesData.push({
        name: 'Sales',
        columns: salesColumns,
        rows: salesRows,
        expanded: false
      });
    }

    // Customers table
    const customers = db.customers.getByShopId(currentShop.id);
    if (customers.length > 0) {
      const customerColumns = ['ID', 'Name', 'Email', 'Phone', 'Total Spend', 'Last Purchase'];
      const customerRows = customers.map(c => [
        c.id,
        c.name || '',
        c.email || '',
        c.phone || '',
        `$${c.totalSpend?.toFixed(2) || '0.00'}`,
        c.lastPurchaseAt ? new Date(c.lastPurchaseAt).toLocaleString() : 'N/A'
      ]);
      tablesData.push({
        name: 'Customers',
        columns: customerColumns,
        rows: customerRows,
        expanded: false
      });
    }

    // Daily Sales table
    const dailySales = db.daily_sales.getByShopId(currentShop.id);
    if (dailySales.length > 0) {
      const dailyColumns = ['Date', 'Gross Total', 'Transactions'];
      const dailyRows = dailySales.map(d => [
        d.date,
        `$${d.grossTotal?.toFixed(2) || '0.00'}`,
        d.transactions || 0
      ]);
      tablesData.push({
        name: 'Daily Sales',
        columns: dailyColumns,
        rows: dailyRows,
        expanded: false
      });
    }
    setTables(tablesData);
    setLastUpdated(new Date());
  }, [currentShop]);

  useEffect(() => {
    loadDatabaseData();

    // Set up real-time listeners
    const unsubscribers = [
      db.on('inventoryUpdated', loadDatabaseData),
      db.on('saleCreated', loadDatabaseData),
      db.on('salesUpdated', loadDatabaseData),
      db.on('customersUpdated', loadDatabaseData),
      db.on('dailySalesUpdated', loadDatabaseData)
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [loadDatabaseData]);

  const toggleTableExpansion = (tableName: string) => {
    setTables(prev => prev.map(table => 
      table.name === tableName 
        ? { ...table, expanded: !table.expanded }
        : table
    ));
  };

  const handleRefresh = () => {
    loadDatabaseData();
  };

  return (
    <Card 
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            <span>Database Preview</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
            <button
              onClick={handleRefresh}
              className="p-1 hover:bg-gray-100 rounded"
              title="Refresh data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      }
      subtitle="Shop Data"
      className="mb-6"
    >
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {tables.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No data available</p>
            <p className="text-sm">Data will appear here as you use the system</p>
          </div>
        ) : (
          tables.map((table) => (
            <div key={table.name} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleTableExpansion(table.name)}
                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  {table.expanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <span className="font-medium">{table.name}</span>
                  <span className="text-sm text-gray-500">
                    ({table.rows.length} records)
                  </span>
                </div>
              </button>
              
              {table.expanded && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-t border-gray-200">
                      <tr>
                        {table.columns.map((column, index) => (
                          <th
                            key={index}
                            className="px-3 py-2 text-left font-medium text-gray-700 border-r border-gray-200 last:border-r-0"
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.slice(0, 10).map((row, rowIndex) => (
                        <tr
                          key={rowIndex}
                          className="border-t border-gray-200 hover:bg-gray-50"
                        >
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="px-3 py-2 border-r border-gray-200 last:border-r-0"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {table.rows.length > 10 && (
                    <div className="px-4 py-2 bg-gray-50 text-center text-sm text-gray-500 border-t border-gray-200">
                      Showing 10 of {table.rows.length} records
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
};