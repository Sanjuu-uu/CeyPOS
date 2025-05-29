# CeyPoS - AI-Powered Unified Point of Sale Solution


> A comprehensive, modern Point of Sale system built with React, TypeScript, and cutting-edge web technologies. Features a complete POS interface, inventory management, analytics dashboard, and component library.

## **Key Features**

<div align="center">

![CeyPoS Logo](./pages/images/)

**A comprehensive, modern Point of Sale (POS) system built with React, TypeScript, and localStorage-based data persistence.**

[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.2-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.1-38B2AC.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

</div>

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Development](#development)
- [Modules](#modules)
- [Component Library](#component-library)
- [Static Marketing Pages](#static-marketing-pages)
- [Data Management](#data-management)
- [Contributing](#contributing)
- [License](#license)

## Overview

CeyPoS is a feature-rich, modern Point of Sale system designed for small to medium-sized businesses. Built with React 18 and TypeScript, it provides a comprehensive solution for retail operations including inventory management, sales processing, analytics, and business intelligence.

The system features a **modular architecture** with a dedicated component library, static marketing pages, and a localStorage-based database simulation that enables offline functionality and rapid prototyping.

### Key Highlights

- **Complete POS Solution**: Full-featured point of sale with inventory, sales, and analytics
- **Modular Architecture**: 12 feature modules with clear separation of concerns
- **Design System**: Dedicated component library with live showcase
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Business Intelligence**: Advanced analytics with interactive charts
- **Developer Experience**: TypeScript, ESLint, modern tooling
- **Production Ready**: Professional architecture suitable for deployment

## Features

### Core POS Features

- **Point of Sale Interface**: Intuitive product browsing, cart management, and checkout
- **Inventory Management**: Add, edit, delete products with Excel import/export
- **Sales Processing**: Complete transaction workflows with multiple payment methods
- **Receipt Generation**: Digital and printable receipts with customizable templates
- **Customer Management**: Customer information capture and history tracking

### Mobile Sessions & Multi-Device Support

- **Desktop Cashier Device Sessions**: Transform any desktop/laptop into additional POS terminals via QR code
- **Mobile Barcode Sync**: Real-time inventory management using mobile device camera for barcode scanning
- **Mobile Checkout Sessions**: Complete mobile sales processing with customer service capabilities
- **Multi-Terminal Synchronization**: Real-time sync between multiple desktop POS stations
- **QR Code Authentication**: Secure 5-minute session authentication with temporary tokens
- **Cross-Device Data Sync**: Inventory, cart, and customer data synchronized across all connected devices

### Business Intelligence

- **Analytics Dashboard**: Real-time business KPIs and performance metrics
- **Interactive Charts**: Sales trends, revenue analytics using Recharts
- **Custom Reports**: Flexible report generation with data export (CSV, PDF)
- **Data Visualization**: Responsive charts and graphs with real-time data binding

### Advanced Features

- **Shop Creation Wizard**: 6-step guided setup with Framer Motion animations
- **Multi-step Import**: Excel data import with validation and preview
- **Payment Processing**: Multiple payment methods with transaction history
- **Mobile Sessions**: QR code-based mobile device integration for extended functionality
- **Settings Management**: Comprehensive shop and user configuration
- **Support Center**: Built-in help system and documentation

### User Experience

- **Modern UI/UX**: Clean, intuitive interface with consistent design system
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Animations**: Smooth transitions and micro-interactions
- **Accessibility**: WCAG compliant with keyboard navigation support

## Architecture

CeyPoS follows a **modern, modular architecture** designed for scalability and maintainability:

```
┌─────────────────────────────────────────────────────────┐
│                   CeyPoS System                         │
├─────────────────────────────────────────────────────────┤
│  Frontend Application (React + TypeScript)              │
│  ├─ Module System (12 Feature Modules)                  │
│  ├─ Component Library (Shared UI Components)            │
│  ├─ Static Marketing Pages (HTML Templates)             │
│  └─ localStorage Database (Shop-specific Data)          │
├─────────────────────────────────────────────────────────┤
│  Development Tools                                      │
│  ├─ Vite (Build Tool & Dev Server)                      │
│  ├─ TypeScript (Type Safety)                            │
│  ├─ Tailwind CSS (Styling Framework)                    │
│  └─ ESLint (Code Quality)                               │
└─────────────────────────────────────────────────────────┘
```

### Architecture Principles

- **Modular Design**: Each feature is a self-contained module
- **Component Reusability**: Shared component library for consistency
- **Type Safety**: Full TypeScript coverage with strict type checking
- **State Management**: React Context API for centralized state
- **Data Persistence**: localStorage with shop-specific namespacing

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.3.1 | Core UI library and component system |
| **TypeScript** | 5.5.3 | Type safety and developer experience |
| **Vite** | 5.4.2 | Build tool and development server |
| **Tailwind CSS** | 3.4.1 | Utility-first CSS framework |

### UI & Animation

| Technology | Version | Purpose |
|------------|---------|---------|
| **Framer Motion** | 12.15.0 | Animation library for transitions |
| **Lucide React** | 0.344.0 | Modern icon library |
| **Recharts** | 2.12.2 | Chart and data visualization library |
| **React Dropzone** | 14.3.8 | File upload and drag-drop functionality |

### Development Tools

| Technology | Version | Purpose |
|------------|---------|---------|
| **ESLint** | 9.9.1 | Code linting and quality assurance |
| **PostCSS** | 8.4.35 | CSS processing and optimization |
| **TypeScript ESLint** | 8.3.0 | TypeScript-specific linting rules |

### Data & State Management

- **React Context API**: Centralized state management
- **localStorage**: Client-side data persistence
- **Shop-specific namespacing**: Isolated data per business
- **WebSocket Integration**: Real-time synchronization for mobile sessions
- **QR Code Authentication**: Secure mobile device linking

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher (or **pnpm** 8.0.0+)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/ceypos.git
   cd ceypos
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   ```
   http://localhost:5173
   ```

### Component Library Development

To work on the component library:

```bash
cd component_library
npm install
npm run dev
```

The component library will be available at `http://localhost:3000`

### Production Build

```bash
npm run build
npm run preview
```

## Usage

### Getting Started

1. **Landing Page**: Start at the static marketing page (`pages/index.html`)
2. **Registration**: Click "Register" to create a new account
3. **Shop Setup**: Complete the 6-step shop creation wizard
4. **Dashboard**: Access the main POS dashboard with all modules

### Core Workflows

#### Setting Up Inventory

1. Navigate to **Inventory Management** module
2. **Manual Entry**: Add products one by one using the form
3. **Excel Import**: Use the import wizard for bulk product upload
   - Download the Excel template
   - Fill in product information
   - Upload and validate data
   - Review and confirm import

#### Processing Sales

1. Go to **Point of Sale** module
2. Browse or search for products
3. Add items to cart with quantities
4. Proceed to **Checkout** module
5. Enter customer information (optional)
6. Select payment method
7. Complete transaction and generate receipt

#### Viewing Analytics

1. Access **Analytics** module
2. View real-time business KPIs
3. Analyze sales trends with interactive charts
4. Generate custom reports in **Reports** module
5. Export data in various formats

### Mobile Sessions & Multi-Device Operations

CeyPoS supports three types of mobile sessions for extended functionality:

#### Setting Up Desktop Cashier Device Sessions

1. Navigate to **Sessions** module in main desktop application
2. Click **"Start Cashier Device Session"**
3. QR code displays on screen (5-minute expiration)
4. On additional desktop: Open browser → `ceypos.com/mobilesessions`
5. Scan QR code with webcam or mobile device
6. Additional desktop loads full POS interface in browser
7. Both terminals now sync in real-time with shared inventory and cart data

**Use Cases**: Multiple checkout lanes, event sales, staff training stations

#### Mobile Barcode Sync Sessions

1. Start **"Mobile Barcode Sync Session"** from Sessions module
2. Scan QR code with mobile device camera
3. Mobile interface opens with barcode scanning capability
4. Scan product barcodes to:
   - View existing product details and update stock
   - Add new products directly to inventory
   - Real-time sync with desktop inventory module

**Use Cases**: Inventory audits, stock receiving, product discovery

#### Mobile Checkout Sessions

1. Initiate **"Mobile Checkout Session"** from Sessions module
2. Mobile device scans QR code and opens checkout interface
3. Use mobile camera to scan customer products
4. Process payments and generate digital receipts
5. All transactions sync with main POS system

**Use Cases**: Tableside service, field sales, customer engagement

**Mobile Endpoint**: All sessions accessible via `ceypos.com/mobilesessions`

## Project Structure

```
CeyPoS/
├── 📄 README.md                    # Project documentation (this file)
├── 📄 package.json                 # Main project dependencies
├── 📄 vite.config.ts               # Vite build configuration
├── 📄 tailwind.config.js           # Tailwind CSS configuration
├── 📄 tsconfig.json                # TypeScript configuration
├── 📄 eslint.config.js             # ESLint configuration
├── 📄 index.html                   # Main HTML entry point
│
├── 📁 src/                         # Main application source
│   ├── 📄 App.tsx                  # Main React application
│   ├── 📄 main.tsx                 # React DOM entry point
│   ├── 📄 index.css                # Global styles and Tailwind imports
│   │
│   ├── 📁 components/              # React components
│   │   ├── 📁 layout/              # Layout components (MainLayout, Sidebar, TopBar)
│   │   ├── 📁 modules/             # Feature modules (12 modules)
│   │   ├── 📁 shopWizard/          # Shop creation wizard
│   │   └── 📁 ui/                  # Reusable UI components
│   │
│   ├── 📁 context/                 # React Context providers
│   │   ├── 📄 AppContext.tsx       # Main application state
│   │   └── 📄 ShopWizardContext.tsx # Shop creation state
│   │
│   ├── 📁 lib/                     # Utility libraries
│   │   └── 📄 db.ts                # localStorage database layer
│   │
│   └── 📁 types/                   # TypeScript type definitions
│       └── 📄 index.ts             # Core interface definitions
│
├── 📁 component_library/           # Dedicated component library
│   ├── 📄 package.json             # Component library dependencies
│   ├── 📄 vite.config.ts           # Vite config (port 3000)
│   └── 📁 src/                     # Component library source
│       ├── 📄 App.tsx              # Component showcase app
│       └── 📁 components/          # Shared UI components
│
├── 📁 pages/                       # Static marketing pages
│   ├── 📄 index.html               # Landing page
│   ├── 📄 about.html               # About page
│   ├── 📄 product.html             # Product features
│   ├── 📄 pricing.html             # Pricing information
│   ├── 📄 login.html               # User authentication
│   ├── 📁 css/                     # Stylesheets
│   ├── 📁 js/                      # JavaScript files
│   └── 📁 images/                  # Image assets (200+ files)
│
├── 📁 webmobile/                   # Mobile session endpoints
│   ├── 📁 barcodesyncsession/      # Mobile barcode scanning interface
│   ├── 📁 checkoutsession/         # Mobile checkout processing
│   └── 📄 mobilesessions.html      # Main mobile session entry point
│
└── 📁 database/                    # Reserved for future database files
```

### File Counts by Category

- **React Components**: 51 `.tsx` files
- **Static HTML Pages**: 12 `.html` files  
- **Image Assets**: 200+ optimized images
- **Configuration Files**: 12 build/dev configs
- **Documentation**: 5 comprehensive docs
- **Total**: 300+ files in organized structure

## Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 5173) |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint code quality checks |

### Code Quality

- **TypeScript**: Strict type checking enabled
- **ESLint**: Modern linting rules with React hooks support
- **Code Formatting**: Consistent code style enforcement
- **Import Organization**: Clean import/export patterns

### Development Guidelines

1. **Component Structure**: Follow the established module pattern
2. **Type Safety**: Always define TypeScript interfaces
3. **State Management**: Use React Context for shared state
4. **Styling**: Use Tailwind CSS utility classes
5. **File Organization**: Keep related files in appropriate directories

### Adding New Features

1. **Create Module Directory**: `src/components/modules/newFeature/`
2. **Define Types**: Add interfaces to `src/types/index.ts`
3. **Implement Component**: Create main component with TypeScript
4. **Update Router**: Add route to `ModuleRouter.tsx`
5. **Add Navigation**: Update sidebar navigation
6. **Write Tests**: Add component tests

## 🧩 Modules

CeyPoS features 12 specialized modules, each handling specific business functions:

### Core Business Modules

| Module | File | Purpose |
|--------|------|---------|
| **Dashboard** | `dashboard/Dashboard.tsx` | Business KPIs, sales charts, recent activity |
| **Point of Sale** | `pos/POS.tsx` | Product browsing, cart management, checkout |
| **Inventory** | `inventory/Inventory.tsx` | Product management, stock control, Excel import |
| **Sessions** | `sessions/Sessions.tsx` | Mobile device integration, QR code generation, multi-terminal management |
| **Analytics** | `analytics/Analytics.tsx` | Business intelligence, interactive charts |

### Transaction & Financial Modules

| Module | File | Purpose |
|--------|------|---------|
| **Checkout** | `checkout/Checkout.tsx` | Multi-step checkout process, customer info |
| **Receipts** | `receipts/Receipts.tsx` | Receipt generation, print/email functionality |
| **Payments** | `payments/Payments.tsx` | Payment processing, transaction history |
| **Reports** | `reports/Reports.tsx` | Custom reports, data export capabilities |

### Configuration & Support Modules

| Module | File | Purpose |
|--------|------|---------|
| **Settings** | `settings/Settings.tsx` | Shop configuration, user preferences |
| **Support** | `support/Support.tsx` | Help center, FAQ, documentation |
| **Import** | `import/Import.tsx` | Bulk data import, Excel processing |
| **Components** | `components/Components.tsx` | Component showcase, design system |

### Module Features

- **Lazy Loading**: Modules load on-demand for performance
- **Route Management**: Each module has dedicated routes
- **State Isolation**: Independent state management per module
- **Consistent UI**: Shared component library ensures consistency

## Component Library

The dedicated component library (`component_library/`) provides a **design system** and **shared UI components**.

### Features

- **Live Component Showcase**: Interactive demos of all components
- **Design System Documentation**: Colors, typography, spacing guidelines
- **Reusable Components**: Button, Card, Input, and form components
- **Responsive Design**: Mobile-first responsive components
- **Accessibility**: WCAG compliant components with keyboard navigation

### Development

```bash
cd component_library
npm run dev  # Starts on port 3000
```

### Library Components

- **Navigation**: Component library navigation and routing
- **Home**: Library overview and getting started guide
- **Components**: Interactive component showcase with examples
- **Footer**: Shared footer component with branding

## Static Marketing Pages

Professional marketing website (`pages/`) with 12 HTML pages:

### Main Pages

| Page | Purpose |
|------|---------|
| `index.html` | Landing page with hero section and features |
| `about.html` | Company information and mission |
| `product.html` | Product features and specifications |
| `pricing.html` | Subscription plans and pricing |
| `contact.html` | Contact form and location information |
| `blog.html` | Blog listing and articles |

### Authentication & Documentation

| Page | Purpose |
|------|---------|
| `login.html` | User authentication form |
| `register.html` | User registration form |
| `getting-started.html` | Setup instructions and tutorials |
| `licence.html` | Licensing information |
| `changelog.html` | Version history and updates |
| `style-guide.html` | Visual design system guide |

### Assets

- **200+ Optimized Images**: Professional graphics and illustrations
- **Responsive Design**: Mobile-first CSS with custom styling
- **Interactive Elements**: JavaScript-powered interactions
- **SEO Optimized**: Meta tags and semantic HTML structure

## 🗄Data Management

CeyPoS uses a **localStorage-based database simulation** for client-side data persistence.

### Database Architecture

```typescript
// Shop-specific namespacing
localStorage.setItem(`pos_shops_${shopId}`, JSON.stringify(shopData))
localStorage.setItem(`pos_products_${shopId}`, JSON.stringify(products))
localStorage.setItem(`pos_sales_${shopId}`, JSON.stringify(sales))
```

### Data Structures

#### Core Interfaces

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
  shopId: string;
  permissions: string[];
  avatarUrl?: string;
}

interface Shop {
  id: string;
  name: string;
  address: string;
  contact: string;
  logo?: string;
}

interface Product {
  id: string;
  shopId: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  barcode: string;
  imageUrl?: string;
}

interface Sale {
  id: string;
  shopId: string;
  customerInfo?: CustomerInfo;
  items: CartItem[];
  total: number;
  paymentMethod: 'cash' | 'card' | 'mobile';
  timestamp: string;
}
```

### Database Operations

- **CRUD Operations**: Create, Read, Update, Delete for all entities
- **Shop Isolation**: Data is namespaced by shop ID
- **Real-time Updates**: Changes reflect immediately across modules
- **Data Validation**: Type-safe operations with TypeScript
- **Export/Import**: Bulk data operations with Excel support

### Future Database Migration

The localStorage implementation provides a foundation for future database integration:

- **SQLite**: For desktop applications
- **PostgreSQL**: For production web deployments
- **MongoDB**: For NoSQL requirements
- **API Integration**: RESTful API endpoints ready for backend

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](./CONTRIBUTING.md) for details.

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**: Follow the development guidelines
4. **Run tests**: `npm run test`
5. **Lint your code**: `npm run lint`
6. **Commit changes**: `git commit -m 'Add amazing feature'`
7. **Push to branch**: `git push origin feature/amazing-feature`
8. **Create Pull Request**: Submit for review

### Code Standards

- **TypeScript**: All new code must be TypeScript
- **Component Pattern**: Follow established component structure
- **Testing**: Add tests for new features
- **Documentation**: Update README and component docs
- **Accessibility**: Ensure WCAG compliance

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](./LICENSE) file for details.

## Deployment

### Production Build

```bash
npm run build
```

### Deployment Options

- **Vercel**: Zero-config deployment for Vite projects
- **Netlify**: Static site hosting with form handling
- **AWS S3**: Static website hosting
- **GitHub Pages**: Free hosting for open source projects

### Environment Configuration

Create a `.env` file for environment variables:

```env
VITE_APP_NAME=CeyPoS
VITE_API_URL=https://api.yourserver.com
VITE_ANALYTICS_ID=your-analytics-id
```

## Support

- **Documentation**: [GitHub Wiki](https://github.com/your-username/ceypos/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-username/ceypos/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/ceypos/discussions)
- **Email**: support@ceypos.com

## Roadmap

### Phase 1 - Foundation 
- [x] Core POS functionality
- [x] Inventory management
- [x] Basic analytics
- [x] Component library

### Phase 2 - Advanced Features 
- [ ] Real database integration
- [ ] Multi-user support
- [ ] Advanced reporting
- [x] Mobile session architecture
- [x] QR code device linking
- [x] Multi-terminal synchronization

### Phase 3 - Enterprise 
- [ ] Multi-store management
- [ ] API marketplace
- [ ] Advanced analytics
- [ ] Enterprise deployment

---

<div align="center">

**Built with ♡ by the Ceynode**

[Website](https://ceypos.com) • [Documentation](https://docs.ceypos.com) • [Community](https://community.ceypos.com)

</div>
