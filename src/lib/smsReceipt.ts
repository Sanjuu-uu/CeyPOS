// Client helper for the FitSMS-backed SMS receipt endpoint.
// Credentials live exclusively on the server. This file only forwards the
// sale snapshot and the recipient phone (which is normalized server-side).

const apiBase = (): string =>
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.VITE_API_BASE as string | undefined) ||
  "http://localhost:8080";

export interface SmsReceiptSaleItem {
  name?: string;
  quantity: number;
  price: number;
}

export interface SmsReceiptSale {
  id?: string;
  transactionCode?: string;
  receiptId?: string;
  receiptNumber?: string;
  customerInfo?: { name?: string; email?: string; phone?: string };
  shop?: { name?: string; address?: string; contact?: string };
  items: SmsReceiptSaleItem[];
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

export interface SmsReceiptResult {
  ok: boolean;
  token?: string;
  url?: string;
  providerId?: string | null;
  estimatedSegments?: number;
  status?: string;
  error?: string;
  message?: string;
}

export async function sendSmsReceipt(
  shopId: string,
  sale: SmsReceiptSale,
  recipientPhone: string,
): Promise<SmsReceiptResult> {
  if (!shopId) return { ok: false, error: "missing_shop_id" };
  if (!recipientPhone) return { ok: false, error: "invalid_phone" };

  try {
    const authToken = localStorage.getItem("pos_auth_token") || "";
    const response = await fetch(`${apiBase()}/api/sms-receipts/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ shopId, sale, recipientPhone }),
    });

    let data: SmsReceiptResult = { ok: false };
    try {
      data = (await response.json()) as SmsReceiptResult;
    } catch {
      // fall through with default
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

export async function getSmsReceiptStatus(): Promise<{
  configured: boolean;
  balance?: unknown;
}> {
  try {
    const response = await fetch(`${apiBase()}/api/sms-receipts/status`);
    if (!response.ok) return { configured: false };
    const data = (await response.json()) as {
      configured?: boolean;
      balance?: unknown;
    };
    return { configured: Boolean(data.configured), balance: data.balance };
  } catch {
    return { configured: false };
  }
}
