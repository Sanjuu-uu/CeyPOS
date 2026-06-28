import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { Crown, Zap, Package, FileText, Users, Briefcase } from "lucide-react";
import { useApp } from "../../../context/AppContext";

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

  const currentShopTier = memberScope?.plan?.tier ?? "free";
  const currentPlan: PlanId =
    currentShopTier === "plus"
      ? "pro"
      : currentShopTier === "pro"
        ? "max"
        : "basic";
  const registerLimit = memberScope?.plan?.maxRegisterTerminals ?? 0;
  const teamLimit = memberScope?.plan?.maxTeamMembers ?? 1;
  const proTeamSeats = memberScope?.plan?.proTeamSeats ?? 0;

  // --- BUSINESS PLANS (Basic, Pro, Max) ---
  const businessPlans = [
    {
      id: "basic",
      title: "Basic",
      price: { monthly: 9, annual: 90 },
      period: { monthly: "/ month", annual: "/ year" },
      description:
        "For new businesses needing one terminal and essential POS features.",
      icon: <Package size={24} />,
      color: "#00C49F", // Yellow
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
      icon: <Zap size={24} />,
      color: " #b39efc", // Green
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
      icon: <Crown size={24} />,
      color: "#ef94b5", // Blue
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
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="heading-h2">Plans that grow with you</h1>
        <p className="text-gray-600 mt-2">
          Manage your subscription and billing.
        </p>
      </div>

      {/* "Your Current Plan" Card */}
      <Card className="border border-gray-100">
        <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="font-semibold text-gray-900">Your Current Plan</h2>
            <p className="text-gray-600 text-sm mt-1">
              You are currently on the <span className="font-medium capitalize">{currentShopTier}</span> tier.
            </p>
            <p className="text-gray-500 text-xs mt-2">
              Register terminals: {registerLimit} · Team members: {teamLimit} · Pro team seats: {proTeamSeats}
            </p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-1/2 sm:w-auto"
              onClick={() => setCurrentModule("support")}
            >
              Manage Billing
            </Button>
            <Button
              variant="secondary"
              className="w-1/2 sm:w-auto text-red-600 hover:bg-red-50 hover:border-red-200"
              onClick={() => setCurrentModule("support")}
            >
              Contact Support
            </Button>
          </div>
        </div>
      </Card>

      {/* TOP-LEVEL TOGGLE (Business / Enterprise) */}
      <div className="flex justify-center">
        <div className="relative flex w-full max-w-xs items-center rounded-lg bg-gray-100 p-1 border border-transparent hover:border-gray-300 transition-colors">
          <button
            onClick={() => setViewMode("business")}
            className={`relative z-10 h-9 w-1/2 rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              viewMode === "business"
                ? "text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Business
          </button>
          <button
            onClick={() => setViewMode("enterprise")}
            className={`relative z-10 h-9 w-1/2 rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              viewMode === "enterprise"
                ? "text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Enterprise
          </button>
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`absolute left-1 top-1 h-9 w-1/2 rounded-md bg-white shadow-sm ${
              viewMode === "enterprise"
                ? "translate-x-[calc(100%-4px)]"
                : "translate-x-0"
            }`}
          />
        </div>
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
                        {/* --- CHANGE: Toggle ADDED back here --- */}
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div
                              className="p-2 rounded-lg w-fit"
                              style={{ backgroundColor: `${plan.color}20` }}
                            >
                              <div style={{ color: plan.color }}>
                                {plan.icon}
                              </div>
                            </div>
                            <h3 className="font-semibold text-lg text-gray-900">
                              {plan.title}
                            </h3>
                          </div>

                          {/* --- FIX: Re-engineered Toggle --- */}
                          <div className="relative flex-shrink-0 flex w-36 items-center rounded-lg bg-gray-100 p-1 border border-transparent hover:border-gray-300 transition-colors">
                            <button
                              onClick={() => setBillingPeriod("monthly")}
                              className={`relative z-10 h-7 w-1/2 rounded-md px-1 py-0 text-xs text-center font-medium transition-colors ${
                                billingPeriod === "monthly"
                                  ? "text-gray-900"
                                  : "text-gray-500 hover:text-gray-700"
                              }`}
                            >
                              Monthly
                            </button>
                            <button
                              onClick={() => setBillingPeriod("annual")}
                              className={`relative z-10 h-7 w-1/2 rounded-md px-1 py-0 text-xs text-center font-medium transition-colors ${
                                billingPeriod === "annual"
                                  ? "text-gray-900"
                                  : "text-gray-500 hover:text-gray-700"
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
                              className={`absolute left-0.5 top-0.5 h-8 w-1/2 rounded-md bg-white shadow-sm ${
                                billingPeriod === "annual"
                                  ? "translate-x-full"
                                  : "translate-x-0"
                              }`}
                            />
                          </div>
                          {/* --- END FIX --- */}
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
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: plan.color }}
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
                                  backgroundColor: plan.color,
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
                <Card className="h-full border border-gray-100 hover:shadow-lg transition-all duration-200 flex flex-col">
                  <div className="p-6 space-y-4 flex-grow">
                    <div className="p-3 rounded-lg w-fit bg-blue-100">
                      <Users size={32} className="text-blue-600" />
                    </div>
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
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
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
                <Card className="h-full border border-gray-100 hover:shadow-lg transition-all duration-200 flex flex-col">
                  <div className="p-6 space-y-4 flex-grow">
                    <div className="p-3 rounded-lg w-fit bg-purple-100">
                      <Briefcase size={32} className="text-purple-600" />
                    </div>
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
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-600"></div>
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
      <Card title="Billing History" className="border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                        icon={<FileText size={14} />}
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
