import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import {
  Search,
  Plus,
  Package,
  Edit,
  Trash2,
  Upload,
  X,
  AlertTriangle,
} from 'lucide-react';
import { db } from '../../../lib/db';
import { useApp } from '../../../context/AppContext';
import { Product } from '../../../types';
import { ImportWizard } from './import-wizard/ImportWizard';

const LOW_STOCK_THRESHOLD = 10;
const NEW_CATEGORY = '__new__';

type StockFilter = 'all' | 'in' | 'low' | 'out';

type FormState = {
  name: string;
  category: string;
  price: string;
  stock: string;
  barcode: string;
  imageUrl: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  category: '',
  price: '',
  stock: '',
  barcode: '',
  imageUrl: '',
};

// Debounce search input so filtering doesn't run on every keystroke.
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

type InventoryChangeEvent = {
  shopId?: string;
  items?: Product[];
};

const isInventoryChangeEvent = (
  payload: unknown,
): payload is InventoryChangeEvent => {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const candidate = payload as Record<string, unknown>;
  const shopId = candidate.shopId;
  const items = candidate.items;
  const validShopId = shopId === undefined || typeof shopId === 'string';
  const validItems =
    items === undefined ||
    (Array.isArray(items) &&
      items.every((item) => typeof item === 'object' && item !== null));
  return validShopId && validItems;
};

export const Inventory: React.FC = () => {
  const { currentShop } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 250);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');

  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [useCustomCategory, setUseCustomCategory] = useState(false);

  const [showImportWizard, setShowImportWizard] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const currentShopId = currentShop?.id;

  const isMatchingShop = useCallback(
    (shopId?: string) => {
      if (!shopId || !currentShopId) return false;
      const normalize = (value: string) => value.replace(/^shop_/, '');
      return normalize(shopId) === normalize(currentShopId);
    },
    [currentShopId],
  );

  const loadProducts = useCallback(() => {
    if (!currentShopId) {
      setProducts([]);
      return;
    }
    setProducts(db.products.getByShopId(currentShopId));
  }, [currentShopId]);

  useEffect(() => {
    if (!currentShopId) {
      setProducts([]);
      setGlobalError(null);
      setSelectedIds(new Set());
      return;
    }

    loadProducts();
    setSelectedIds(new Set());

    const handler = (payload: unknown) => {
      if (!isInventoryChangeEvent(payload)) return;
      if (!isMatchingShop(payload.shopId)) return;
      setProducts(payload.items ?? db.products.getByShopId(currentShopId));
    };

    const unsubscribe = db.on('inventoryUpdated', handler);
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      else db.off('inventoryUpdated', handler);
    };
  }, [currentShopId, isMatchingShop, loadProducts]);

  const categories = useMemo(
    () =>
      [...new Set(products.map((product) => product.category).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [products],
  );

  // Filtering (memoized) — search by name/barcode, category, and stock status.
  const filteredProducts = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        term === '' ||
        product.name.toLowerCase().includes(term) ||
        (product.barcode || '').toLowerCase().includes(term);

      const matchesCategory =
        selectedCategory === null || product.category === selectedCategory;

      const matchesStock =
        stockFilter === 'all'
          ? true
          : stockFilter === 'out'
            ? product.stock <= 0
            : stockFilter === 'low'
              ? product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD
              : product.stock > 0; // 'in'

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, debouncedSearch, selectedCategory, stockFilter]);

  const lowStockCount = useMemo(
    () => products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length,
    [products],
  );
  const outOfStockCount = useMemo(
    () => products.filter((p) => p.stock <= 0).length,
    [products],
  );

  // Selection across the currently visible (filtered) rows.
  const allVisibleSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((p) => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredProducts.forEach((p) => next.delete(p.id));
      } else {
        filteredProducts.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setUseCustomCategory(false);
    setIsAddingProduct(false);
    setErrorMessage(null);
  };

  const startAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setUseCustomCategory(false);
    setErrorMessage(null);
    setIsAddingProduct(true);
  };

  const startEdit = useCallback((product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name ?? '',
      category: product.category ?? '',
      price: Number.isFinite(product.price) ? String(product.price) : '',
      stock: Number.isFinite(product.stock) ? String(product.stock) : '',
      barcode: product.barcode ?? '',
      imageUrl: product.imageUrl ?? '',
    });
    setUseCustomCategory(false);
    setErrorMessage(null);
    setIsAddingProduct(true);
  }, []);

  const handleFieldChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategorySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === NEW_CATEGORY) {
      setUseCustomCategory(true);
      setForm((prev) => ({ ...prev, category: '' }));
    } else {
      setUseCustomCategory(false);
      setForm((prev) => ({ ...prev, category: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShop || isSaving) return;

    const name = form.name.trim();
    const category = form.category.trim();
    const barcode = form.barcode.trim();
    const parsedPrice = parseFloat(form.price);
    const parsedStock = parseInt(form.stock, 10);

    if (!name) {
      setErrorMessage('Please enter a product name.');
      return;
    }
    if (!category) {
      setErrorMessage('Please choose or enter a category.');
      return;
    }
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setErrorMessage('Please provide a valid price (0 or more).');
      return;
    }
    if (Number.isNaN(parsedStock) || parsedStock < 0) {
      setErrorMessage('Please provide a valid stock quantity (0 or more).');
      return;
    }

    setIsSaving(true);
    setGlobalError(null);
    setErrorMessage(null);

    try {
      if (editingId) {
        await db.products.update({
          id: editingId,
          shopId: currentShop.id,
          name,
          category,
          price: parsedPrice,
          stock: parsedStock,
          barcode,
          imageUrl: form.imageUrl.trim(),
        });
      } else {
        await db.products.create({
          shopId: currentShop.id,
          name,
          category,
          price: parsedPrice,
          stock: parsedStock,
          barcode,
          imageUrl: form.imageUrl.trim(),
        });
      }
      resetForm();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to save product. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBarcodeCapture = useCallback(
    (barcode: string) => {
      const normalized = barcode.trim();
      if (!normalized) return;

      const match = products.find((product) => product.barcode === normalized);
      if (match) {
        startEdit(match);
        return;
      }

      setEditingId(null);
      setUseCustomCategory(false);
      setErrorMessage(null);
      setForm({ ...EMPTY_FORM, barcode: normalized });
      setIsAddingProduct(true);
    },
    [products, startEdit],
  );

  useEffect(() => {
    const handler = (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const candidate = payload as Record<string, unknown>;
      const value =
        typeof candidate.value === 'string' ? candidate.value.trim() : '';
      const sessionType =
        typeof candidate.sessionType === 'string' ? candidate.sessionType : '';
      const shopId =
        typeof candidate.shopId === 'string' ? candidate.shopId : undefined;

      if (!value || !isMatchingShop(shopId)) return;
      if (sessionType && sessionType !== 'barcode') return;

      handleBarcodeCapture(value);
    };

    const unsubscribe = db.on('mobileBarcode', handler);
    return () => unsubscribe();
  }, [isMatchingShop, handleBarcodeCapture]);

  const handleDeleteProduct = async (product: Product) => {
    if (!currentShop) return;
    setGlobalError(null);
    setDeleteInProgress(product.id);
    try {
      await db.products.delete(product.id, currentShop.id);
      setSelectedIds((prev) => {
        if (!prev.has(product.id)) return prev;
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to delete product. Please try again.';
      setGlobalError(message);
    } finally {
      setDeleteInProgress(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!currentShop || selectedIds.size === 0 || bulkDeleting) return;
    const ids = Array.from(selectedIds);
    setGlobalError(null);
    setBulkDeleting(true);
    try {
      await db.products.deleteMany(ids, currentShop.id);
      setSelectedIds(new Set());
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to delete selected products. Please try again.';
      setGlobalError(message);
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            Inventory Management
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {products.length} products
            {lowStockCount > 0 && (
              <span className="text-yellow-600"> · {lowStockCount} low</span>
            )}
            {outOfStockCount > 0 && (
              <span className="text-red-600"> · {outOfStockCount} out</span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            icon={<Upload size={16} />}
            onClick={() => setShowImportWizard(true)}
          >
            Import Products
          </Button>
          <Button variant="primary" icon={<Plus size={16} />} onClick={startAdd}>
            Add Product
          </Button>
        </div>
      </div>

      {/* Product Form (Conditionally Shown) */}
      {isAddingProduct && (
        <Card
          title={editingId ? 'Edit Product' : 'Add New Product'}
          className="border border-gray-100"
          actions={
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          }
        >
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <Input
              label="Product Name"
              name="name"
              value={form.name}
              onChange={handleFieldChange}
              required
              disabled={isSaving}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              {useCustomCategory ? (
                <div className="flex gap-2">
                  <input
                    name="category"
                    value={form.category}
                    onChange={handleFieldChange}
                    placeholder="New category name"
                    autoFocus
                    className="w-full h-10 pl-3 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ECFF76]/20 focus:border-[#ECFF76]"
                    disabled={isSaving}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setUseCustomCategory(false);
                      setForm((prev) => ({ ...prev, category: '' }));
                    }}
                    className="px-3 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <select
                  name="category"
                  value={form.category}
                  onChange={handleCategorySelect}
                  className="w-full h-10 pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ECFF76]/20 focus:border-[#ECFF76]"
                  required
                  disabled={isSaving}
                >
                  <option value="">Select Category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                  <option value={NEW_CATEGORY}>+ Add New Category</option>
                </select>
              )}
            </div>

            <Input
              label="Price ($)"
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={handleFieldChange}
              required
              disabled={isSaving}
            />

            <Input
              label="Stock Quantity"
              name="stock"
              type="number"
              min="0"
              value={form.stock}
              onChange={handleFieldChange}
              required
              disabled={isSaving}
            />

            <Input
              label="Barcode"
              name="barcode"
              value={form.barcode}
              onChange={handleFieldChange}
              disabled={isSaving}
            />

            <Input
              label="Image URL (Optional)"
              name="imageUrl"
              value={form.imageUrl}
              onChange={handleFieldChange}
              disabled={isSaving}
            />

            <div className="md:col-span-2 flex justify-end space-x-3 mt-2">
              <Button
                variant="outline"
                type="button"
                onClick={resetForm}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={isSaving}>
                {isSaving
                  ? 'Saving...'
                  : editingId
                    ? 'Update Product'
                    : 'Add Product'}
              </Button>
            </div>
            {errorMessage && (
              <div className="md:col-span-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {errorMessage}
              </div>
            )}
          </form>
        </Card>
      )}

      {/* Search and Filter */}
      <Card className="border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search products or scan barcode..."
            leftIcon={<Search size={18} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchTerm.trim()) {
                e.preventDefault();
                handleBarcodeCapture(searchTerm);
              }
            }}
            fullWidth
          />

          <div className="flex-shrink-0 w-full sm:w-auto">
            <select
              className="w-full h-10 pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ECFF76]/20 focus:border-[#ECFF76]"
              value={selectedCategory || ''}
              onChange={(e) =>
                setSelectedCategory(e.target.value === '' ? null : e.target.value)
              }
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-shrink-0 w-full sm:w-auto">
            <select
              className="w-full h-10 pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ECFF76]/20 focus:border-[#ECFF76]"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as StockFilter)}
            >
              <option value="all">All Stock</option>
              <option value="in">In Stock</option>
              <option value="low">Low Stock (≤ {LOW_STOCK_THRESHOLD})</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-[#ecff76]/15 border border-[#ecff76] rounded-xl px-4 py-2.5">
          <span className="text-sm font-semibold text-gray-900">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 px-4 py-1.5 rounded-full border border-red-200 transition-colors"
            >
              <Trash2 size={14} />
              {bulkDeleting ? 'Deleting...' : 'Delete Selected'}
            </button>
          </div>
        </div>
      )}

      {/* Products Table */}
      <Card className="border border-gray-100">
        {globalError && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {globalError}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAll}
                    className="accent-[#ecff76] w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Barcode
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => {
                  const isSelected = selectedIds.has(product.id);
                  return (
                    <tr
                      key={product.id}
                      className={isSelected ? 'bg-[#ecff76]/10' : undefined}
                    >
                      <td className="px-3 py-4">
                        <input
                          type="checkbox"
                          aria-label={`Select ${product.name}`}
                          checked={isSelected}
                          onChange={() => toggleSelect(product.id)}
                          className="accent-[#ecff76] w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 mr-3">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                loading="lazy"
                                className="h-10 w-10 rounded-md object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center">
                                <Package size={16} className="text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            {product.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.category}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${product.price.toFixed(2)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            product.stock > LOW_STOCK_THRESHOLD
                              ? 'bg-green-50 text-green-600'
                              : product.stock > 0
                                ? 'bg-yellow-50 text-yellow-600'
                                : 'bg-red-50 text-red-600'
                          }`}
                        >
                          {product.stock > 0 &&
                            product.stock <= LOW_STOCK_THRESHOLD && (
                              <AlertTriangle size={11} />
                            )}
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.barcode || (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => startEdit(product)}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                          aria-label={`Edit ${product.name}`}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product)}
                          disabled={deleteInProgress === product.id}
                          className={`text-red-500 hover:text-red-700 ${
                            deleteInProgress === product.id
                              ? 'opacity-50 cursor-not-allowed'
                              : ''
                          }`}
                          aria-label={`Delete ${product.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-sm text-center text-gray-500"
                  >
                    No products found. Try adjusting your search or add a new
                    product.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Import Wizard */}
      {showImportWizard && (
        <ImportWizard
          onClose={() => setShowImportWizard(false)}
          onImportComplete={() => {
            setShowImportWizard(false);
            // Refresh from cache; the upload also broadcasts an
            // inventoryUpdated event, but reload immediately for snappiness.
            loadProducts();
          }}
        />
      )}
    </div>
  );
};
