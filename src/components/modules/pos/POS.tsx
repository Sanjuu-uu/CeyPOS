import React, { useState, useEffect } from 'react';
import { Card } from '../../ui/Card';
import { ProductGrid } from './ProductGrid';
import { ShoppingCart } from './ShoppingCart';
import { Search, Tag, Filter } from 'lucide-react';
import { Input } from '../../ui/Input';
import { db } from '../../../lib/db';
import { useApp } from '../../../context/AppContext';
import { Product } from '../../../types';

export const POS: React.FC = () => {
  const { currentShop } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);

  // Keep products in sync with server DB
  useEffect(() => {
    if (!currentShop) {
      setProducts([]);
      return;
    }
    const shopId = currentShop.id;
    // initial load
    setProducts(db.products.getByShopId(shopId));

    const unsubInv = (db as any).on('inventoryUpdated', (payload: any) => {
      if (!payload) return;
      const payloadShopId = String(payload.shopId).replace(/^shop_/, '');
      const cur = String(shopId).replace(/^shop_/, '');
      if (payloadShopId === cur || String(payload.shopId) === shopId) {
        setProducts(db.products.getByShopId(shopId));
      }
    });

    return () => {
      unsubInv();
    };
  }, [currentShop]);

  // Get all unique categories
  const categories = [...new Set(products.map(product => product.category))];

  // Filter products based on search term and selected category
  const filteredProducts = products.filter(product => {
    const matchesSearch = searchTerm === '' || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.barcode || '').includes(searchTerm);
    
    const matchesCategory = selectedCategory === null || 
      product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
      {/* Left Side - Product Grid */}
      <div className="md:col-span-2 flex flex-col">
        {/* Search and Filter */}
        <Card className="mb-6 border border-gray-100">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search products or scan barcode..."
              leftIcon={<Search size={18} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
        
        {/* Product Grid */}
        <ProductGrid products={filteredProducts} />
      </div>
      
      {/* Right Side - Shopping Cart */}
      <div className="md:col-span-1">
        <ShoppingCart />
      </div>
    </div>
  );
};