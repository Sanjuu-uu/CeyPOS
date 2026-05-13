import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { Search, Plus, Package, Edit, Trash2, Upload, X } from 'lucide-react';
import { db } from '../../../lib/db';
import { useApp } from '../../../context/AppContext';
import { Product } from '../../../types';
import { ImportWizard } from './import-wizard/ImportWizard';

type InventoryChangeEvent = {
  shopId?: string;
  items?: Product[];
};

const isInventoryChangeEvent = (payload: unknown): payload is InventoryChangeEvent => {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const candidate = payload as Record<string, unknown>;
  const shopId = candidate.shopId;
  const items = candidate.items;
  const validShopId = shopId === undefined || typeof shopId === 'string';
  const validItems =
    items === undefined ||
    (Array.isArray(items) && items.every((item) => typeof item === 'object' && item !== null));
  return validShopId && validItems;
};

export const Inventory: React.FC = () => {
  const { currentShop } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState<string | null>(null);
  
  // New product form state
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: '',
    price: '',
    stock: '',
    barcode: '',
    imageUrl: ''
  });

  const isMatchingShop = (shopId?: string) => {
    if (!shopId || !currentShop?.id) return false;
    const normalize = (value: string) => value.replace(/^shop_/, '');
    return normalize(shopId) === normalize(currentShop.id);
  };

  useEffect(() => {
    if (!currentShop) {
      setProducts([]);
      setGlobalError(null);
      return;
    }

    const shopProducts = db.products.getByShopId(currentShop.id);
    setProducts(shopProducts);

    const handler = (payload: unknown) => {
      if (!isInventoryChangeEvent(payload)) {
        return;
      }
      if (!payload.shopId || payload.shopId !== currentShop.id) {
        return;
      }
      setProducts(payload.items ?? []);
    };

    const unsubscribe = db.on('inventoryUpdated', handler);

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      } else {
        db.off('inventoryUpdated', handler);
      }
    };
  }, [currentShop]);

  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category))],
    [products]
  );

  // Filter products based on search term and selected category
  const filteredProducts = products.filter(product => {
    const matchesSearch = searchTerm === '' || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode.includes(searchTerm);
    
    const matchesCategory = selectedCategory === null || 
      product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (editingProduct) {
      setEditingProduct({ ...editingProduct, [name]: name === 'price' || name === 'stock' ? parseFloat(value) : value });
    } else {
      setNewProduct({ ...newProduct, [name]: value });
    }
  };

  const resetForm = () => {
    setNewProduct({
      name: '',
      category: '',
      price: '',
      stock: '',
      barcode: '',
      imageUrl: ''
    });
    setEditingProduct(null);
    setIsAddingProduct(false);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentShop || isSaving) return;

    const parsedPrice = parseFloat(newProduct.price);
    const parsedStock = parseInt(newProduct.stock, 10);
    if (!editingProduct && (Number.isNaN(parsedPrice) || Number.isNaN(parsedStock))) {
      setErrorMessage('Please provide valid price and stock values.');
      return;
    }

  setIsSaving(true);
  setGlobalError(null);
    setErrorMessage(null);

    try {
      if (editingProduct) {
        await db.products.update({ ...editingProduct });
      } else {
        await db.products.create({
          shopId: currentShop.id,
          name: newProduct.name,
          category: newProduct.category,
          price: parsedPrice,
          stock: parsedStock,
          barcode: newProduct.barcode,
          imageUrl: newProduct.imageUrl,
        });
      }

      resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save product. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsAddingProduct(true);
  };

  const handleBarcodeCapture = useCallback((barcode: string) => {
    const normalized = barcode.trim();
    if (!normalized) return;

    const match = products.find((product) => product.barcode === normalized);
    if (match) {
      handleEditProduct(match);
      return;
    }

    setEditingProduct(null);
    setIsAddingProduct(true);
    setNewProduct({
      name: '',
      category: '',
      price: '',
      stock: '',
      barcode: normalized,
      imageUrl: ''
    });
  }, [products]);

  useEffect(() => {
    const handler = (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const candidate = payload as Record<string, unknown>;
      const value = typeof candidate.value === 'string' ? candidate.value.trim() : '';
      const sessionType = typeof candidate.sessionType === 'string' ? candidate.sessionType : '';
      const shopId = typeof candidate.shopId === 'string' ? candidate.shopId : undefined;

      if (!value || !isMatchingShop(shopId)) return;
      if (sessionType && sessionType !== 'barcode') return;

      handleBarcodeCapture(value);
    };

    const unsubscribe = db.on('mobileBarcode', handler);
    return () => unsubscribe();
  }, [currentShop?.id, handleBarcodeCapture]);

  const handleDeleteProduct = async (product: Product) => {
    if (!currentShop) return;

    setGlobalError(null);
    setDeleteInProgress(product.id);
    try {
      await db.products.delete(product.id, currentShop.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete product. Please try again.';
      setGlobalError(message);
    } finally {
      setDeleteInProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-800">Inventory Management</h2>
        <div className="flex gap-3">
          <Button 
            variant="secondary"
            icon={<Upload size={16} />}
            onClick={() => setShowImportWizard(true)}
          >
            Import Products
          </Button>
          <Button 
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() => setIsAddingProduct(true)}
          >
            Add Product
          </Button>
        </div>
      </div>
      
      {/* Product Form (Conditionally Shown) */}
      {isAddingProduct && (
        <Card
          title={editingProduct ? "Edit Product" : "Add New Product"}
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
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Product Name"
              name="name"
              value={editingProduct ? editingProduct.name : newProduct.name}
              onChange={handleInputChange}
              required
              disabled={isSaving}
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                name="category"
                value={editingProduct ? editingProduct.category : newProduct.category}
                onChange={handleInputChange}
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
                <option value="new">+ Add New Category</option>
              </select>
            </div>
            
            <Input
              label="Price ($)"
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={editingProduct ? editingProduct.price.toString() : newProduct.price}
              onChange={handleInputChange}
              required
              disabled={isSaving}
            />
            
            <Input
              label="Stock Quantity"
              name="stock"
              type="number"
              min="0"
              value={editingProduct ? editingProduct.stock.toString() : newProduct.stock}
              onChange={handleInputChange}
              required
              disabled={isSaving}
            />
            
            <Input
              label="Barcode"
              name="barcode"
              value={editingProduct ? editingProduct.barcode : newProduct.barcode}
              onChange={handleInputChange}
              required
              disabled={isSaving}
            />
            
            <Input
              label="Image URL (Optional)"
              name="imageUrl"
              value={editingProduct ? editingProduct.imageUrl || '' : newProduct.imageUrl}
              onChange={handleInputChange}
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
              <Button
                variant="primary"
                type="submit"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
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
              onChange={(e) => setSelectedCategory(e.target.value === '' ? null : e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>
      
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
                filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 mr-3">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
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
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        product.stock > 10
                          ? 'bg-green-50 text-green-600'
                          : product.stock > 0
                          ? 'bg-yellow-50 text-yellow-600'
                          : 'bg-red-50 text-red-600'
                      }`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.barcode}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product)}
                        disabled={deleteInProgress === product.id}
                        className={`text-red-500 hover:text-red-700 ${
                          deleteInProgress === product.id ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        aria-label={`Delete ${product.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-sm text-center text-gray-500">
                    No products found. Try adjusting your search or add a new product.
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
          onImportComplete={(data) => {
            // Handle import completion
            console.log('Import completed with data:', data);
            setShowImportWizard(false);
            // Here you could add logic to refresh the product list
            // or process the imported data
          }}
        />
      )}
    </div>
  );
};