import React from "react";
import { useApp } from "../../context/AppContext";

// Import all module components
import { Dashboard } from "./dashboard/Dashboard";
import { POS } from "./pos/POS";
import { Inventory } from "./inventory/Inventory";
import { Analytics } from "./analytics/Analytics";
import { Subscription } from "./subscription/Subscription";
import { Receipts } from "./receipts/Receipts";
import { Payments } from "./payments/Payments";
import { Reports } from "./reports/Reports";
import { Settings } from "./settings/Settings";
import { Support } from "./support/Support";
import { Import } from "./import/Import";
import { Sessions } from "./sessions/Sessions";
import { BusinessRules } from "./business/BusinessRules"; // Import the new component

export const ModuleRouter: React.FC = () => {
  const { currentModule } = useApp();

  // Return the appropriate module component based on currentModule
  switch (currentModule) {
    case "dashboard":
      return <Dashboard />;
    case "pos":
      return <POS />;
    case "inventory":
      return <Inventory />;
    case "analytics":
      return <Analytics />;
    case "Subscription":
      return <Subscription />;
    case "receipts":
      return <Receipts />;
    case "payments":
      return <Payments />;
    case "reports":
      return <Reports />;
    case "settings":
      return <Settings />;
    case "support":
      return <Support />;
    case "import":
      return <Import />;
    case "sessions":
      return <Sessions />;
    case "business": // Add route
      return <BusinessRules />;
    default:
      return <Dashboard />;
  }
};