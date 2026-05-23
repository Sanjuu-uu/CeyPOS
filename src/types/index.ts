// Common type definitions for the POS system

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "staff";
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
  currency?: string;
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

export interface Customer {
  id: string;
  shopId: string;
  name?: string;
  email?: string;
  phone?: string;
  lastPurchaseAt?: string;
  totalSpend?: number;
  pointsBalance?: number;
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
  subtotal?: number;
  tax?: number;
  discount?: number;
  pointsEarned?: number;
  pointsRedeemed?: number;
  paymentMethod: "cash" | "card" | "mobile";
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

export interface KeyboardShortcuts {
  focusSearch: string;
  checkout: string;
  clearCart: string;
  togglePayment: string;
  addCustomer: string;
  removeCustomer: string;
  confirmPayment: string;
  increaseQuantity: string;
  decreaseQuantity: string;
  toggleReceiptPrint: string;
  toggleReceiptSms: string;
  toggleReceiptEmail: string;
}

export type ModuleName =
  | "dashboard"
  | "pos"
  | "inventory"
  | "analytics"
  | "Subscription"
  | "receipts"
  | "payments"
  | "reports"
  | "settings"
  | "support"
  | "import"
  | "sessions"
  | "business"
  | "components";
