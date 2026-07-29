// Single source of truth for what a subscriber gets and what they pay.
//
// `tier` maps each customer-facing plan onto the plan_tier values already
// stored in shop_meta (free/plus/pro), so no tenant database needs migrating.
// The explicit limit fields are written to shop_meta alongside the tier and
// take precedence over the defaults in member-scope.js.
//
// Prices are in BILLING_CURRENCY minor-unit-free decimals (LKR by default).

export const BILLING_CURRENCY = process.env.PAYHERE_CURRENCY || "LKR";

const UNLIMITED = 9999;

const PLAN_CATALOG = {
  basic: {
    id: "basic",
    title: "Basic",
    tier: "plus",
    price: { monthly: 2900, annual: 29000 },
    limits: {
      maxRegisterTerminals: 1,
      maxTeamMembers: 1,
      proTeamSeats: 0,
      aiEnabled: false,
      aiMode: null,
    },
  },
  pro: {
    id: "pro",
    title: "Pro",
    tier: "plus",
    price: { monthly: 14900, annual: 149000 },
    limits: {
      maxRegisterTerminals: 3,
      maxTeamMembers: 5,
      proTeamSeats: 2,
      aiEnabled: true,
      aiMode: "lite",
    },
  },
  max: {
    id: "max",
    title: "Max",
    tier: "pro",
    price: { monthly: 29900, annual: 299000 },
    limits: {
      maxRegisterTerminals: UNLIMITED,
      maxTeamMembers: UNLIMITED,
      proTeamSeats: UNLIMITED,
      aiEnabled: true,
      aiMode: "agent",
    },
  },
};

// PayHere `recurrence` strings. `duration: "Forever"` means PayHere keeps
// charging until the subscription is explicitly cancelled.
const RECURRENCE = {
  monthly: "1 Month",
  annual: "1 Year",
};

export function isValidPlanId(planId) {
  return Object.prototype.hasOwnProperty.call(PLAN_CATALOG, String(planId));
}

export function isValidBillingPeriod(period) {
  return period === "monthly" || period === "annual";
}

export function getPlan(planId) {
  const plan = PLAN_CATALOG[String(planId)];
  if (!plan) throw new Error(`Unknown plan: ${planId}`);
  return plan;
}

export function listPlans() {
  return Object.values(PLAN_CATALOG).map((plan) => ({
    id: plan.id,
    title: plan.title,
    price: plan.price,
    currency: BILLING_CURRENCY,
    limits: plan.limits,
  }));
}

export function getPlanPricing(planId, billingPeriod) {
  const plan = getPlan(planId);
  if (!isValidBillingPeriod(billingPeriod)) {
    throw new Error(`Unknown billing period: ${billingPeriod}`);
  }
  return {
    plan,
    amount: plan.price[billingPeriod],
    currency: BILLING_CURRENCY,
    recurrence: RECURRENCE[billingPeriod],
    duration: "Forever",
  };
}

/**
 * Applies a plan's entitlements to shop_meta. Called only after a payment
 * notification has been cryptographically verified.
 */
export function applyPlanToShop(db, shopId, planId) {
  const { tier, limits } = getPlan(planId);
  db.prepare(
    `UPDATE shop_meta
        SET plan_tier = ?,
            max_register_terminals = ?,
            max_team_members = ?,
            pro_team_seats = ?,
            ai_enabled = ?,
            ai_mode = ?
      WHERE shop_id = ?`,
  ).run(
    tier,
    limits.maxRegisterTerminals,
    limits.maxTeamMembers,
    limits.proTeamSeats,
    limits.aiEnabled ? 1 : 0,
    limits.aiMode,
    shopId,
  );
}

/**
 * Drops a shop back to the free tier — used when a subscription is cancelled,
 * completed, or has definitively failed.
 */
export function revertShopToFree(db, shopId) {
  db.prepare(
    `UPDATE shop_meta
        SET plan_tier = 'free',
            max_register_terminals = 0,
            max_team_members = 1,
            pro_team_seats = 0,
            ai_enabled = 0,
            ai_mode = NULL
      WHERE shop_id = ?`,
  ).run(shopId);
}
