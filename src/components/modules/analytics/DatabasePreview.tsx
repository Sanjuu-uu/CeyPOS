import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { db } from '../../../lib/db';
import { Card } from './Card';

type TableCell = string | number;

interface TableData {
  id: string;
  name: string;
  columns: string[];
  rows: TableCell[][];
}

export const DatabasePreview: React.FC = () => {
  const { currentShop } = useApp();
  const [tables, setTables] = useState<TableData[]>([]);
  const [activeTableId, setActiveTableId] = useState('inventory');

  const loadDatabaseData = useCallback(() => {
    if (!currentShop) {
      setTables([]);
      return;
    }

    const products = db.products.getByShopId(currentShop.id);
    const sales = db.sales.getByShopId(currentShop.id);
    const customers = db.customers.getByShopId(currentShop.id);
    const dailySales = db.daily_sales.getByShopId(currentShop.id);

    setTables([
      {
        id: 'inventory',
        name: 'Product Inventory',
        columns: ['Product ID', 'Product Name', 'Category', 'Unit Price', 'Stock Level', 'Barcode'],
        rows: products.map((product) => [
          product.id,
          product.name || 'Unnamed product',
          product.category || 'Uncategorized',
          `$${product.price?.toFixed(2) || '0.00'}`,
          product.stock || 0,
          product.barcode || 'Not assigned',
        ]),
      },
      {
        id: 'sales',
        name: 'Sales Transactions',
        columns: ['Transaction ID', 'Customer', 'Total', 'Items', 'Date and Time'],
        rows: sales.map((sale) => [
          sale.id,
          sale.customerInfo?.name || sale.customerInfo?.email || 'Walk-in customer',
          `$${sale.total?.toFixed(2) || '0.00'}`,
          sale.items?.length || 0,
          new Date(sale.timestamp).toLocaleString(),
        ]),
      },
      {
        id: 'customers',
        name: 'Customer Directory',
        columns: ['Customer ID', 'Customer Name', 'Email Address', 'Phone Number', 'Total Spend', 'Last Purchase'],
        rows: customers.map((customer) => [
          customer.id,
          customer.name || 'Unnamed customer',
          customer.email || 'Not provided',
          customer.phone || 'Not provided',
          `$${customer.totalSpend?.toFixed(2) || '0.00'}`,
          customer.lastPurchaseAt ? new Date(customer.lastPurchaseAt).toLocaleString() : 'No purchases',
        ]),
      },
      {
        id: 'daily-sales',
        name: 'Daily Sales Summary',
        columns: ['Business Date', 'Gross Revenue', 'Transactions'],
        rows: dailySales.map((day) => [
          day.date,
          `$${day.grossTotal?.toFixed(2) || '0.00'}`,
          day.transactions || 0,
        ]),
      },
    ]);
  }, [currentShop]);

  useEffect(() => {
    loadDatabaseData();
    const unsubscribers = [
      db.on('inventoryUpdated', loadDatabaseData),
      db.on('saleCreated', loadDatabaseData),
      db.on('salesUpdated', loadDatabaseData),
      db.on('customersUpdated', loadDatabaseData),
      db.on('dailySalesUpdated', loadDatabaseData),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [loadDatabaseData]);

  const activeTable = tables.find((table) => table.id === activeTableId) ?? tables[0];

  return (
    <Card title="Shop Data" className="mb-6">
      <div className="module-tabs mb-4">
        {tables.map((table) => (
          <button
            type="button"
            key={table.id}
            onClick={() => setActiveTableId(table.id)}
            className={`module-tab ${
              activeTable?.id === table.id
                ? 'module-tab-active'
                : ''
            }`}
          >
            {table.name}
            <span className="ml-1.5 text-[10px] text-[#92928c]">{table.rows.length}</span>
          </button>
        ))}
      </div>

      {!activeTable ? (
        <div className="py-12 text-center text-sm text-[#777773]">
          Shop data is not available yet.
        </div>
      ) : (
        <div className="max-h-[420px] overflow-auto rounded-xl border border-[#e6e6e1]">
          <table className="w-full min-w-max text-sm">
            <thead className="sticky top-0 z-10 bg-[#f3f4f6] shadow-[0_1px_0_#deded9]">
              <tr>
                {activeTable.columns.map((column) => (
                  <th
                    key={column}
                    className="border-r border-[#deded9] bg-[#f3f4f6] px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5f5f5a] last:border-r-0"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {activeTable.rows.length === 0 ? (
                <tr>
                  <td colSpan={activeTable.columns.length} className="px-4 py-14 text-center">
                    <p className="text-sm font-medium text-[#555550]">No {activeTable.name.toLowerCase()} yet</p>
                    <p className="mt-1 text-xs text-[#8a8a84]">New records will appear here automatically.</p>
                  </td>
                </tr>
              ) : (
                activeTable.rows.map((row, rowIndex) => (
                  <tr key={`${activeTable.id}-${rowIndex}`} className="border-t border-[#ededE9] hover:bg-[#fafaf8]">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={`${rowIndex}-${cellIndex}`}
                        className="border-r border-[#ededE9] px-3 py-2.5 text-xs text-[#4e4e4a] last:border-r-0"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
