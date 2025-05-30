import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define all application routes and pages
const routes = {
  // Main React Application (Port 5173)
  mainApp: {
    home: 'http://localhost:5173/',
    description: 'Main CeyPoS React application entry point'
  },
  dashboard: {
    main: 'http://localhost:5173/dashboard',
    description: 'Central POS dashboard with KPI widgets and analytics',
    modules: [
      'http://localhost:5173/dashboard/pos',
      'http://localhost:5173/dashboard/inventory', 
      'http://localhost:5173/dashboard/analytics',
      'http://localhost:5173/dashboard/checkout',
      'http://localhost:5173/dashboard/receipts',
      'http://localhost:5173/dashboard/payments',
      'http://localhost:5173/dashboard/reports',
      'http://localhost:5173/dashboard/sessions',
      'http://localhost:5173/dashboard/settings',
      'http://localhost:5173/dashboard/support',
      'http://localhost:5173/dashboard/import'
    ]
  },
  shopWizard: {
    main: 'http://localhost:5173/shop-wizard',
    description: 'Interactive 6-step shop setup and configuration wizard'
  },
  // Standalone Component Library (Port 3000)
  componentLibrary: {
    main: 'http://localhost:3000/',
    home: 'http://localhost:3000/',
    components: 'http://localhost:3000/components',
    description: 'Standalone component library with global UI components',
    note: 'Separate Vite app - run with: cd component_library && npm run dev'
  },
  // Static Marketing Pages
  staticPages: {
    landing: 'http://localhost:5173/pages/index.html',
    about: 'http://localhost:5173/pages/about.html',
    contact: 'http://localhost:5173/pages/contact.html',
    pricing: 'http://localhost:5173/pages/pricing.html',
    product: 'http://localhost:5173/pages/product.html',
    blog: 'http://localhost:5173/pages/blog.html',
    login: 'http://localhost:5173/pages/login.html',
    register: 'http://localhost:5173/pages/register.html'
  }
};

// Route validation function
function validateRoutes() {
  const allRoutes = [];
  
  // Collect all routes
  allRoutes.push(routes.mainApp.home);
  allRoutes.push(routes.dashboard.main);
  allRoutes.push(routes.shopWizard.main);
  allRoutes.push(...routes.dashboard.modules);
  allRoutes.push(routes.componentLibrary.main);
  allRoutes.push(routes.componentLibrary.components);
  allRoutes.push(...Object.values(routes.staticPages));
  
  console.log(`\n✅ ${allRoutes.length} routes available`);
  return allRoutes;
}

// Simplified route display for demo
function displayQuickRoutes() {
  console.log(`   \x1b[34m${routes.shopWizard.main}\x1b[0m → Setup Wizard`);
  console.log(`   \x1b[34m${routes.dashboard.main}\x1b[0m → Dashboard`);
}

// Console output function
function displayRoutes() {
  displayQuickRoutes();
}

// Add route testing recommendations
function generateRoutingTests() {
  console.log('\n🧪 ROUTE TESTING CHECKLIST:');
  console.log('='.repeat(50));
  
  const testRoutes = [
    { name: 'Home', url: routes.mainApp.home, expected: 'Landing/Home page' },
    { name: 'Dashboard', url: routes.dashboard.main, expected: 'Dashboard with KPIs' },
    { name: 'Shop Wizard', url: routes.shopWizard.main, expected: 'Setup wizard' },
    { name: 'POS', url: routes.dashboard.modules[0], expected: 'POS interface' },
    { name: 'Inventory', url: routes.dashboard.modules[1], expected: 'Inventory management' }
  ];
  
  testRoutes.forEach((route, index) => {
    console.log(`${index + 1}. Test: ${route.name}`);
    console.log(`   URL: ${route.url}`);
    console.log(`   Expected: ${route.expected}`);
    console.log(`   Status: ❓ [Manual test required]`);
    console.log('');
  });
  
  console.log('💡 QUICK FIX SUGGESTIONS:');
  console.log('   - Remove any default redirects to /shop-wizard');
  console.log('   - Add exact="true" to Route definitions');
  console.log('   - Check for typos in route paths');
  console.log('   - Verify all components are properly exported');
  console.log('='.repeat(50));
}

// Add route debugging function
function debugRoutes() {
  console.log('\n🐛 For routing issues, check:');
  console.log('   1. App.tsx router configuration');
  console.log('   2. Dashboard component has <Outlet />');
  console.log('   3. Component imports and exports');
  console.log('   4. Clear browser cache\n');
}

// Export for use in package.json scripts
const args = process.argv.slice(2);

if (args.includes('--debug')) {
  // Keep debug functions but don't call them by default
  console.log('Debug mode - use for troubleshooting');
} else {
  displayRoutes();
}

export { routes, displayRoutes, displayQuickRoutes, validateRoutes, debugRoutes };
