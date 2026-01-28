import React, { useState, useEffect, useMemo } from 'react';
import { ProductGrid } from './ProductGrid';
import { ShoppingCart } from './ShoppingCart';
import { Search, X, ScanBarcode } from 'lucide-react';
import { db } from '../../../lib/db';
import { useApp } from '../../../context/AppContext';
import { Product } from '../../../types';

type InventoryUpdatedPayload = {
  shopId?: string;
  items?: Product[];
};

const isInventoryUpdatedPayload = (payload: unknown): payload is InventoryUpdatedPayload => {
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

export const POS: React.FC = () => {
  const { currentShop } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Keep products in sync with server DB
  useEffect(() => {
    if (!currentShop) {
      setProducts([]);
      return;
    }
    const shopId = currentShop.id;
    setIsLoading(true);
    
    const loadProducts = () => {
       const data = db.products.getByShopId(shopId);
       setProducts(data);
       setIsLoading(false);
    };

    loadProducts();

    // Listen for real-time inventory updates
    const handler = (payload: unknown) => {
      if (!isInventoryUpdatedPayload(payload) || !payload.shopId) {
        return;
      }
      const normalizedPayloadShop = String(payload.shopId).replace(/^shop_/, '');
      const normalizedCurrent = String(shopId).replace(/^shop_/, '');
      if (normalizedPayloadShop === normalizedCurrent || payload.shopId === shopId) {
        if (Array.isArray(payload.items)) {
          setProducts(payload.items);
          setIsLoading(false);
        } else {
          loadProducts();
        }
      }
    };

    const unsubscribeInventory = db.on('inventoryUpdated', handler);

    return () => {
      unsubscribeInventory();
    };
  }, [currentShop]);

  // Extract categories (Memoized for performance)
  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category))];
    return cats.sort();
  }, [products]);

  // Filter products (Memoized to prevent UI blocking)
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = searchTerm === '' || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.barcode || '').includes(searchTerm);
      
      const matchesCategory = selectedCategory === null || 
        product.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-80px)] gap-4 pb-2">
      {/* Left Side - Product Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        
        {/* Top Bar: Search & Categories */}
        <div className="p-4 border-b border-gray-100 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search size={20} />
            </div>
            <input
              type="text"
              className="w-full h-12 pl-10 pr-10 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ecff76] focus:border-[#ecff76] text-base transition-all"
              placeholder="Search by name or scan barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            )}
            <div className="absolute inset-y-0 right-10 flex items-center pointer-events-none text-gray-300">
               <ScanBarcode size={20} />
            </div>
          </div>

          {/* Categories - Horizontal Scroll Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === null
                  ? 'bg-[#ecff76] text-gray-900 shadow-sm border border-[#dcefa8]'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Items
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === category
                    ? 'bg-[#ecff76] text-gray-900 shadow-sm border border-[#dcefa8]'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
        
        {/* Product Grid Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ecff76]"></div>
            </div>
          ) : (
            <ProductGrid products={filteredProducts} />
          )}
        </div>
      </div>
      
      {/* Right Side - Cart */}
      <div className="w-full md:w-[400px] flex-shrink-0 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <ShoppingCart />
      </div>
    </div>
  );
};