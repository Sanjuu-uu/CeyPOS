
# CeyPOS User Journey & System Architecture

The user begins at the **Static Landing Page** (`pages/index.html`) and clicks "Login" or "Register" in the header, which routes to the **Login Page** (`pages/login.html`) or **Registration Page** (`pages/register.html`). Upon form submission, the application transitions directly to the **Shop Creation Wizard** (`src/components/shopWizard/ShopWizard.tsx`) where they complete a comprehensive 6-step onboarding process using React with Framer Motion animations. The wizard captures shop details, location information, business registration, settings configuration, payment methods, and final confirmation through the `ShopWizardContext` state management, then stores all data in browser localStorage using the shop-specific database layer (`src/lib/db.ts`).

Next, the user is directed to the **CeyPoS Dashboard** ('src\components\modules\dashboard\Dashboard.tsx'`) which serves as the central React dashboard with TypeScript integration. Using the responsive sidebar (`src/components/layout/Sidebar.tsx`), the user can navigate between various modules managed by the **Module Router** (`src/components/modules/ModuleRouter.tsx`): **Dashboard** (`src/components/modules/dashboard/Dashboard.tsx`), **POS** (`src/components/modules/pos/POS.tsx`), **Inventory Management** (`src/components/modules/inventory/Inventory.tsx`), **Analytics Dashboard** (`src/components/modules/analytics/Analytics.tsx`), **Checkout Flow** (`src/components/modules/checkout/Checkout.tsx`), **Receipt Management** (`src/components/modules/receipts/Receipts.tsx`), **Payment Processing** (`src/components/modules/payments/Payments.tsx`), **Reports Generation** (`src/components/modules/reports/Reports.tsx`), **User Settings** (`src/components/modules/settings/Settings.tsx`), **Support Center** (`src/components/modules/support/Support.tsx`), and **Data Import** (`src/components/modules/import/Import.tsx`).

In the **Inventory Management Module**, inventory can be added manually through form validation or imported via drag-and-drop Excel upload using React Dropzone. The system processes product data including SKU, name, price, stock quantity, barcodes, and category information, validates required fields, and stores the data in the localStorage-based database with shop-specific namespacing (`pos_products`, `pos_shops`, `pos_sales`). Real-time inventory updates are reflected across all modules through the centralized `AppContext` state management, ensuring data consistency throughout the application.

From the **POS Module**, the user browses inventory pulled from localStorage, adds items to a shopping cart with quantity management and tax calculations, and clicks "Checkout," transitating to the **Checkout Module** with multi-step validation. The system handles customer information capture, order confirmation, and payment processing integration points, then records transaction data in the localStorage sales database with automated inventory quantity updates. The **Receipt Module** generates formatted receipts with order details, customer information, and payment summaries, providing options for print preview and digital delivery preparation.

The user can access the **Analytics Module** which displays interactive data visualizations using the Recharts library, pulling business KPIs from the localStorage sales and inventory datasets. The dashboard presents sales trends, inventory levels, revenue analytics, and performance metrics through responsive charts and graphs with real-time data binding. From there, the **Reports Module** enables data export functionality for sales and inventory reports in various formats, while the **Payment Module** provides transaction history, payment status tracking, and financial reconciliation tools integrated with the sales database.

The **Support Module** offers comprehensive help resources including searchable documentation, user guides, and troubleshooting assistance, while the **Settings Module** allows configuration of shop preferences, user account management, system customization, and operational parameters stored in the localStorage settings database. The **Import Module** facilitates bulk data operations for inventory management, customer databases, and historical transaction imports through Excel template processing and validation workflows.

At any point during navigation, the **Top Bar** (`src/components/layout/TopBar.tsx`) provides quick access to notifications, user profile settings, and logout functionality. The application maintains consistent state management through React Context providers (`src/context/AppContext.tsx`, `src/context/ShopWizardContext.tsx`), ensuring seamless data flow between modules and preserving user preferences across sessions through localStorage persistence.

## Technical Architecture Summary

**Frontend**: Single React 18.3.1 application with TypeScript, Vite build tool, Tailwind CSS styling, and Lucide React icons  
**Component Library**: Separate React component library (`component_library/`) with shared UI components and utilities  
**Static Pages**: HTML-based marketing and authentication pages (`pages/`) with custom CSS styling  
**Database**: localStorage-based data persistence with shop-specific table simulation (`pos_shops`, `pos_products`, `pos_sales`)  
**State Management**: React Context API with AppContext and ShopWizardContext for centralized state  
**Animations**: Framer Motion for Shop Wizard transitions and UI animations  
**Charts & Analytics**: Recharts library for business intelligence dashboards and data visualization  
**File Handling**: React Dropzone for Excel import functionality and file upload workflows  
**Architecture**: Modular single-page application with component-based routing and localStorage database layer


**Updated**: May 29, 2025  
**Author**: Ceynode
**Project**: CeyPoS - Point of Sale System  
**Version**: 1.0
