export const API_MOUNTS = {
  analytics: "/api/analytics",
  inventory: "/api/inventory",
  shop: "/api/shop",
  sales: "/api/sales",
  paymentMethods: "/api/payment-methods",
  businessRules: "/api/business-rules",
  mobile: "/api/mobile",
  team: "/api/team",
  terminals: "/api/terminals",
  analyticsChats: "/api/analytics/chats",
  emailReceipts: "/api/email-receipts",
  smsReceipts: "/api/sms-receipts",
  receipts: "/api/receipts",
  subscription: "/api/subscription",
  notifications: "/api/notifications",
  admin: "/api/admin",
};

export const API_HEALTH_PATH = "/api/health";

export const WEB_ROUTES = {
  mobileScan: "/mobilesessions/scan",
  publicReceipt(token) {
    return `/r/${encodeURIComponent(token)}`;
  },
};
