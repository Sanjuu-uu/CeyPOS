export type MemberRole = "owner" | "manager" | "cashier";

export type AiChatScope = false | "self" | "shop";

export interface MemberScopeModules {
  pos: boolean;
  inventory: boolean;
  sessions: boolean;
  analytics: boolean;
  aiChat: AiChatScope;
  settings: boolean;
  team: boolean;
  reports: boolean;
  payments: boolean;
  receipts: boolean;
  business: boolean;
  subscription: boolean;
}

export interface MemberScope {
  role: MemberRole;
  terminalType: "primary" | "register" | null;
  memberId: string | null;
  displayName: string;
  proTeamSeat: boolean;
  plan: {
    tier: "free" | "plus" | "pro";
    maxRegisterTerminals: number;
    maxTeamMembers: number;
    proTeamSeats: number;
    aiEnabled: boolean;
    aiMode: string | null;
  };
  modules: MemberScopeModules;
}

export interface ShopMemberInfo {
  memberId: string;
  email: string;
  displayName: string;
  role: MemberRole;
  status: string;
  proTeamSeat: boolean;
}

export interface TerminalInfo {
  terminalId: string;
  terminalType: "primary" | "register";
  label: string;
  status: string;
  lastSeenAt?: string | null;
}

export interface ShopContextResponse {
  ok: boolean;
  shopId: string;
  shopName?: string;
  member: ShopMemberInfo;
  terminal: TerminalInfo | null;
  scope: MemberScope;
}

export interface TerminalSessionCredentials {
  shopId: string;
  terminalId: string;
  terminalToken: string;
  terminalType: "primary" | "register";
  label?: string;
}
