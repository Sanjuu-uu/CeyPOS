// Per-device printer preferences. Stored in localStorage like
// keyboard shortcuts — each cashier terminal can have its own physical
// printer setup without touching the shop's shared business config.

export type PaperWidth = "58mm" | "80mm";

export interface PrinterSettings {
  paperWidth: PaperWidth;
  showQrCode: boolean;
  footerText: string;
  // Number of blank lines to feed at the end so the cut is below the
  // last visible line. Most printers handle this in the driver; default 2
  // is a safe value if the driver doesn't auto-feed.
  feedLines: number;
  // Auto-fire window.print() at checkout without user confirmation. Set
  // to false during development so the print dialog is always visible.
  autoPrint: boolean;
}

const DEFAULT_SETTINGS: PrinterSettings = {
  paperWidth: "80mm",
  showQrCode: true,
  footerText: "Thank you for shopping with us!",
  feedLines: 2,
  autoPrint: true,
};

const STORAGE_KEY_PREFIX = "pos_printer_settings_";

function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId || "default"}`;
}

export function getPrinterSettings(userId: string = "default"): PrinterSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<PrinterSettings>;
    // Merge with defaults so newly added settings get sensible fallbacks
    // for existing devices.
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function savePrinterSettings(
  userId: string,
  settings: PrinterSettings,
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(userId), JSON.stringify(settings));
  // Notify any open components (Settings panel, ShoppingCart) so they
  // pick up the new paper width without a page reload.
  window.dispatchEvent(new CustomEvent("printer-settings-updated"));
}

export function resetPrinterSettings(userId: string): PrinterSettings {
  savePrinterSettings(userId, DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export const PRINTER_SETTINGS_DEFAULTS = DEFAULT_SETTINGS;
