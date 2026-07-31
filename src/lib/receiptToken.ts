import { API_BASE, authFetch } from "./api";
import { API_ROUTES } from "./apiRoutes";
import {
  getTerminalAuthPayload,
  normalizeTerminalShopId,
} from "./terminalAuthPayload";

// Client helper for the token-mint endpoint. Used by the print flow to
// get a stable public /r/<token> URL that can be encoded into a QR
// code on the printed receipt. Idempotent on (shopId, transactionCode)
// so calling this after email/SMS has already sent reuses the same URL.

export interface MintTokenSale {
  id?: string;
  transactionCode?: string;
  receiptId?: string;
  receiptNumber?: string;
  customerInfo?: { name?: string; email?: string; phone?: string };
  shop?: { name?: string; address?: string; contact?: string };
  items: Array<{ name?: string; quantity: number; price: number }>;
  subtotal?: number;
  tax?: number;
  discount?: number;
  total: number;
  paymentMethod?: string;
  currency?: string;
  timestamp?: string;
  pointsEarned?: number;
  pointsRedeemed?: number;
}

export interface MintTokenResult {
  ok: boolean;
  token?: string;
  url?: string;
  error?: string;
  message?: string;
}

export async function mintReceiptToken(
  shopId: string,
  sale: MintTokenSale,
): Promise<MintTokenResult> {
  if (!shopId) return { ok: false, error: "missing_shop_id" };
  try {
    const rawShopId = normalizeTerminalShopId(shopId);
    const terminalAuth = getTerminalAuthPayload(shopId);
    const response = await authFetch(`${API_BASE}${API_ROUTES.receipts.mintToken}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ shopId: rawShopId, sale, ...terminalAuth }),
    });
    let data: MintTokenResult = { ok: false };
    try {
      data = (await response.json()) as MintTokenResult;
    } catch {
      // fall through
    }
    if (!response.ok) {
      return {
        ok: false,
        error: data.error || `http_${response.status}`,
        message: data.message,
      };
    }
    return data;
  } catch (err: unknown) {
    return {
      ok: false,
      error: "network_error",
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
