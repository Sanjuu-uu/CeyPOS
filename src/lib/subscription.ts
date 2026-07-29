import { authFetch } from "./api";

export type PlanId = "basic" | "pro" | "max";
export type BillingPeriod = "monthly" | "annual";

export type SubscriptionStatus =
  | "pending"
  | "active"
  | "past_due"
  | "cancelled"
  | "completed"
  | "failed"
  | "chargedback";

export interface SavedCard {
  maskedNumber: string;
  holderName: string | null;
  expiry: string | null;
  method: string | null;
}

export interface SubscriptionState {
  planId: PlanId;
  billingPeriod: BillingPeriod;
  status: SubscriptionStatus;
  currency: string;
  amount: number;
  subscriptionId: string | null;
  nextChargeDate: string | null;
  installmentsPaid: number | null;
  startedAt: string | null;
  cancelledAt: string | null;
  statusMessage: string | null;
  card: SavedCard | null;
}

export interface BillingHistoryEntry {
  id: string;
  orderId: string | null;
  planId: PlanId | null;
  description: string | null;
  currency: string | null;
  amount: number | null;
  status: string;
  cardNo: string | null;
  cardMethod: string | null;
  paidAt: string;
}

export interface SubscriptionSnapshot {
  subscription: SubscriptionState | null;
  billingHistory: BillingHistoryEntry[];
  canManage: boolean;
}

interface CheckoutResponse {
  actionUrl: string;
  sandbox: boolean;
  fields: Record<string, string>;
}

async function parse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body as T;
}

export async function fetchSubscription(
  shopId: string,
  userEmail: string,
): Promise<SubscriptionSnapshot> {
  const params = new URLSearchParams({ shopId, userEmail });
  return parse<SubscriptionSnapshot>(
    await authFetch(`/api/subscription/status?${params.toString()}`),
  );
}

/**
 * Asks the server for a signed PayHere field set, then POSTs it as a real form
 * so the browser navigates to the gateway. The hash is generated server-side;
 * the merchant secret is never present in the client bundle.
 */
export async function startSubscriptionCheckout(
  shopId: string,
  userEmail: string,
  planId: PlanId,
  billingPeriod: BillingPeriod,
): Promise<void> {
  const checkout = await parse<CheckoutResponse>(
    await authFetch("/api/subscription/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId, userEmail, planId, billingPeriod }),
    }),
  );

  const form = document.createElement("form");
  form.method = "POST";
  form.action = checkout.actionUrl;
  form.style.display = "none";

  for (const [name, value] of Object.entries(checkout.fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value ?? "";
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}

export async function cancelSubscription(
  shopId: string,
  userEmail: string,
): Promise<void> {
  await parse(
    await authFetch("/api/subscription/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId, userEmail }),
    }),
  );
}

export async function retrySubscription(
  shopId: string,
  userEmail: string,
): Promise<void> {
  await parse(
    await authFetch("/api/subscription/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId, userEmail }),
    }),
  );
}

export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
