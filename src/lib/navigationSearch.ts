import type { ModuleName } from "../types";

export type NavigationSearchKind = "Navigation" | "Feature" | "Setting";

export interface NavigationSearchItem {
  id: string;
  title: string;
  description: string;
  module: ModuleName;
  kind: NavigationSearchKind;
  hash?: string;
  keywords?: string[];
}

const item = (
  id: string,
  title: string,
  description: string,
  module: ModuleName,
  kind: NavigationSearchKind,
  hash?: string,
  keywords: string[] = [],
): NavigationSearchItem => ({
  id,
  title,
  description,
  module,
  kind,
  hash,
  keywords,
});

export const navigationSearchItems: NavigationSearchItem[] = [
  item("pos", "POS", "Sell products, scan barcodes, manage carts and checkout.", "pos", "Navigation", undefined, ["sales", "checkout", "cart", "cashier", "barcode"]),
  item("pos-products", "Product Search", "Find products by name, category or barcode during checkout.", "pos", "Feature", undefined, ["scan", "search products"]),
  item("pos-customer", "Customer Details", "Attach customer name, phone and email to a sale.", "pos", "Feature", undefined, ["receipt customer", "loyalty customer"]),
  item("pos-receipt-options", "Receipt Options", "Choose printed, SMS or email receipts before payment.", "pos", "Feature", undefined, ["print receipt", "sms receipt", "email receipt"]),

  item("analytics", "Analytics", "Track revenue, orders, customers and live shop activity.", "analytics", "Navigation", undefined, ["dashboard", "ai", "insights", "chat"]),
  item("analytics-ai-chat", "Analytics Chat", "Ask questions about shop data and trends.", "analytics", "Feature", undefined, ["assistant", "business chat", "ai analyst"]),
  item("analytics-shop-data", "Shop Data Preview", "Inspect inventory, sales, customers and daily sales data.", "analytics", "Feature", undefined, ["database", "tables"]),

  item("payments", "Payments", "Manage tender methods, transactions and payment preferences.", "payments", "Navigation", undefined, ["payment settings", "tender"]),
  item("payments-overview", "Payment Overview", "Review revenue, transaction count, average payment and success rate.", "payments", "Feature", "payments:overview"),
  item("payments-methods", "Payment Methods", "Enable card, digital wallet, mobile and cash payment methods.", "payments", "Setting", "payments:methods", ["add payment method", "cash", "card", "wallet", "mobile payment"]),
  item("payments-transactions", "Transactions", "View recent completed payment activity.", "payments", "Feature", "payments:transactions", ["txn", "payment history"]),
  item("payments-settings", "Payment Settings", "Set default payment method, auto-settlement and receipt options.", "payments", "Setting", "payments:settings", ["default tender", "auto settlement", "print receipt"]),

  item("receipts", "Receipts", "Review receipts and resend customer copies.", "receipts", "Navigation", undefined, ["receipt history", "sales receipts"]),
  item("receipts-search", "Receipt Search", "Search receipt records and select a sale.", "receipts", "Feature", undefined),
  item("receipts-email", "Email Receipt", "Send a receipt copy to a customer email address.", "receipts", "Feature", undefined),
  item("receipts-sms", "SMS Receipt", "Send a receipt link by SMS.", "receipts", "Feature", undefined),

  item("inventory", "Inventory", "Manage products, categories, barcodes and stock levels.", "inventory", "Navigation", undefined, ["catalog", "products", "stock"]),
  item("inventory-add", "Add Product", "Create products with SKU, barcode, price, category and stock.", "inventory", "Feature", undefined, ["new item", "catalog item"]),
  item("inventory-import", "Import Products", "Bulk import catalog data through the inventory import wizard.", "inventory", "Feature", undefined, ["csv", "bulk upload"]),
  item("inventory-stock", "Stock Filters", "Filter inventory by all, in-stock, low-stock and out-of-stock items.", "inventory", "Feature", undefined, ["low stock", "out of stock"]),

  item("sessions", "Sessions", "Connect and manage register terminals and mobile devices.", "sessions", "Navigation", undefined, ["terminals", "devices", "mobile scanner"]),
  item("sessions-register", "Register Terminal", "Create and pair a register terminal with the shop.", "sessions", "Feature", undefined, ["pair terminal", "claim code"]),
  item("sessions-mobile", "Mobile Scan Session", "Create mobile scanning sessions and QR links.", "sessions", "Feature", undefined, ["qr session", "mobile barcode"]),

  item("loyalty", "Loyalty", "Manage loyalty, discounts, tax rates and surcharges.", "business", "Navigation", undefined, ["business rules", "rewards"]),
  item("loyalty-points", "Loyalty Points", "Configure earning, redemption and minimum redeem rules.", "business", "Setting", "business:loyalty", ["rewards", "points"]),
  item("loyalty-discounts", "Discounts", "Create fixed or percentage discount rules.", "business", "Setting", "business:discounts", ["promotions", "discount rules"]),
  item("loyalty-taxes", "Tax Rates", "Manage tax rates and default tax rules.", "business", "Setting", "business:taxes", ["vat", "tax settings"]),
  item("loyalty-surcharges", "Surcharges", "Configure payment surcharges by amount and type.", "business", "Setting", "business:surcharges", ["fees", "extra charge"]),

  item("flash-promo", "Flash Promo", "Create and manage promotional campaigns.", "import", "Navigation", undefined, ["campaigns", "promo"]),
  item("flash-promo-active", "Active Promotions", "Review currently running promotional campaigns.", "import", "Feature", "import:analytics"),
  item("flash-promo-create", "Create Promotion", "Build a new flash promotion campaign.", "import", "Feature", "import:create"),
  item("flash-promo-history", "Promotion History", "Review previous promotional campaigns.", "import", "Feature", "import:history"),

  item("reports", "Reports", "Review sales, inventory and customer reports.", "reports", "Navigation", undefined, ["business insights", "performance"]),
  item("reports-sales", "Sales Report", "Analyze revenue, payment methods, top products and recent transactions.", "reports", "Feature", "reports:sales"),
  item("reports-inventory", "Inventory Report", "Analyze stock value, availability, stock health and low-stock alerts.", "reports", "Feature", "reports:inventory"),
  item("reports-customers", "Customer Report", "Analyze top customers, retention and customer mix.", "reports", "Feature", "reports:customers"),
  item("reports-export", "Download Report", "Export the current report view.", "reports", "Feature", undefined, ["download", "export"]),

  item("subscription", "Subscription", "Manage billing, support and plan preferences.", "Subscription", "Navigation", undefined, ["billing", "plan"]),
  item("subscription-business", "Business Plan", "Review business subscription options.", "Subscription", "Feature", "subscription:business"),
  item("subscription-enterprise", "Enterprise Plan", "Review enterprise subscription options.", "Subscription", "Feature", "subscription:enterprise"),
  item("subscription-billing", "Manage Billing", "Open billing management from the subscription page.", "Subscription", "Setting", undefined, ["invoice", "payment plan"]),

  item("support", "Support", "Find help articles and manage support requests.", "support", "Navigation", undefined, ["help", "faq"]),
  item("support-faq", "Knowledge Base", "Read answers about POS, inventory, payments and backups.", "support", "Feature", "support:faq", ["faq", "help articles"]),
  item("support-tickets", "Support Tickets", "Track support conversations and issue status.", "support", "Feature", "support:tickets", ["requests"]),
  item("support-contact", "Contact Support", "Contact support for account and billing help.", "support", "Feature", "support:contact"),

  item("settings", "Settings", "Customize workspace and account preferences.", "settings", "Navigation", undefined, ["preferences"]),
  item("settings-general", "General Settings", "Edit shop information, currency, timezone, tax rate and receipt message.", "settings", "Setting", "settings:general", ["shop information", "business settings"]),
  item("settings-users", "Users", "Update user profile and password fields.", "settings", "Setting", "settings:users", ["profile", "password"]),
  item("settings-team", "Team", "Manage employees and module permissions.", "settings", "Setting", "settings:team", ["employees", "permissions"]),
  item("settings-keybindings", "Keybindings", "Customize POS keyboard shortcuts.", "settings", "Setting", "settings:keybindings", ["hotkeys", "shortcuts", "barcode shortcut"]),
  item("settings-printer", "Printer", "Set receipt paper width, QR code, auto-print, footer text and feed lines.", "settings", "Setting", "settings:printer", ["receipt printer", "paper width", "test print"]),
  item("settings-notifications", "Notifications", "Manage email, in-app, low-stock, daily report, sales and system alerts.", "settings", "Setting", "settings:notifications", ["alerts", "low stock alerts"]),
  item("settings-security", "Security", "Manage two-factor authentication, session timeout and login alerts.", "settings", "Setting", "settings:security", ["2fa", "session timeout", "login alerts"]),
  item("settings-appearance", "Appearance", "Choose theme, language and compact mode.", "settings", "Setting", "settings:appearance", ["theme", "language", "compact"]),
  item("settings-backup", "Backup & Data", "Export, import, auto-backup or delete shop data.", "settings", "Setting", "settings:backup", ["backup", "export data", "import data", "danger zone"]),
];

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export const searchNavigation = (query: string, limit = 8): NavigationSearchItem[] => {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return navigationSearchItems.filter((entry) => entry.kind === "Navigation").slice(0, limit);
  }

  const terms = normalizedQuery.split(" ").filter(Boolean);
  return navigationSearchItems
    .map((entry) => {
      const searchable = normalize([
        entry.title,
        entry.description,
        entry.kind,
        entry.module,
        ...(entry.keywords ?? []),
      ].join(" "));
      const score = terms.reduce((total, term) => {
        if (normalize(entry.title).startsWith(term)) return total + 8;
        if (normalize(entry.title).includes(term)) return total + 5;
        if (searchable.includes(term)) return total + 2;
        return total;
      }, 0);
      return { entry, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .slice(0, limit)
    .map(({ entry }) => entry);
};

export const getSearchHash = () => window.location.hash.replace(/^#/, "");

export const setSearchHash = (hash?: string) => {
  if (!hash) return;
  window.history.replaceState(null, "", `#${hash}`);
  window.dispatchEvent(new Event("hashchange"));
};
