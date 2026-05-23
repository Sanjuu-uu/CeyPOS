// Client helper for the ZeptoMail-backed email receipt endpoint.
// All credentials live on the server — this file only forwards sale snapshots.

const apiBase = (): string =>
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.VITE_API_BASE as string | undefined) ||
  "http://localhost:8080";

export interface EmailReceiptSaleItem {
  name?: string;
  quantity: number;
  price: number;
}

export interface EmailReceiptSale {
  id?: string;
  transactionCode?: string;
  receiptId?: string;
  receiptNumber?: string;
  customerInfo?: { name?: string; email?: string; phone?: string };
  shop?: { name?: string; address?: string; contact?: string };
  items: EmailReceiptSaleItem[];
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

export interface EmailReceiptResult {
  ok: boolean;
  token?: string;
  url?: string;
  error?: string;
  message?: string;
}

export async function sendEmailReceipt(
  shopId: string,
  sale: EmailReceiptSale,
  recipientEmail: string,
): Promise<EmailReceiptResult> {
  if (!shopId) return { ok: false, error: "missing_shop_id" };
  if (!recipientEmail) return { ok: false, error: "invalid_email" };

  try {
    const authToken = localStorage.getItem("pos_auth_token") || "";
    const response = await fetch(`${apiBase()}/api/email-receipts/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ shopId, sale, recipientEmail }),
    });

    let data: EmailReceiptResult = { ok: false };
    try {
      data = (await response.json()) as EmailReceiptResult;
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

export async function getEmailReceiptStatus(): Promise<{ configured: boolean }> {
  try {
    const response = await fetch(`${apiBase()}/api/email-receipts/status`);
    if (!response.ok) return { configured: false };
    const data = (await response.json()) as { configured?: boolean };
    return { configured: Boolean(data.configured) };
  } catch {
    return { configured: false };
  }
}
