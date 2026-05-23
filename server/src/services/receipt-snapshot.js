// Shared snapshot builder used by every receipt-delivery channel (email, SMS,
// future webhooks). Keeps validation/clamping in one place so both routes
// store identical data in the receipt-token store.

export function buildReceiptSnapshot(sale, shopId) {
  const items = Array.isArray(sale?.items)
    ? sale.items.slice(0, 500).map((it) => ({
        name: String(it?.name || "").slice(0, 200),
        quantity: Number(it?.quantity) || 0,
        price: Number(it?.price ?? it?.unit_price) || 0,
      }))
    : [];

  return {
    shopId,
    shop: sale?.shop
      ? {
          name: sale.shop.name ? String(sale.shop.name).slice(0, 200) : "",
          address: sale.shop.address
            ? String(sale.shop.address).slice(0, 300)
            : "",
          contact: sale.shop.contact
            ? String(sale.shop.contact).slice(0, 200)
            : "",
        }
      : null,
    customerInfo: sale?.customerInfo
      ? {
          name: sale.customerInfo.name
            ? String(sale.customerInfo.name).slice(0, 200)
            : "",
          email: sale.customerInfo.email
            ? String(sale.customerInfo.email).toLowerCase().slice(0, 254)
            : "",
          phone: sale.customerInfo.phone
            ? String(sale.customerInfo.phone).slice(0, 40)
            : "",
        }
      : null,
    items,
    subtotal: Number(sale?.subtotal ?? sale?.total) || 0,
    tax: Number(sale?.tax) || 0,
    discount: Number(sale?.discount) || 0,
    total: Number(sale?.total) || 0,
    paymentMethod: String(sale?.paymentMethod || "cash").slice(0, 32),
    currency: String(sale?.currency || "$").slice(0, 8),
    timestamp: sale?.timestamp || new Date().toISOString(),
    receiptNumber: String(
      sale?.receiptNumber || sale?.transactionCode || sale?.id || "",
    ).slice(0, 64),
    pointsEarned: Number(sale?.pointsEarned) || 0,
    pointsRedeemed: Number(sale?.pointsRedeemed) || 0,
  };
}

export function formatInvoiceNumber(raw) {
  const original = String(raw ?? "");
  if (/^INV-/i.test(original)) return original.toUpperCase();
  const cleaned = original.replace(/[^a-zA-Z0-9]/g, "");
  if (!cleaned) return "INV-00000000";
  return `INV-${cleaned.slice(-8).toUpperCase().padStart(8, "0")}`;
}

export function resolvePublicBaseUrl(req) {
  const fromEnv = (process.env.PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  const proto = req.get("x-forwarded-proto") || req.protocol || "http";
  const host = req.get("x-forwarded-host") || req.get("host");
  return `${proto}://${host}`;
}
