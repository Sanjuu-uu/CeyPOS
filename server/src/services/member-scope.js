const PLAN_DEFAULTS = {
  free: {
    maxRegisterTerminals: 0,
    maxTeamMembers: 1,
    proTeamSeats: 0,
    aiEnabled: false,
    aiMode: null,
  },
  plus: {
    maxRegisterTerminals: 3,
    maxTeamMembers: 10,
    proTeamSeats: 0,
    aiEnabled: true,
    aiMode: "lite",
  },
  pro: {
    maxRegisterTerminals: 20,
    maxTeamMembers: 50,
    proTeamSeats: 5,
    aiEnabled: true,
    aiMode: "agent",
  },
};

export function normalizePlanTier(value) {
  const tier = String(value || "free").toLowerCase();
  if (tier === "plus" || tier === "pro") return tier;
  return "free";
}

export function getShopPlanLimits(shopMetaRow = {}) {
  const tier = normalizePlanTier(shopMetaRow.plan_tier);
  const defaults = PLAN_DEFAULTS[tier];
  return {
    tier,
    maxRegisterTerminals: Number(shopMetaRow.max_register_terminals ?? defaults.maxRegisterTerminals),
    maxTeamMembers: Number(shopMetaRow.max_team_members ?? defaults.maxTeamMembers),
    proTeamSeats: Number(shopMetaRow.pro_team_seats ?? defaults.proTeamSeats),
    aiEnabled: Boolean(Number(shopMetaRow.ai_enabled ?? (defaults.aiEnabled ? 1 : 0))),
    aiMode: shopMetaRow.ai_mode || defaults.aiMode,
  };
}

export function buildMemberScope(member, terminal, shopPlan) {
  const role = String(member?.role || "cashier").toLowerCase();
  const terminalType = terminal?.terminal_type || null;
  const proTeamSeat = Boolean(Number(member?.pro_team_seat || 0));
  const plan = shopPlan || getShopPlanLimits();

  const baseModules = {
    pos: false,
    inventory: false,
    sessions: false,
    analytics: false,
    aiChat: false,
    settings: false,
    team: false,
    reports: false,
    payments: false,
    receipts: false,
    business: false,
    subscription: false,
  };

  if (role === "owner") {
    return {
      role: "owner",
      terminalType,
      memberId: member?.member_id || null,
      displayName: member?.display_name || member?.email || "Owner",
      proTeamSeat: true,
      plan,
      modules: {
        pos: true,
        inventory: true,
        sessions: true,
        analytics: plan.aiEnabled,
        aiChat: plan.aiEnabled ? "shop" : false,
        settings: true,
        team: true,
        reports: true,
        payments: true,
        receipts: true,
        business: true,
        subscription: true,
      },
    };
  }

  if (role === "manager") {
    return {
      role: "manager",
      terminalType,
      memberId: member?.member_id || null,
      displayName: member?.display_name || member?.email || "Manager",
      proTeamSeat,
      plan,
      modules: {
        pos: true,
        inventory: true,
        sessions: true,
        analytics: true,
        aiChat: false,
        settings: false,
        team: true,
        reports: true,
        payments: true,
        receipts: true,
        business: true,
        subscription: false,
      },
    };
  }

  return {
    role: "cashier",
    terminalType,
    memberId: member?.member_id || null,
    displayName: member?.display_name || member?.email || "Cashier",
    proTeamSeat,
    plan,
    modules: {
      pos: true,
      inventory: true,
      sessions: plan.tier !== "free",
      analytics: proTeamSeat,
      aiChat: proTeamSeat && plan.aiEnabled ? "self" : false,
      settings: false,
      team: false,
      reports: proTeamSeat,
      payments: false,
      receipts: true,
      business: false,
      subscription: false,
    },
  };
}

export function scopeAllows(scope, moduleKey) {
  if (!scope?.modules) return false;
  const value = scope.modules[moduleKey];
  return value === true || typeof value === "string";
}

export function scopeAllowsAi(scope) {
  const ai = scope?.modules?.aiChat;
  return ai === "shop" || ai === "self";
}
