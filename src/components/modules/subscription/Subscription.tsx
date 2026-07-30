import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { useApp } from "../../../context/AppContext";
import { getSearchHash } from "../../../lib/navigationSearch";

// Define the plan types
type PlanId = "basic" | "pro" | "max";
type BillingPeriod = "monthly" | "annual";
type ViewMode = "business" | "enterprise";

export const Subscription: React.FC = () => {
  const { memberScope, setCurrentModule } = useApp();

  // State for the MAIN toggle (Business vs. Enterprise)
  const [viewMode, setViewMode] = useState<ViewMode>("business");

  // State for the billing toggle (Monthly vs. Annual)
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");

  useEffect(() => {
    const applySearchHash = () => {
      const hash = getSearchHash();
      const tab = hash.startsWith("subscription:") ? hash.split(":")[1] : "";
      if (tab === "business" || tab === "enterprise") setViewMode(tab);
    };

    applySearchHash();
    window.addEventListener("hashchange", applySearchHash);
    return () => window.removeEventListener("hashchange", applySearchHash);
  }, []);

  const currentShopTier = memberScope?.plan?.tier ?? "free";
  const currentPlan: PlanId =
    currentShopTier === "plus"
      ? "pro"
      : currentShopTier === "pro"
        ? "max"
        : "basic";
  // --- BUSINESS PLANS (Basic, Pro, Max) ---
  const businessPlans = [
    {
      id: "basic",
      title: "Basic",
      price: { monthly: 9, annual: 90 },
      period: { monthly: "/ month", annual: "/ year" },
      description:
        "For new businesses needing one terminal and essential POS features.",
      features: [
        "1 Terminal",
        "1 Staff Account",
        "Basic Inventory",
        "Standard Support",
      ],
    },
    {
      id: "pro",
      title: "Pro",
      price: { monthly: 49, annual: 490 },
      period: { monthly: "/ month", annual: "/ year" },
      description:
        "For established businesses needing advanced inventory and analytics.",
      features: [
        "Up to 3 Terminals",
        "5 Staff Accounts",
        "Advanced Inventory",
        "Advanced Analytics",
        "Priority Support",
      ],
    },
    {
      id: "max",
      title: "Max",
      price: { monthly: 99, annual: 990 },
      period: { monthly: "/ month", annual: "/ year" },
      description:
        "For multi-location businesses needing unlimited staff and terminals.",
      features: [
        "Unlimited Terminals",
        "Unlimited Staff",
        "Multi-Location Sync",
        "API Access",
        "Dedicated Support",
      ],
    },
  ];

  // --- ENTERPRISE PLAN FEATURES ---
  const teamPlanFeatures = [
    "Everything in Pro, plus:",
    "5+ Terminals included",
    "Centralized billing and administration",
    "Advanced multi-terminal management",
    "Seat-based pricing for staff",
  ];

  const customPlanFeatures = [
    "Everything in Team, plus:",
    "Custom hardware integrations",
    "Single sign-on (SSO)",
    "Role-based access & audit logs",
    "Custom feature development",
    "24/7/365 Dedicated Support",
  ];

  const billingHistory: Array<{
    id: string;
    date: string;
    description: string;
    amount: string;
  }> = [];

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="space-y-5">
      <div className="page-action-row">
        <div className="page-actions">
          <Button variant="outline" onClick={() => setCurrentModule("support")}>
            Manage Billing
          </Button>
          <Button variant="secondary" onClick={() => setCurrentModule("support")}>
            Contact Support
          </Button>
        </div>
      </div>

      {/* TOP-LEVEL TOGGLE (Business / Enterprise) */}
      <div className="module-tabs">
          <button
            onClick={() => setViewMode("business")}
            className={`module-tab ${viewMode === "business" ? "module-tab-active" : ""}`}
          >
            Business
          </button>
          <button
            onClick={() => setViewMode("enterprise")}
            className={`module-tab ${viewMode === "enterprise" ? "module-tab-active" : ""}`}
          >
            Enterprise
          </button>
      </div>

      {/* --- CONDITIONAL CONTENT --- */}
      <AnimatePresence mode="wait">
        {/* === BUSINESS VIEW (Basic, Pro, Max) === */}
        {viewMode === "business" && (
          <motion.div
            key="business"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={cardVariants}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* --- CHANGE: Toggle REMOVED from here --- */}

            {/* Business Plans Grid (Basic, Pro, Max) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {businessPlans.map((plan) => {
                return (
                  <motion.div
                    key={plan.id}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card
                      className={`h-full ${
                        currentPlan === plan.id
                          ? "border-2 border-[#c5f542]"
                          : "border border-gray-100"
                      } hover:shadow-lg transition-all duration-200 flex flex-col`}
                    >
                      <div className="p-6 space-y-4 flex-grow">
                        <div className="section-header">
                          <h3 className="section-header-title">
                            {plan.title}
                          </h3>

                          <div className="section-header-actions">
                            <div className="section-segmented">
                              <button
                                onClick={() => setBillingPeriod("monthly")}
                                className={`section-segmented-option ${
                                  billingPeriod === "monthly"
                                    ? "section-segmented-option-active"
                                    : ""
                                }`}
                              >
                                Monthly
                              </button>
                              <button
                                onClick={() => setBillingPeriod("annual")}
                                className={`section-segmented-option ${
                                  billingPeriod === "annual"
                                    ? "section-segmented-option-active"
                                    : ""
                                }`}
                              >
                                Annual
                              </button>
                              <motion.div
                                layout
                                transition={{
                                  type: "spring",
                                  stiffness: 300,
                                  damping: 30,
                                }}
                                className={`section-segmented-indicator ${
                                  billingPeriod === "annual"
                                    ? "translate-x-full"
                                    : "translate-x-0"
                                }`}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Conditional Price Display */}
                        {billingPeriod === "monthly" ? (
                          // MONTHLY VIEW
                          <div className="flex items-baseline pt-2">
                            <span className="text-3xl font-bold text-gray-900">
                              ${plan.price.monthly}
                            </span>
                            <span className="text-gray-500 ml-1">/ month</span>
                          </div>
                        ) : (
                          // ANNUAL VIEW
                          <div className="pt-2">
                            <div className="flex items-baseline">
                              <span className="text-3xl font-bold text-gray-900">
                                {/* Calculate monthly equivalent */}$
                                {(plan.price.annual / 12).toFixed(2)}
                              </span>
                              <span className="text-lg font-normal text-gray-400 line-through ml-2">
                                ${plan.price.monthly}
                              </span>
                              <span className="text-gray-500 ml-1">
                                / month
                              </span>
                            </div>
                            {/* "Save 20%" and "Billed as" text */}
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-green-600 text-xs font-medium px-2 py-0.5 bg-green-50 rounded-full">
                                Save 20%
                              </span>
                              <p className="text-xs text-gray-500">
                                Billed as ${plan.price.annual} per year
                              </p>
                            </div>
                          </div>
                        )}

                        <p className="text-gray-600 text-sm leading-relaxed pt-2">
                          {plan.description}
                        </p>
                        <ul className="space-y-2 pt-4">
                          {plan.features.map((feature, index) => (
                            <li
                              key={index}
                              className="flex items-center gap-2 text-xs text-gray-600"
                            >
                              <div
                                className="w-1.5 h-1.5 rounded-full bg-[#c5f542]"
                              ></div>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-6 pt-0">
                        <Button
                          variant={
                            currentPlan === plan.id ? "secondary" : "primary"
                          }
                          onClick={() => setCurrentModule("support")}
                          className="w-full mt-4"
                          disabled={currentPlan === plan.id}
                          style={
                            currentPlan !== plan.id
                              ? {
                                  backgroundColor: "#c5f542",
                                  color: "black",
                                  border: "none",
                                }
                              : {}
                          }
                        >
                          {currentPlan === plan.id
                            ? "Current Plan"
                            : "Talk to Sales"}
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* === ENTERPRISE VIEW (Team, Custom) === */}
        {viewMode === "enterprise" && (
          <motion.div
            key="enterprise"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={cardVariants}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Team & Enterprise Grid (2 Cards) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Team Card */}
              <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
                <Card className="h-full hover:shadow-lg transition-all duration-200 flex flex-col">
                  <div className="p-6 space-y-4 flex-grow">
                    <h3 className="font-semibold text-xl text-gray-900">
                      Team
                    </h3>
                    <p className="text-gray-600 text-sm">
                      For growing businesses needing multiple terminals and
                      centralized management.
                    </p>
                    <ul className="space-y-2 pt-4">
                      {teamPlanFeatures.map((feature, index) => (
                        <li
                          key={index}
                          className="flex items-center gap-2 text-xs text-gray-600"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-[#c5f542]"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-6 pt-0">
                    <Button
                      variant="primary"
                      className="w-full mt-4"
                      onClick={() => setCurrentModule("support")}
                      style={{
                        backgroundColor: "#c5f542", // Blue, matching Sessions style
                        color: "black",
                        border: "none",
                      }}
                    >
                      Talk to Sales
                    </Button>
                  </div>
                </Card>
              </motion.div>

              {/* Custom Card */}
              <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
                <Card className="h-full hover:shadow-lg transition-all duration-200 flex flex-col">
                  <div className="p-6 space-y-4 flex-grow">
                    <h3 className="font-semibold text-xl text-gray-900">
                      Custom
                    </h3>
                    <p className="text-gray-600 text-sm">
                      For large-scale operations with custom hardware, API, and
                      support needs.
                    </p>
                    <ul className="space-y-2 pt-4">
                      {customPlanFeatures.map((feature, index) => (
                        <li
                          key={index}
                          className="flex items-center gap-2 text-xs text-gray-600"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-[#c5f542]"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* --- THIS IS THE UPDATED BUTTON --- */}
                  <div className="p-6 pt-0">
                    <Button
                      variant="primary"
                      className="w-full mt-4"
                      onClick={() => setCurrentModule("support")}
                      style={{
                        backgroundColor: "#c5f542", // Purple, matching icon theme and Sessions style
                        color: "black",
                        border: "none",
                      }}
                    >
                      Contact Sales
                    </Button>
                  </div>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Billing History (Stays at the bottom) */}
      <Card title="Billing History">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#f3f4f6]">
              <tr>
                <th className="px-3 py-3 text-left text-[11px] font-medium uppercase tracking-[0.1em] text-[#666661]">
                  Date
                </th>
                <th className="px-3 py-3 text-left text-[11px] font-medium uppercase tracking-[0.1em] text-[#666661]">
                  Description
                </th>
                <th className="px-3 py-3 text-left text-[11px] font-medium uppercase tracking-[0.1em] text-[#666661]">
                  Amount
                </th>
                <th className="px-3 py-3 text-right text-[11px] font-medium uppercase tracking-[0.1em] text-[#666661]">
                  Invoice
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {billingHistory.length > 0 ? (
                billingHistory.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.date}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.description}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.amount}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-right text-sm">
                      <Button
                        className="text-blue-600 p-0 h-auto hover:text-blue-800"
                      >
                        Download
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-4 text-sm text-center text-gray-500"
                  >
                    No billing history synced yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Subscription;
