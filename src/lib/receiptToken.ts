// Client helper for the token-mint endpoint. Used by the print flow to
// get a stable public /r/<token> URL that can be encoded into a QR
// code on the printed receipt. Idempotent on (shopId, transactionCode)
// so calling this after email/SMS has already sent reuses the same URL.

const apiBase = (): string =>
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.VITE_API_BASE as string | undefined) ||
  "http://localhost:8080";

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
    const authToken = localStorage.getItem("pos_auth_token") || "";
    const response = await fetch(`${apiBase()}/api/receipts/mint-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ shopId, sale }),
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
