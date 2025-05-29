// Common type definitions for the POS system

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
  shopId: string;
  permissions: string[];
  avatarUrl?: string;
}

export interface Shop {
  id: string;
  name: string;
  address: string;
  contact: string;
  logo?: string;
}

export interface Product {
  id: string;
  shopId: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  barcode: string;
  imageUrl?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Sale {
  id: string;
  shopId: string;
  customerInfo?: {
    name: string;
    email: string;
    phone: string;
  };
  items: CartItem[];
  total: number;
  paymentMethod: 'cash' | 'card' | 'mobile';
  timestamp: string;
}

export interface DashboardStats {
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  popularProducts: Array<{
    id: string;
    name: string;
    quantity: number;
  }>;
}

export type ModuleName = 
  | 'dashboard' 
  | 'pos' 
  | 'inventory' 
  | 'analytics' 
  | 'checkout' 
  | 'receipts' 
  | 'payments' 
  | 'reports' 
  | 'settings' 
  | 'support' 
  | 'import' 
  | 'sessions'
  | 'components';