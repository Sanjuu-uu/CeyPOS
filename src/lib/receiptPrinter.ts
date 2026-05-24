// Receipt print orchestrator.
//
// Pipeline:
//   1. Optionally mint a public /r/<token> URL on the server (so the
//      printed QR can be scanned to retrieve the digital receipt).
//   2. Generate a QR code as a base-64 data URL (embedded inline so the
//      print iframe doesn't have to wait on a network image).
//   3. Build the HTML using receiptTemplate.ts.
//   4. Write the HTML into a hidden iframe and call print() on it.
//   5. Clean up the iframe a few seconds later.
//
// Works with any printer the OS knows about — USB-connected thermal
// printers (Epson TM-T20, Star TSP100, Xprinter XP-Q200), network IP
// printers, even Bluetooth ones. The browser print dialog routes to the
// default system printer; setting that printer as default in the OS once
// makes subsequent prints near-instant.
//
// For true silent printing (no dialog), launch Chrome with
// `--kiosk-printing` flag on the cashier terminal. That is a deployment
// concern, not something we configure from the app.

import QRCode from "qrcode";
import {
  buildReceiptHtml,
  type ReceiptData,
  type ReceiptTemplateOptions,
} from "./receiptTemplate";
import {
  getPrinterSettings,
  type PrinterSettings,
} from "./printerSettings";
import { mintReceiptToken, type MintTokenSale } from "./receiptToken";

export interface PrintReceiptOptions {
  /** User id used to look up per-device printer settings. */
  userId?: string;
  /** Override the stored printer settings for this single print. */
  settingsOverride?: Partial<PrinterSettings>;
  /**
   * Skip the server mint call. Use this when the caller has already
   * obtained the public URL (e.g. via sendEmailReceipt) and wants to
   * print the same QR without a second round-trip.
   */
  publicReceiptUrl?: string | null;
  /**
   * Pass shopId + sale to mint a token on the server. If omitted,
   * the receipt prints without a QR even if showQrCode is true.
   */
  shopId?: string;
  sale?: MintTokenSale;
}

export interface PrintReceiptResult {
  ok: boolean;
  publicReceiptUrl?: string | null;
  error?: string;
}

// 8-second cleanup is enough for the browser to finish the print job
// even on slow OS print spoolers without holding the iframe forever.
const IFRAME_CLEANUP_DELAY_MS = 8000;

async function generateQrDataUrl(
  url: string,
  size: number,
): Promise<string | null> {
  try {
    return await QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: size,
      color: { dark: "#000000", light: "#FFFFFF" },
    });
  } catch (err) {
    console.warn("QR generation failed:", err);
    return null;
  }
}

function createPrintIframe(): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("tabindex", "-1");
  // Position offscreen rather than display:none — Chrome will not print
  // a display:none iframe reliably.
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);
  return iframe;
}

function writeIframeAndPrint(
  iframe: HTMLIFrameElement,
  html: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      reject(new Error("Could not access print iframe document"));
      return;
    }

    let printed = false;
    const triggerPrint = () => {
      if (printed) return;
      printed = true;
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        resolve();
      } catch (err) {
        reject(err);
      }
    };

    // Two-phase load detection: prefer the iframe's `load` event when it
    // fires after document.write, but also fall back to a short timer in
    // case the browser optimises around document.write and never fires.
    iframe.addEventListener("load", triggerPrint, { once: true });
    const fallbackTimer = window.setTimeout(triggerPrint, 600);

    doc.open();
    doc.write(html);
    doc.close();

    // Resolve cleanup of the fallback timer once print fires.
    const cleanup = () => window.clearTimeout(fallbackTimer);
    iframe.addEventListener("load", cleanup, { once: true });
  });
}

export async function printReceipt(
  data: ReceiptData,
  options: PrintReceiptOptions = {},
): Promise<PrintReceiptResult> {
  if (typeof window === "undefined") {
    return { ok: false, error: "no_window" };
  }

  // 1. Settings
  const baseSettings = getPrinterSettings(options.userId);
  const settings: PrinterSettings = {
    ...baseSettings,
    ...(options.settingsOverride || {}),
  };

  // 2. Public URL (for QR). Prefer explicit URL > mint a fresh one.
  let publicReceiptUrl: string | null = options.publicReceiptUrl ?? null;
  if (!publicReceiptUrl && settings.showQrCode && options.shopId && options.sale) {
    const mint = await mintReceiptToken(options.shopId, options.sale);
    if (mint.ok && mint.url) {
      publicReceiptUrl = mint.url;
    }
  }

  // 3. QR (data URL so the iframe doesn't have to wait on a remote img).
  let qrCodeDataUrl: string | null = null;
  if (settings.showQrCode && publicReceiptUrl) {
    const qrSizePx = settings.paperWidth === "80mm" ? 300 : 220;
    qrCodeDataUrl = await generateQrDataUrl(publicReceiptUrl, qrSizePx);
  }

  // 4. HTML
  const templateOptions: ReceiptTemplateOptions = {
    paperWidth: settings.paperWidth,
    showQrCode: settings.showQrCode,
    qrCodeDataUrl,
    publicReceiptUrl,
    footerText: settings.footerText,
    feedLines: settings.feedLines,
  };
  const html = buildReceiptHtml(data, templateOptions);

  // 5. Print via hidden iframe
  const iframe = createPrintIframe();
  try {
    await writeIframeAndPrint(iframe, html);
  } catch (err) {
    document.body.removeChild(iframe);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "print_failed",
    };
  }

  // Delay cleanup so the browser has time to spool the page. Chrome and
  // Firefox both need the iframe alive while the print job is queued.
  window.setTimeout(() => {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }, IFRAME_CLEANUP_DELAY_MS);

  return { ok: true, publicReceiptUrl };
}
