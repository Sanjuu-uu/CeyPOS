// Mock database service using localStorage for demonstration
// In a real application, this would use SQLite or another database solution

import { Shop, Product, Sale, User } from '../types';

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 10);

// Initialize local storage with sample data if empty
const initializeDB = () => {
  if (!localStorage.getItem('pos_shops')) {
    const sampleShop: Shop = {
      id: 'shop_1',
      name: 'Natural Foods Market',
      address: '123 Green St, Eco City',
      contact: '+1 (555) 123-4567',
    };
    
    const sampleUser: User = {
      id: 'user_1',
      name: 'John Doe',
      email: 'john@naturalfoods.com',
      role: 'admin',
      shopId: 'shop_1',
      permissions: ['all'],
    };
    
    const sampleProducts: Product[] = [
      {
        id: 'prod_1',
        shopId: 'shop_1',
        name: 'Organic Apples',
        category: 'Produce',
        price: 2.99,
        stock: 100,
        barcode: '1234567890',
        imageUrl: 'https://images.pexels.com/photos/1510392/pexels-photo-1510392.jpeg'
      },
      {
        id: 'prod_2',
        shopId: 'shop_1',
        name: 'Whole Grain Bread',
        category: 'Bakery',
        price: 4.50,
        stock: 30,
        barcode: '2345678901',
        imageUrl: 'https://images.pexels.com/photos/1775043/pexels-photo-1775043.jpeg'
      },
      {
        id: 'prod_3',
        shopId: 'shop_1',
        name: 'Free-Range Eggs',
        category: 'Dairy & Eggs',
        price: 5.99,
        stock: 50,
        barcode: '3456789012',
        imageUrl: 'https://images.pexels.com/photos/162712/egg-white-food-protein-162712.jpeg'
      },
      {
        id: 'prod_4',
        shopId: 'shop_1',
        name: 'Organic Spinach',
        category: 'Produce',
        price: 3.49,
        stock: 45,
        barcode: '4567890123',
        imageUrl: 'https://images.pexels.com/photos/2325843/pexels-photo-2325843.jpeg'
      },
      {
        id: 'prod_5',
        shopId: 'shop_1',
        name: 'Raw Honey',
        category: 'Pantry',
        price: 8.99,
        stock: 25,
        barcode: '5678901234',
        imageUrl: 'https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg'
      },
      {
        id: 'prod_6',
        shopId: 'shop_1',
        name: 'Quinoa',
        category: 'Grains',
        price: 6.99,
        stock: 60,
        barcode: '6789012345',
        imageUrl: 'https://images.pexels.com/photos/7421203/pexels-photo-7421203.jpeg'
      }
    ];
    
    const sampleSales: Sale[] = [
      {
        id: 'sale_1',
        shopId: 'shop_1',
        customerInfo: {
          name: 'Alice Johnson',
          email: 'alice@example.com',
          phone: '555-123-4567'
        },
        items: [
          { ...sampleProducts[0], quantity: 2 },
          { ...sampleProducts[2], quantity: 1 }
        ],
        total: 11.97,
        paymentMethod: 'card',
        timestamp: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'sale_2',
        shopId: 'shop_1',
        items: [
          { ...sampleProducts[1], quantity: 1 },
          { ...sampleProducts[4], quantity: 1 }
        ],
        total: 13.49,
        paymentMethod: 'cash',
        timestamp: new Date(Date.now() - 7200000).toISOString()
      }
    ];
    
    localStorage.setItem('pos_shops', JSON.stringify([sampleShop]));
    localStorage.setItem('pos_users', JSON.stringify([sampleUser]));
    localStorage.setItem('pos_products', JSON.stringify(sampleProducts));
    localStorage.setItem('pos_sales', JSON.stringify(sampleSales));
  }
};

// Database API
export const db = {
  // Initialize the database
  init: () => {
    initializeDB();
  },
  
  // Shop methods
  shops: {
    getAll: (): Shop[] => {
      return JSON.parse(localStorage.getItem('pos_shops') || '[]');
    },
    getById: (id: string): Shop | undefined => {
      const shops = JSON.parse(localStorage.getItem('pos_shops') || '[]');
      return shops.find((shop: Shop) => shop.id === id);
    },
    create: (shop: Omit<Shop, 'id'>): Shop => {
      const newShop = { ...shop, id: `shop_${generateId()}` };
      const shops = JSON.parse(localStorage.getItem('pos_shops') || '[]');
      localStorage.setItem('pos_shops', JSON.stringify([...shops, newShop]));
      return newShop;
    },
    update: (shop: Shop): Shop => {
      const shops = JSON.parse(localStorage.getItem('pos_shops') || '[]');
      const updatedShops = shops.map((s: Shop) => (s.id === shop.id ? shop : s));
      localStorage.setItem('pos_shops', JSON.stringify(updatedShops));
      return shop;
    }
  },
  
  // User methods
  users: {
    getAll: (): User[] => {
      return JSON.parse(localStorage.getItem('pos_users') || '[]');
    },
    getById: (id: string): User | undefined => {
      const users = JSON.parse(localStorage.getItem('pos_users') || '[]');
      return users.find((user: User) => user.id === id);
    },
    getByShopId: (shopId: string): User[] => {
      const users = JSON.parse(localStorage.getItem('pos_users') || '[]');
      return users.filter((user: User) => user.shopId === shopId);
    },
    create: (user: Omit<User, 'id'>): User => {
      const newUser = { ...user, id: `user_${generateId()}` };
      const users = JSON.parse(localStorage.getItem('pos_users') || '[]');
      localStorage.setItem('pos_users', JSON.stringify([...users, newUser]));
      return newUser;
    }
  },
  
  // Product methods
  products: {
    getAll: (): Product[] => {
      return JSON.parse(localStorage.getItem('pos_products') || '[]');
    },
    getByShopId: (shopId: string): Product[] => {
      const products = JSON.parse(localStorage.getItem('pos_products') || '[]');
      return products.filter((product: Product) => product.shopId === shopId);
    },
    getById: (id: string): Product | undefined => {
      const products = JSON.parse(localStorage.getItem('pos_products') || '[]');
      return products.find((product: Product) => product.id === id);
    },
    create: (product: Omit<Product, 'id'>): Product => {
      const newProduct = { ...product, id: `prod_${generateId()}` };
      const products = JSON.parse(localStorage.getItem('pos_products') || '[]');
      localStorage.setItem('pos_products', JSON.stringify([...products, newProduct]));
      return newProduct;
    },
    update: (product: Product): Product => {
      const products = JSON.parse(localStorage.getItem('pos_products') || '[]');
      const updatedProducts = products.map((p: Product) => 
        p.id === product.id ? product : p
      );
      localStorage.setItem('pos_products', JSON.stringify(updatedProducts));
      return product;
    },
    updateStock: (productId: string, quantity: number): Product | undefined => {
      const products = JSON.parse(localStorage.getItem('pos_products') || '[]');
      const productIndex = products.findIndex((p: Product) => p.id === productId);
      
      if (productIndex === -1) return undefined;
      
      const product = products[productIndex];
      const updatedProduct = {
        ...product,
        stock: Math.max(0, product.stock + quantity)
      };
      
      products[productIndex] = updatedProduct;
      localStorage.setItem('pos_products', JSON.stringify(products));
      
      return updatedProduct;
    }
  },
  
  // Sales methods
  sales: {
    getAll: (): Sale[] => {
      return JSON.parse(localStorage.getItem('pos_sales') || '[]');
    },
    getByShopId: (shopId: string): Sale[] => {
      const sales = JSON.parse(localStorage.getItem('pos_sales') || '[]');
      return sales.filter((sale: Sale) => sale.shopId === shopId);
    },
    getById: (id: string): Sale | undefined => {
      const sales = JSON.parse(localStorage.getItem('pos_sales') || '[]');
      return sales.find((sale: Sale) => sale.id === id);
    },
    create: (sale: Omit<Sale, 'id'>): Sale => {
      const newSale = { 
        ...sale, 
        id: `sale_${generateId()}`,
        timestamp: new Date().toISOString()
      };
      
      // Update product stock
      newSale.items.forEach(item => {
        db.products.updateStock(item.id, -item.quantity);
      });
      
      const sales = JSON.parse(localStorage.getItem('pos_sales') || '[]');
      localStorage.setItem('pos_sales', JSON.stringify([...sales, newSale]));
      
      return newSale;
    }
  }
};