import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Printer,
  Download,
  Receipt as ReceiptIcon,
  Loader2,
} from "lucide-react";
import { API_BASE } from "../../../lib/api";
import { API_ROUTES } from "../../../lib/apiRoutes";

interface PublicReceiptItem {
  name?: string;
  quantity: number;
  price: number;
}

interface PublicReceipt {
  shop?: { name?: string; address?: string; contact?: string };
  customerInfo?: { name?: string; email?: string; phone?: string };
  items: PublicReceiptItem[];
  subtotal?: number;
  tax?: number;
  discount?: number;
  total: number;
  paymentMethod?: string;
  currency?: string;
  timestamp?: string;
  receiptNumber?: string;
}

const formatDateTime = (iso?: string): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};

const formatInvoiceNumber = (raw?: string): string => {
  const original = String(raw ?? "");
  if (/^INV-/i.test(original)) return original.toUpperCase();
  const cleaned = original.replace(/[^a-zA-Z0-9]/g, "");
  if (!cleaned) return "INV-00000000";
  return `INV-${cleaned.slice(-8).toUpperCase().padStart(8, "0")}`;
};

export const PublicReceiptView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [receipt, setReceipt] = useState<PublicReceipt | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const receiptBodyRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = async () => {
    if (!receiptBodyRef.current || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    try {
      // Lazy-load html2pdf.js so the ~600KB bundle is only fetched when
      // the user actually clicks Save as PDF.
      const html2pdf = (await import("html2pdf.js")).default as (
        ...args: unknown[]
      ) => {
        set: (opts: Record<string, unknown>) => {
          from: (el: HTMLElement) => { save: () => Promise<void> };
        };
      };
      const invoice = formatInvoiceNumber(receipt?.receiptNumber);
      await html2pdf()
        .set({
          margin: [12, 12, 12, 12],
          filename: `receipt-${invoice}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] },
        })
        .from(receiptBodyRef.current)
        .save();
    } catch (err) {
      console.error("PDF generation failed:", err);
      // Fall back to native print dialog so the customer still has a way out.
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) {
        setState("error");
        return;
      }
      try {
        const res = await fetch(`${API_BASE}${API_ROUTES.receipts.publicByToken(token)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          ok?: boolean;
          receipt?: PublicReceipt;
        };
        if (cancelled) return;
        if (data?.ok && data.receipt) {
          setReceipt(data.receipt);
          setState("ok");
        } else {
          setState("error");
        }
      } catch {
        if (!cancelled) setState("error");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (state === "error" || !receipt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-xl border border-gray-200 max-w-md text-center shadow-sm">
          <ReceiptIcon size={40} className="mx-auto text-gray-300 mb-3" />
          <h1 className="text-lg font-semibold text-gray-800 mb-1">
            Receipt unavailable
          </h1>
          <p className="text-sm text-gray-500">
            This link may be invalid or has been removed.
          </p>
        </div>
      </div>
    );
  }

  const currency = receipt.currency || "$";
  const fmt = (n: number) => `${currency}${(Number(n) || 0).toFixed(2)}`;
  const subtotal = receipt.subtotal ?? receipt.total;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 print:bg-white print:p-0">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-end gap-2 mb-3 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 px-3 py-2 rounded-lg"
          >
            <Printer size={16} /> Print
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="flex items-center gap-2 bg-gray-900 hover:bg-black disabled:bg-gray-700 disabled:cursor-wait text-sm font-semibold text-[#ecff76] px-3 py-2 rounded-lg transition-colors"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Download size={16} /> Save as PDF
              </>
            )}
          </button>
        </div>

        <div
          ref={receiptBodyRef}
          className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 shadow-sm print:border-0 print:shadow-none"
        >
          <div className="text-center mb-6">
            <h1 className="text-xl font-semibold text-gray-900">
              {receipt.shop?.name || "Your store"}
            </h1>
            {receipt.shop?.address && (
              <p className="text-sm text-gray-500">{receipt.shop.address}</p>
            )}
            {receipt.shop?.contact && (
              <p className="text-sm text-gray-500">{receipt.shop.contact}</p>
            )}
          </div>

          <div className="flex justify-between text-xs text-gray-500 border-y border-dashed border-gray-200 py-3 mb-4">
            <span>Receipt #{receipt.receiptNumber || "—"}</span>
            <span>{formatDateTime(receipt.timestamp)}</span>
          </div>

          {receipt.customerInfo?.name && (
            <p className="text-sm text-gray-600 mb-4">
              <span className="text-gray-400">Customer:</span>{" "}
              <span className="font-medium text-gray-800">
                {receipt.customerInfo.name}
              </span>
            </p>
          )}

          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="text-left py-2 font-medium">Item</th>
                <th className="text-center py-2 font-medium">Qty</th>
                <th className="text-right py-2 font-medium">Price</th>
                <th className="text-right py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items.map((item, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2 text-gray-800">
                    {item.name || "Item"}
                  </td>
                  <td className="py-2 text-center text-gray-600">
                    {item.quantity}
                  </td>
                  <td className="py-2 text-right text-gray-600">
                    {fmt(item.price)}
                  </td>
                  <td className="py-2 text-right text-gray-800">
                    {fmt(item.price * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="space-y-1 text-sm mb-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-gray-800">{fmt(subtotal)}</span>
            </div>
            {(receipt.discount || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Discount</span>
                <span className="text-gray-800">
                  −{fmt(receipt.discount || 0)}
                </span>
              </div>
            )}
            {(receipt.tax || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span className="text-gray-800">{fmt(receipt.tax || 0)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-bold text-gray-900">
                {fmt(receipt.total)}
              </span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 text-sm flex justify-between mb-6">
            <span className="text-gray-500">Payment method</span>
            <span className="text-gray-800 capitalize">
              {receipt.paymentMethod || "—"}
            </span>
          </div>

          <p className="text-center text-sm text-gray-500">
            Thank you for shopping with us!
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicReceiptView;
