import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Building2,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Database,
  Download,
  FileText,
  Keyboard,
  LifeBuoy,
  Lock,
  PackagePlus,
  Palette,
  Printer,
  RefreshCcw,
  ShieldCheck,
  UploadCloud,
  UserCog,
  Users,
  Wifi,
} from "lucide-react";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { useApp } from "../../../context/AppContext";
import { db, normalizeKey } from "../../../lib/db";
import { KeyboardShortcuts, ModuleName, Product } from "../../../types";
import {
  getPrinterSettings,
  savePrinterSettings,
  resetPrinterSettings,
  type PrinterSettings as PrinterSettingsType,
  type PaperWidth,
} from "../../../lib/printerSettings";
import { printReceipt } from "../../../lib/receiptPrinter";
import { TeamSettings } from "../team/TeamSettings";
import { getSearchHash, setSearchHash } from "../../../lib/navigationSearch";

type SettingsTab =
  | "general"
  | "operations"
  | "users"
  | "team"
  | "notifications"
  | "security"
  | "appearance"
  | "backup"
  | "keybindings"
  | "printer";

type SaveState = "idle" | "saving" | "saved" | "error";

const selectClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-[#c5f542] focus:ring-2 focus:ring-[#c5f542]/25";

const textareaClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[#c5f542] focus:ring-2 focus:ring-[#c5f542]/25";

const defaultShortcuts: KeyboardShortcuts = {
  focusSearch: "F1",
  checkout: "F2",
  clearCart: "F3",
  togglePayment: "F4",
  addCustomer: "F5",
  removeCustomer: "Delete",
  confirmPayment: "Enter",
  increaseQuantity: "+",
  decreaseQuantity: "-",
  toggleReceiptPrint: "F6",
  toggleReceiptSms: "F7",
  toggleReceiptEmail: "F8",
};

const shortcutRows: Array<{ id: keyof KeyboardShortcuts; label: string; desc: string }> = [
  { id: "focusSearch", label: "Focus Search / Barcode", desc: "Jump to the POS search field." },
  { id: "checkout", label: "Checkout", desc: "Move from cart to payment." },
  { id: "clearCart", label: "Clear Cart", desc: "Wipe the active transaction." },
  { id: "togglePayment", label: "Toggle Payment", desc: "Cycle cash/card/mobile tender." },
  { id: "addCustomer", label: "Add Customer", desc: "Focus customer lookup." },
  { id: "removeCustomer", label: "Remove Customer", desc: "Detach the customer from cart." },
  { id: "confirmPayment", label: "Confirm Payment", desc: "Finalize checkout." },
  { id: "increaseQuantity", label: "Increase Quantity", desc: "Add one to the latest item." },
  { id: "decreaseQuantity", label: "Decrease Quantity", desc: "Remove one from the latest item." },
  { id: "toggleReceiptPrint", label: "Toggle Print Receipt", desc: "Select or clear print receipt." },
  { id: "toggleReceiptSms", label: "Toggle SMS Receipt", desc: "Select or clear SMS receipt." },
  { id: "toggleReceiptEmail", label: "Toggle Email Receipt", desc: "Select or clear email receipt." },
];

const settingsStorageKey = (scope: string, key: string) => `ceypos:settings:${scope}:${key}`;

function readStored<T>(scope: string, key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(settingsStorageKey(scope, key));
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function writeStored(scope: string, key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(settingsStorageKey(scope, key), JSON.stringify(value));
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const FieldLabel: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
    {children}
  </label>
);

const SaveBadge: React.FC<{ state: SaveState; idleText?: string }> = ({ state, idleText }) => {
  if (state === "saving") return <span className="text-xs font-medium text-amber-700">Saving...</span>;
  if (state === "saved") return <span className="text-xs font-medium text-green-700">Saved</span>;
  if (state === "error") return <span className="text-xs font-medium text-red-700">Could not save</span>;
  return idleText ? <span className="text-xs text-gray-400">{idleText}</span> : null;
};

const Toggle: React.FC<{ checked: boolean; onChange: () => void; disabled?: boolean }> = ({
  checked,
  onChange,
  disabled = false,
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onChange}
    className={`relative h-6 w-11 rounded-full border transition-colors disabled:opacity-50 ${
      checked ? "border-gray-950 bg-gray-950" : "border-gray-200 bg-gray-200"
    }`}
    aria-pressed={checked}
  >
    <span
      className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform ${
        checked ? "translate-x-5" : "translate-x-0"
      }`}
    />
  </button>
);

const ToggleRow: React.FC<{
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}> = ({ title, description, checked, onChange, disabled }) => (
  <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
    <div>
      <p className="font-medium text-gray-900">{title}</p>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
    <Toggle checked={checked} onChange={onChange} disabled={disabled} />
  </div>
);

const ActionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}> = ({ icon, title, description, actionLabel, onClick, disabled, tone = "default" }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`group flex h-full flex-col rounded-2xl border bg-white p-5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 ${
      tone === "danger" ? "border-red-200 hover:bg-red-50" : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
    }`}
  >
    <span
      className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${
        tone === "danger" ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-700"
      }`}
    >
      {icon}
    </span>
    <span className="text-sm font-semibold text-gray-950">{title}</span>
    <span className="mt-2 min-h-[42px] text-sm leading-6 text-gray-500">{description}</span>
    <span className={`mt-4 inline-flex items-center gap-1 text-xs font-bold ${tone === "danger" ? "text-red-600" : "text-gray-900"}`}>
      {actionLabel}
      <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
    </span>
  </button>
);

const SettingsNotice: React.FC<{ tone?: "info" | "warning"; children: React.ReactNode }> = ({
  tone = "info",
  children,
}) => (
  <div
    className={`flex gap-3 rounded-2xl border px-4 py-3 text-sm ${
      tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-gray-200 bg-gray-50 text-gray-600"
    }`}
  >
    {tone === "warning" ? <AlertTriangle size={18} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
    <div className="leading-6">{children}</div>
  </div>
);

const KeyboardSettings: React.FC = () => {
  const { currentUser } = useApp();
  const userId = currentUser?.id || "default";
  const [shortcuts, setShortcuts] = useState<KeyboardShortcuts>(() => db.shortcuts.get(userId));
  const [activeKey, setActiveKey] = useState("");
  const [status, setStatus] = useState<SaveState>("idle");
  const [conflictError, setConflictError] = useState<string | null>(null);

  useEffect(() => {
    setShortcuts(db.shortcuts.get(userId));
  }, [userId]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab"].includes(e.key)) return;
      let keyName = e.key === " " ? "Space" : e.key;
      if (keyName === "NumpadEnter") keyName = "Enter";
      if (keyName.length === 1 && keyName.match(/[a-z]/i)) keyName = keyName.toUpperCase();
      let combo = "";
      if (e.ctrlKey && keyName !== "Control") combo += "Ctrl+";
      if (e.shiftKey && keyName !== "Shift") combo += "Shift+";
      if (e.altKey && keyName !== "Alt") combo += "Alt+";
      combo += keyName;
      setActiveKey(combo);
      window.setTimeout(() => setActiveKey(""), 200);
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const handleKeyRecord = (e: React.KeyboardEvent<HTMLInputElement>, action: keyof KeyboardShortcuts) => {
    e.preventDefault();
    e.stopPropagation();
    if (["F12", "Meta", "OS", "ContextMenu", "Shift", "Control", "Alt", "CapsLock", "Tab"].includes(e.key)) return;

    let keyName = e.key === " " ? "Space" : e.key;
    if (keyName === "NumpadEnter") keyName = "Enter";
    if (keyName.length === 1 && keyName.match(/[a-z]/i)) keyName = keyName.toUpperCase();

    let combo = "";
    if (e.ctrlKey) combo += "Ctrl+";
    if (e.shiftKey) combo += "Shift+";
    if (e.altKey) combo += "Alt+";
    combo += keyName;

    const normalizedCombo = normalizeKey(combo);
    const duplicate = Object.entries(shortcuts).some(([key, value]) => key !== action && normalizeKey(value) === normalizedCombo);
    if (duplicate) {
      setConflictError(`"${combo}" is already assigned.`);
      window.setTimeout(() => setConflictError(null), 3000);
      return;
    }

    setShortcuts((prev) => ({ ...prev, [action]: combo }));
    setStatus("idle");
    setConflictError(null);
  };

  const save = () => {
    try {
      db.shortcuts.save(userId, shortcuts);
      setStatus("saved");
      window.setTimeout(() => setStatus("idle"), 1800);
    } catch (error) {
      setConflictError(error instanceof Error ? error.message : "Could not save shortcuts.");
      setStatus("error");
    }
  };

  return (
    <div className="space-y-5">
      <Card title={`Keyboard shortcuts for ${currentUser?.name || "this user"}`} subtitle="Click a shortcut field and press the replacement key." icon={<Keyboard size={18} />} actions={<SaveBadge state={status} />} className="border border-gray-100">
        {conflictError && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{conflictError}</div>}
        <div className="space-y-3">
          {shortcutRows.map((row) => {
            const currentShortcut = shortcuts[row.id];
            const isPressed = normalizeKey(activeKey) === normalizeKey(currentShortcut);
            return (
              <div key={row.id} className={`flex items-center justify-between gap-4 rounded-2xl border p-3 transition-all ${isPressed ? "border-gray-950 bg-gray-50 shadow-sm" : "border-gray-100 bg-gray-50/70"}`}>
                <div>
                  <p className="font-medium text-gray-900">{row.label}</p>
                  <p className="text-xs text-gray-500">{row.desc}</p>
                </div>
                <input
                  type="text"
                  value={currentShortcut}
                  onKeyDown={(event) => handleKeyRecord(event, row.id)}
                  readOnly
                  className={`h-10 w-44 rounded-lg border px-3 text-center font-mono font-bold outline-none transition-all ${isPressed ? "border-gray-950 bg-gray-950 text-white" : "border-gray-300 bg-white text-gray-950 focus:ring-2 focus:ring-[#c5f542]/40"}`}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
          <Button variant="primary" onClick={save}>Save keybindings</Button>
          <Button variant="outline" onClick={() => setShortcuts(defaultShortcuts)}>Reset defaults</Button>
          <Button variant="secondary" onClick={() => navigator.clipboard.writeText(JSON.stringify(shortcuts, null, 2))}>Copy JSON</Button>
        </div>
      </Card>

      <Card title="Fixed system hotkeys" subtitle="These are reserved for universal terminal behavior." icon={<Lock size={18} />} className="border border-gray-100">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <ToggleRow title="Escape / Undo" description="Close modals or return to the cart." checked disabled onChange={() => undefined} />
          <ToggleRow title="Hardware scanner" description="Rapid barcode input is detected automatically." checked disabled onChange={() => undefined} />
        </div>
      </Card>
    </div>
  );
};

const PrinterSettingsPanel: React.FC = () => {
  const { currentUser, currentShop } = useApp();
  const userId = currentUser?.id || "default";
  const [settings, setSettings] = useState<PrinterSettingsType>(() => getPrinterSettings(userId));
  const [savedFlash, setSavedFlash] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "printing" | "ok" | "error">("idle");

  useEffect(() => {
    setSettings(getPrinterSettings(userId));
  }, [userId]);

  const update = <K extends keyof PrinterSettingsType>(key: K, value: PrinterSettingsType[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const save = () => {
    savePrinterSettings(userId, settings);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1500);
  };

  const testPrint = async () => {
    setTestStatus("printing");
    savePrinterSettings(userId, settings);
    const result = await printReceipt(
      {
        shop: {
          name: currentShop?.name || "Your store",
          address: currentShop?.address || "",
          contact: currentShop?.contact || "",
        },
        customer: { name: "Test Customer" },
        items: [
          { name: "Test item A", code: "T001", quantity: 2, price: 250 },
          { name: "Test item B", code: "T002", quantity: 1, price: 99.5 },
        ],
        subtotal: 599.5,
        tax: 0,
        discount: 0,
        total: 599.5,
        cashReceived: 600,
        changeAmount: 0.5,
        paymentMethod: "cash",
        currency: currentShop?.currency || "LKR",
        timestamp: new Date().toISOString(),
        receiptNumber: "TEST-0000",
        cashier: currentUser?.name || "",
      },
      { userId },
    );
    setTestStatus(result.ok ? "ok" : "error");
    window.setTimeout(() => setTestStatus("idle"), 2500);
  };

  return (
    <Card title={`Receipt printer (${currentUser?.name || "this device"})`} subtitle="Per-device printer preferences saved in this browser." icon={<Printer size={18} />} className="border border-gray-100">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">Paper width</p>
          <div className="grid grid-cols-2 gap-3">
            {(["80mm", "58mm"] as PaperWidth[]).map((width) => (
              <button
                key={width}
                type="button"
                onClick={() => update("paperWidth", width)}
                className={`rounded-2xl border-2 p-4 text-left transition-all ${
                  settings.paperWidth === width ? "border-gray-950 bg-gray-50 text-gray-900" : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <span className="block font-semibold">{width}</span>
                <span className="mt-1 block text-xs text-gray-500">{width === "80mm" ? "Counter thermal printers" : "Pocket / Bluetooth printers"}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <ToggleRow title="Print QR code" description="Customer can scan to open the digital receipt." checked={settings.showQrCode} onChange={() => update("showQrCode", !settings.showQrCode)} />
          <ToggleRow title="Auto-print at checkout" description="Open print when the checkout print option is selected." checked={settings.autoPrint} onChange={() => update("autoPrint", !settings.autoPrint)} />
        </div>

        <div className="lg:col-span-2">
          <Input label="Footer text" value={settings.footerText} onChange={(event) => update("footerText", event.target.value)} placeholder="Thank you for shopping with us!" />
        </div>

        <div className="lg:col-span-2">
          <label className="mb-2 block text-sm font-medium text-gray-700">Trailing blank lines ({settings.feedLines})</label>
          <input type="range" min={0} max={6} step={1} value={settings.feedLines} onChange={(event) => update("feedLines", Number(event.target.value))} className="w-full accent-gray-950" />
          <p className="mt-1 text-xs text-gray-500">Increase this if your printer cuts too close to the last line.</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
        <Button variant="primary" onClick={save}>Save printer settings</Button>
        <Button variant="secondary" onClick={testPrint} disabled={testStatus === "printing"}>{testStatus === "printing" ? "Opening print..." : "Test print"}</Button>
        <Button variant="outline" onClick={() => setSettings(resetPrinterSettings(userId))}>Reset</Button>
        {savedFlash && <span className="rounded-md border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-700">Saved</span>}
        {testStatus === "ok" && <span className="rounded-md border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-700">Print dialog opened</span>}
        {testStatus === "error" && <span className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700">Print failed</span>}
      </div>
    </Card>
  );
};

export const Settings: React.FC = () => {
  const {
    currentShop,
    currentUser,
    memberScope,
    activeShopId,
    setCurrentModule,
    refreshShopContext,
  } = useApp();
  const backupInputRef = useRef<HTMLInputElement | null>(null);
  const scopeKey = currentShop?.id || currentUser?.shopId || "default";

  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [shopSaveState, setShopSaveState] = useState<SaveState>("idle");
  const [profileSaveState, setProfileSaveState] = useState<SaveState>("idle");
  const [operationsSaveState, setOperationsSaveState] = useState<SaveState>("idle");
  const [appearanceSaveState, setAppearanceSaveState] = useState<SaveState>("idle");
  const [securitySaveState, setSecuritySaveState] = useState<SaveState>("idle");
  const [notificationSaveState, setNotificationSaveState] = useState<SaveState>("idle");
  const [backupStatus, setBackupStatus] = useState<{ tone: "info" | "warning"; message: string } | null>(null);

  const [shopSettings, setShopSettings] = useState({
    shopName: currentShop?.name || "",
    phone: currentShop?.contact || "",
    address: currentShop?.address || "",
    city: "",
    state: "",
    zipCode: "",
    country: "Sri Lanka",
    shopType: "retail",
    businessLicense: "",
    taxId: "",
    registrationNumber: "",
    currency: currentShop?.currency || "LKR",
    timezone: "Asia/Colombo",
    receiptMessage: "Thank you for shopping with us!",
  });

  const [userSettings, setUserSettings] = useState(() =>
    readStored(scopeKey, "profile", {
      username: currentUser?.name || "",
      email: currentUser?.email || "",
      displayRole: currentUser?.role || "",
      preferredName: currentUser?.name || "",
    }),
  );

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    inAppNotifications: true,
    lowStockAlerts: true,
    dailyReports: false,
    salesAlerts: true,
    systemUpdates: true,
    quietHoursStart: null as string | null,
    quietHoursEnd: null as string | null,
  });

  const [operations, setOperations] = useState(() =>
    readStored(scopeKey, "operations", {
      defaultPaymentMethod: "cash",
      receiptPrefix: "CEY",
      receiptCopies: "1",
      roundingMode: "none",
      returnWindowDays: "7",
      lowStockThreshold: "10",
      defaultReorderThreshold: "10",
      barcodeMode: "scanner",
      taxIncludedPrices: false,
      requireCashierSession: true,
      reserveStockAcrossTerminals: true,
      preventNegativeStock: true,
      requireCustomerForReturns: true,
      autoOpenCashDrawer: false,
    }),
  );

  const [appearance, setAppearance] = useState(() =>
    readStored(scopeKey, "appearance", {
      theme: "light",
      compactMode: false,
      showSidebarHints: true,
      language: "en",
      density: "comfortable",
    }),
  );

  const [security, setSecurity] = useState(() =>
    readStored(scopeKey, "security", {
      sessionTimeout: "4h",
      loginAlerts: true,
      requireManagerForDiscounts: true,
      lockTerminalOnIdle: false,
    }),
  );

  const [backup, setBackup] = useState(() =>
    readStored(scopeKey, "backup", {
      autoBackup: true,
      frequency: "daily",
      includeSales: true,
      includeProducts: true,
      includeSettings: true,
      lastExportAt: "",
    }),
  );

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
    { id: "general", label: "General", icon: <Building2 size={15} /> },
    { id: "operations", label: "Operations", icon: <FileText size={15} /> },
    { id: "users", label: "Users", icon: <UserCog size={15} /> },
    ...(memberScope?.modules?.team ? [{ id: "team" as SettingsTab, label: "Team", icon: <Users size={15} /> }] : []),
    { id: "keybindings", label: "Keybindings", icon: <Keyboard size={15} /> },
    { id: "printer", label: "Printer", icon: <Printer size={15} /> },
    { id: "notifications", label: "Notifications", icon: <Bell size={15} /> },
    { id: "security", label: "Security", icon: <ShieldCheck size={15} /> },
    { id: "appearance", label: "Appearance", icon: <Palette size={15} /> },
    { id: "backup", label: "Backup & Data", icon: <Database size={15} /> },
  ];

  const navigateTo = (module: ModuleName, hash?: string) => {
    setCurrentModule(module);
    setSearchHash(hash);
  };

  const setTab = (tab: SettingsTab) => {
    setActiveTab(tab);
    setSearchHash(`settings:${tab}`);
  };

  useEffect(() => {
    const applySearchHash = () => {
      const hash = getSearchHash();
      const tab = hash.startsWith("settings:") ? hash.split(":")[1] : "";
      if (["general", "operations", "users", "team", "notifications", "security", "appearance", "backup", "keybindings", "printer"].includes(tab)) {
        setActiveTab(tab as SettingsTab);
      }
    };

    applySearchHash();
    window.addEventListener("hashchange", applySearchHash);
    return () => window.removeEventListener("hashchange", applySearchHash);
  }, []);

  useEffect(() => {
    setShopSettings((prev) => ({
      ...prev,
      shopName: currentShop?.name || prev.shopName,
      phone: currentShop?.contact || prev.phone,
      address: currentShop?.address || prev.address,
      currency: currentShop?.currency || prev.currency || "LKR",
    }));
  }, [currentShop?.name, currentShop?.contact, currentShop?.address, currentShop?.currency]);

  useEffect(() => {
    setUserSettings((prev) => ({
      ...prev,
      username: currentUser?.name || prev.username,
      email: currentUser?.email || prev.email,
      displayRole: currentUser?.role || prev.displayRole,
    }));
  }, [currentUser?.name, currentUser?.email, currentUser?.role]);

  useEffect(() => {
    if (!currentShop?.id || !currentUser?.email) return;
    let active = true;
    db.notifications
      .getPreferences(currentShop.id, currentUser.email)
      .then((preferences) => {
        if (active) setNotifications(preferences);
      })
      .catch((error) => console.warn("Failed to load notification preferences", error));
    return () => {
      active = false;
    };
  }, [currentShop?.id, currentUser?.email]);

  useEffect(() => {
    writeStored(scopeKey, "appearance", appearance);
    document.documentElement.dataset.ceyposTheme = appearance.theme;
    document.documentElement.dataset.ceyposDensity = appearance.density;
    document.documentElement.classList.toggle("ceypos-compact", Boolean(appearance.compactMode));
  }, [appearance, scopeKey]);

  const handleShopSettingsChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setShopSettings((prev) => ({ ...prev, [name]: value }));
    setShopSaveState("idle");
  };

  const handleUserSettingsChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setUserSettings((prev) => ({ ...prev, [name]: value }));
    setProfileSaveState("idle");
  };

  const saveShopSettings = async () => {
    if (!currentShop && !activeShopId) return;
    if (!shopSettings.shopName.trim()) {
      setShopSaveState("error");
      return;
    }
    setShopSaveState("saving");
    try {
      await db.shops.updateMeta(activeShopId || currentShop!.id, {
        ...shopSettings,
        userEmail: currentUser?.email,
      });
      await refreshShopContext().catch(() => undefined);
      setShopSaveState("saved");
      window.setTimeout(() => setShopSaveState("idle"), 1800);
    } catch (error) {
      console.error("Failed to save shop settings", error);
      setShopSaveState("error");
    }
  };

  const saveUserSettings = () => {
    writeStored(scopeKey, "profile", userSettings);
    setProfileSaveState("saved");
    window.setTimeout(() => setProfileSaveState("idle"), 1500);
  };

  const handleNotificationChange = (setting: keyof typeof notifications) => {
    if (setting === "quietHoursStart" || setting === "quietHoursEnd") return;
    setNotifications((prev) => {
      const next = { ...prev, [setting]: !prev[setting] };
      if (currentShop?.id && currentUser?.email) {
        setNotificationSaveState("saving");
        db.notifications
          .savePreferences(currentShop.id, currentUser.email, next)
          .then((saved) => {
            setNotifications(saved);
            setNotificationSaveState("saved");
            window.setTimeout(() => setNotificationSaveState("idle"), 1500);
          })
          .catch(() => setNotificationSaveState("error"));
      }
      return next;
    });
  };

  const saveAppearance = () => {
    writeStored(scopeKey, "appearance", appearance);
    setAppearanceSaveState("saved");
    window.setTimeout(() => setAppearanceSaveState("idle"), 1500);
  };

  const saveSecurity = () => {
    writeStored(scopeKey, "security", security);
    setSecuritySaveState("saved");
    window.setTimeout(() => setSecuritySaveState("idle"), 1500);
  };

  const saveOperations = () => {
    writeStored(scopeKey, "operations", operations);
    setOperationsSaveState("saved");
    window.setTimeout(() => setOperationsSaveState("idle"), 1500);
  };

  const saveBackupSettings = (next = backup) => {
    writeStored(scopeKey, "backup", next);
    setBackup(next);
  };

  const saveCurrentTab = () => {
    if (activeTab === "general") {
      void saveShopSettings();
      return;
    }
    if (activeTab === "users") {
      saveUserSettings();
      return;
    }
    if (activeTab === "appearance") {
      saveAppearance();
      return;
    }
    if (activeTab === "security") {
      saveSecurity();
      return;
    }
    if (activeTab === "operations") {
      saveOperations();
      return;
    }
    if (activeTab === "notifications") {
      if (!currentShop || !currentUser?.email) return;
      setNotificationSaveState("saving");
      db.notifications
        .savePreferences(currentShop.id, currentUser.email, notifications)
        .then((saved) => {
          setNotifications(saved);
          setNotificationSaveState("saved");
          window.setTimeout(() => setNotificationSaveState("idle"), 1500);
        })
        .catch(() => setNotificationSaveState("error"));
      return;
    }
    if (activeTab === "backup") {
      saveBackupSettings(backup);
      setBackupStatus({ tone: "info", message: "Backup preferences saved." });
    }
  };

  const canSaveCurrentTab = ["general", "operations", "users", "notifications", "security", "appearance", "backup"].includes(activeTab);

  const handleExportData = () => {
    const now = new Date().toISOString();
    const payload = {
      exportedAt: now,
      version: 1,
      shop: currentShop,
      user: currentUser ? { id: currentUser.id, email: currentUser.email, role: currentUser.role } : null,
      products: backup.includeProducts ? db.products.getAll() : [],
      sales: backup.includeSales ? db.sales.getAll() : [],
      paymentMethods: db.paymentMethods.getEnabled(),
      businessRules: db.businessRules.get(),
      settings: backup.includeSettings
        ? { shopSettings, operations, appearance, security, backup, notifications, printer: getPrinterSettings(currentUser?.id || "default") }
        : {},
    };
    downloadJson(`ceypos-${activeShopId || currentShop?.id || "shop"}-${now.slice(0, 10)}.json`, payload);
    saveBackupSettings({ ...backup, lastExportAt: now });
    setBackupStatus({ tone: "info", message: "Backup downloaded to your browser." });
  };

  const handleImportBackupFile = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      const products = Array.isArray(parsed.products) ? parsed.products : [];
      if (!products.length) {
        setBackupStatus({ tone: "warning", message: "No products were found in this backup file." });
        return;
      }
      let imported = 0;
      for (const product of products) {
        const { shopId: _ignoredShopId, ...productForCurrentShop } = product as Product;
        void _ignoredShopId;
        await db.products.create(productForCurrentShop);
        imported += 1;
      }
      setBackupStatus({ tone: "info", message: `Imported ${imported} product records from backup.` });
    } catch (error) {
      console.error("Backup import failed", error);
      setBackupStatus({ tone: "warning", message: "Could not read this backup file. Please choose a CeyPOS JSON export." });
    } finally {
      if (backupInputRef.current) backupInputRef.current.value = "";
    }
  };

  const renderRelatedCards = () => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <ActionCard icon={<PackagePlus size={19} />} title="Add Product" description="Open the inventory product card with pricing, barcode, stock, image and supplier fields." actionLabel="Open product card" onClick={() => navigateTo("inventory", "inventory:add")} />
      <ActionCard icon={<UploadCloud size={19} />} title="Import Products" description="Launch the guided inventory import wizard for spreadsheet templates and validation." actionLabel="Open import wizard" onClick={() => navigateTo("inventory", "inventory:import")} />
      <ActionCard icon={<CreditCard size={19} />} title="Payments" description="Manage tender methods and payment preferences from the dedicated payment settings page." actionLabel="Payment settings" onClick={() => navigateTo("payments", "payments:methods")} />
      <ActionCard icon={<Wifi size={19} />} title="Terminals" description="Register terminals, review active devices and pair mobile checkout or import sessions." actionLabel="Manage sessions" onClick={() => navigateTo("sessions")} />
    </div>
  );

  return (
    <div className="space-y-5 pb-20">
      <div className="page-action-row">
        <div>
          <p className="page-subheading">Customize workspace, account, device and data preferences</p>
          <p className="mt-1 text-xs text-gray-400">
            {currentShop?.name || "Current shop"} - {memberScope?.role || currentUser?.role || "user"} settings
          </p>
        </div>
      </div>

      <Card
        title="Settings shortcuts"
        subtitle="Jump straight to operational pages connected to these preferences."
        actions={
          <Button
            variant="dark"
            size="sm"
            onClick={saveCurrentTab}
            disabled={!canSaveCurrentTab || shopSaveState === "saving" || notificationSaveState === "saving"}
            className="px-5 shadow-[0_8px_18px_rgba(17,24,39,0.12)]"
          >
            Save Current Tab
          </Button>
        }
        className="border border-gray-100"
      >
        {renderRelatedCards()}
      </Card>

      <div className="module-tabs">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setTab(tab.id)} className={`module-tab ${activeTab === tab.id ? "module-tab-active" : ""}`}>
              <span className="inline-flex items-center gap-2">{tab.icon}{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "keybindings" && <KeyboardSettings />}
      {activeTab === "printer" && <PrinterSettingsPanel />}

      {activeTab === "general" && (
        <div className="space-y-6">
          <Card title="Shop profile" subtitle="Shown on receipts, terminals, reports and staff context." icon={<Building2 size={18} />} actions={<SaveBadge state={shopSaveState} idleText="Backend saved" />} className="border border-gray-100">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Input label="Shop Name" name="shopName" value={shopSettings.shopName} onChange={handleShopSettingsChange} placeholder="Enter shop name" />
              <Input label="Contact Number" name="phone" value={shopSettings.phone} onChange={handleShopSettingsChange} placeholder="+94..." />
              <Input label="City" name="city" value={shopSettings.city} onChange={handleShopSettingsChange} placeholder="Colombo" />
              <Input label="Country" name="country" value={shopSettings.country} onChange={handleShopSettingsChange} placeholder="Sri Lanka" />
              <div className="md:col-span-2">
                <FieldLabel label="Address">
                  <textarea name="address" value={shopSettings.address} onChange={handleShopSettingsChange} rows={3} className={textareaClass} placeholder="Shop address used on receipts" />
                </FieldLabel>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
              <Button variant="primary" onClick={saveShopSettings} disabled={shopSaveState === "saving"}>{shopSaveState === "saving" ? "Saving..." : "Save shop profile"}</Button>
              {shopSaveState === "error" && <span className="text-sm font-medium text-red-600">Check required fields and permissions.</span>}
            </div>
          </Card>

          <Card title="Business defaults" subtitle="Defaults that influence reporting, receipts and setup copy." icon={<FileText size={18} />} className="border border-gray-100">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FieldLabel label="Currency">
                <select name="currency" value={shopSettings.currency} onChange={handleShopSettingsChange} className={selectClass}>
                  <option value="LKR">LKR - Sri Lankan Rupee</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                </select>
              </FieldLabel>
              <FieldLabel label="Timezone">
                <select name="timezone" value={shopSettings.timezone} onChange={handleShopSettingsChange} className={selectClass}>
                  <option value="Asia/Colombo">Asia/Colombo</option>
                  <option value="Asia/Dubai">Asia/Dubai</option>
                  <option value="Asia/Singapore">Asia/Singapore</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="America/New_York">America/New_York</option>
                </select>
              </FieldLabel>
              <FieldLabel label="Shop type">
                <select name="shopType" value={shopSettings.shopType} onChange={handleShopSettingsChange} className={selectClass}>
                  <option value="retail">Retail</option>
                  <option value="grocery">Grocery</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="fashion">Fashion</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="other">Other</option>
                </select>
              </FieldLabel>
              <Input label="Tax / VAT ID" name="taxId" value={shopSettings.taxId} onChange={handleShopSettingsChange} placeholder="Optional" />
              <Input label="Business License" name="businessLicense" value={shopSettings.businessLicense} onChange={handleShopSettingsChange} placeholder="Optional" />
              <Input label="Registration Number" name="registrationNumber" value={shopSettings.registrationNumber} onChange={handleShopSettingsChange} placeholder="Optional" />
              <div className="md:col-span-2">
                <FieldLabel label="Receipt message">
                  <textarea name="receiptMessage" value={shopSettings.receiptMessage} onChange={handleShopSettingsChange} rows={2} className={textareaClass} />
                </FieldLabel>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <ActionCard icon={<CreditCard size={18} />} title="Payment methods" description="Cash, card and other tender methods live in Payments." actionLabel="Open Payments" onClick={() => navigateTo("payments", "payments:methods")} />
              <ActionCard icon={<ShieldCheck size={18} />} title="Tax rules" description="Detailed tax rates and default rules live in Loyalty/Business." actionLabel="Open Taxes" onClick={() => navigateTo("business", "business:taxes")} />
              <ActionCard icon={<Printer size={18} />} title="Receipt printer" description="Paper width, QR and footer output are device-level printer settings." actionLabel="Printer settings" onClick={() => setTab("printer")} />
            </div>
          </Card>
        </div>
      )}

      {activeTab === "operations" && (
        <div className="space-y-6">
          <Card title="Checkout & receipt defaults" subtitle="Daily sales behavior that managers expect to review before opening terminals." icon={<CreditCard size={18} />} actions={<SaveBadge state={operationsSaveState} idleText="Local browser" />} className="border border-gray-100">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FieldLabel label="Default payment method">
                <select value={operations.defaultPaymentMethod} onChange={(event) => setOperations((prev) => ({ ...prev, defaultPaymentMethod: event.target.value }))} className={selectClass}>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="mobile">Mobile / QR</option>
                </select>
              </FieldLabel>
              <FieldLabel label="Cash rounding">
                <select value={operations.roundingMode} onChange={(event) => setOperations((prev) => ({ ...prev, roundingMode: event.target.value }))} className={selectClass}>
                  <option value="none">No rounding</option>
                  <option value="nearest">Nearest currency unit</option>
                  <option value="up">Always round up</option>
                  <option value="down">Always round down</option>
                </select>
              </FieldLabel>
              <Input label="Receipt number prefix" value={operations.receiptPrefix} onChange={(event) => setOperations((prev) => ({ ...prev, receiptPrefix: event.target.value.toUpperCase().slice(0, 8) }))} placeholder="CEY" />
              <Input label="Receipt copies" type="number" min={1} max={3} value={operations.receiptCopies} onChange={(event) => setOperations((prev) => ({ ...prev, receiptCopies: event.target.value }))} />
              <Input label="Return window days" type="number" min={0} value={operations.returnWindowDays} onChange={(event) => setOperations((prev) => ({ ...prev, returnWindowDays: event.target.value }))} />
              <ToggleRow title="Tax-inclusive item prices" description="Treat shelf prices as already including tax where business rules support it." checked={operations.taxIncludedPrices} onChange={() => setOperations((prev) => ({ ...prev, taxIncludedPrices: !prev.taxIncludedPrices }))} />
              <ToggleRow title="Require active cashier session" description="Keep checkout tied to a registered terminal/session for audit trails." checked={operations.requireCashierSession} onChange={() => setOperations((prev) => ({ ...prev, requireCashierSession: !prev.requireCashierSession }))} />
              <ToggleRow title="Auto-open cash drawer" description="Mark whether cash drawers should open automatically after cash payments." checked={operations.autoOpenCashDrawer} onChange={() => setOperations((prev) => ({ ...prev, autoOpenCashDrawer: !prev.autoOpenCashDrawer }))} />
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <ActionCard icon={<CreditCard size={18} />} title="Tender methods" description="Enable, reorder and name payment methods in Payments." actionLabel="Open Payments" onClick={() => navigateTo("payments", "payments:methods")} />
              <ActionCard icon={<FileText size={18} />} title="Receipt history" description="Review printed, SMS and email receipts from the receipt ledger." actionLabel="Open Receipts" onClick={() => navigateTo("receipts")} />
              <ActionCard icon={<Wifi size={18} />} title="Terminal control" description="Pair terminals and mobile sessions before staff starts selling." actionLabel="Open Sessions" onClick={() => navigateTo("sessions")} />
            </div>
            <div className="mt-6 border-t border-gray-100 pt-4">
              <Button variant="primary" onClick={saveOperations}>Save operation defaults</Button>
            </div>
          </Card>

          <Card title="Inventory safeguards" subtitle="Stock movement defaults that protect checkout, purchasing and replenishment." icon={<PackagePlus size={18} />} className="border border-gray-100">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Input label="Low-stock alert threshold" type="number" min={0} value={operations.lowStockThreshold} onChange={(event) => setOperations((prev) => ({ ...prev, lowStockThreshold: event.target.value }))} />
              <Input label="Default reorder threshold" type="number" min={0} value={operations.defaultReorderThreshold} onChange={(event) => setOperations((prev) => ({ ...prev, defaultReorderThreshold: event.target.value }))} />
              <FieldLabel label="Barcode input mode">
                <select value={operations.barcodeMode} onChange={(event) => setOperations((prev) => ({ ...prev, barcodeMode: event.target.value }))} className={selectClass}>
                  <option value="scanner">Scanner-first</option>
                  <option value="manual">Manual entry</option>
                  <option value="mixed">Scanner + manual</option>
                </select>
              </FieldLabel>
              <ToggleRow title="Reserve stock across terminals" description="Keep cart reservations synchronized so another terminal cannot oversell the same unit." checked={operations.reserveStockAcrossTerminals} onChange={() => setOperations((prev) => ({ ...prev, reserveStockAcrossTerminals: !prev.reserveStockAcrossTerminals }))} />
              <ToggleRow title="Prevent negative stock" description="Warn before checkout can push an item below available stock." checked={operations.preventNegativeStock} onChange={() => setOperations((prev) => ({ ...prev, preventNegativeStock: !prev.preventNegativeStock }))} />
              <ToggleRow title="Require customer for returns" description="Keep refund and return trails tied to a customer record when possible." checked={operations.requireCustomerForReturns} onChange={() => setOperations((prev) => ({ ...prev, requireCustomerForReturns: !prev.requireCustomerForReturns }))} />
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <ActionCard icon={<PackagePlus size={18} />} title="Add product template" description="Open the complete product card for barcode, supplier, stock and reorder fields." actionLabel="Add Product" onClick={() => navigateTo("inventory", "inventory:add")} />
              <ActionCard icon={<UploadCloud size={18} />} title="Bulk import rules" description="Use the import wizard for spreadsheet mapping and validation." actionLabel="Import Products" onClick={() => navigateTo("inventory", "inventory:import")} />
              <ActionCard icon={<Database size={18} />} title="Stock ledger" description="Audit stock movements and operations from Inventory." actionLabel="Open Ledger" onClick={() => navigateTo("inventory", "inventory:stock")} />
            </div>
          </Card>
        </div>
      )}

      {activeTab === "users" && (
        <div className="space-y-6">
          <Card title="User profile" subtitle="Local display preferences for this browser. Identity is provided by Clerk." icon={<UserCog size={18} />} actions={<SaveBadge state={profileSaveState} />} className="border border-gray-100">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Input label="Display Name" name="username" value={userSettings.username} onChange={handleUserSettingsChange} placeholder="Display name" />
              <Input label="Email" name="email" type="email" value={userSettings.email} onChange={handleUserSettingsChange} disabled />
              <Input label="Preferred Name" name="preferredName" value={userSettings.preferredName} onChange={handleUserSettingsChange} placeholder="Shown in local UI notes" />
              <FieldLabel label="Role">
                <select name="displayRole" value={userSettings.displayRole} onChange={handleUserSettingsChange} className={selectClass} disabled>
                  <option value="admin">Admin / Owner</option>
                  <option value="manager">Manager</option>
                  <option value="staff">Staff</option>
                </select>
              </FieldLabel>
            </div>
            <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-100 pt-4">
              <Button variant="primary" onClick={saveUserSettings}>Save profile preferences</Button>
              <Button variant="outline" onClick={() => setTab("team")} disabled={!memberScope?.modules?.team}>Manage team</Button>
            </div>
          </Card>

          <Card title="Authentication" subtitle="CeyPOS account security is managed by Clerk." icon={<Lock size={18} />} className="border border-gray-100">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <SettingsNotice>Password, social login and MFA setup are controlled by the authentication provider. Use the Clerk account menu when enabled.</SettingsNotice>
              <ActionCard icon={<ShieldCheck size={18} />} title="Security tab" description="Configure app-side login alerts and terminal idle preferences." actionLabel="Open security" onClick={() => setTab("security")} />
              <ActionCard icon={<LifeBuoy size={18} />} title="Need account help?" description="Open Support for account, login and billing support." actionLabel="Contact support" onClick={() => navigateTo("support", "support:contact")} />
            </div>
          </Card>
        </div>
      )}

      {activeTab === "team" && memberScope?.modules?.team && <TeamSettings />}

      {activeTab === "notifications" && (
        <Card title="Notification preferences" subtitle="These save automatically to the shop database." icon={<Bell size={18} />} actions={<SaveBadge state={notificationSaveState} idleText="Auto-save" />} className="border border-gray-100">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {[
              ["emailNotifications", "Email Notifications", "Receive notifications via email."],
              ["inAppNotifications", "In-app Notifications", "Show realtime alerts in the notification inbox."],
              ["lowStockAlerts", "Low Stock Alerts", "Get notified when products are running low."],
              ["dailyReports", "Daily Sales Reports", "Receive daily sales summary reports."],
              ["salesAlerts", "Real-time Sales Alerts", "Get instant notifications for new sales."],
              ["systemUpdates", "System Updates", "Receive notifications about system updates."],
            ].map(([key, label, description]) => (
              <ToggleRow key={key} title={label} description={description} checked={Boolean(notifications[key as keyof typeof notifications])} onChange={() => handleNotificationChange(key as keyof typeof notifications)} />
            ))}
          </div>
        </Card>
      )}

      {activeTab === "security" && (
        <div className="space-y-6">
          <Card title="App security" subtitle="Preferences that control local terminal behavior." icon={<ShieldCheck size={18} />} actions={<SaveBadge state={securitySaveState} idleText="Local browser" />} className="border border-gray-100">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <FieldLabel label="Session timeout">
                <select value={security.sessionTimeout} onChange={(event) => setSecurity((prev) => ({ ...prev, sessionTimeout: event.target.value }))} className={selectClass}>
                  <option value="30m">30 minutes</option>
                  <option value="1h">1 hour</option>
                  <option value="4h">4 hours</option>
                  <option value="never">Never on this device</option>
                </select>
              </FieldLabel>
              <ToggleRow title="Login alerts" description="Notify this user when new sign-in events are detected." checked={security.loginAlerts} onChange={() => setSecurity((prev) => ({ ...prev, loginAlerts: !prev.loginAlerts }))} />
              <ToggleRow title="Manager approval for high discounts" description="Keep manager approval prompts enabled for unusual checkout discounts." checked={security.requireManagerForDiscounts} onChange={() => setSecurity((prev) => ({ ...prev, requireManagerForDiscounts: !prev.requireManagerForDiscounts }))} />
              <ToggleRow title="Lock terminal on idle" description="Require staff to re-enter terminal flow after idle timeout." checked={security.lockTerminalOnIdle} onChange={() => setSecurity((prev) => ({ ...prev, lockTerminalOnIdle: !prev.lockTerminalOnIdle }))} />
            </div>
            <div className="mt-6 flex gap-3 border-t border-gray-100 pt-4">
              <Button variant="primary" onClick={saveSecurity}>Save security preferences</Button>
              <Button variant="outline" onClick={() => navigateTo("sessions")}>Review terminals</Button>
            </div>
          </Card>
          <SettingsNotice tone="warning">Authentication-level controls such as MFA and password changes are intentionally handled by Clerk, not by local app state.</SettingsNotice>
        </div>
      )}

      {activeTab === "appearance" && (
        <Card title="Appearance settings" subtitle="Local browser preferences for layout and interface density." icon={<Palette size={18} />} actions={<SaveBadge state={appearanceSaveState} idleText="Local browser" />} className="border border-gray-100">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <FieldLabel label="Theme">
              <select value={appearance.theme} onChange={(event) => setAppearance((prev) => ({ ...prev, theme: event.target.value }))} className={selectClass}>
                <option value="light">Light</option>
                <option value="dark">Dark-ready</option>
                <option value="auto">Auto (System)</option>
              </select>
            </FieldLabel>
            <FieldLabel label="Language">
              <select value={appearance.language} onChange={(event) => setAppearance((prev) => ({ ...prev, language: event.target.value }))} className={selectClass}>
                <option value="en">English</option>
                <option value="si">Sinhala</option>
                <option value="ta">Tamil</option>
              </select>
            </FieldLabel>
            <FieldLabel label="Density">
              <select value={appearance.density} onChange={(event) => setAppearance((prev) => ({ ...prev, density: event.target.value }))} className={selectClass}>
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
                <option value="spacious">Spacious</option>
              </select>
            </FieldLabel>
            <ToggleRow title="Compact mode" description="Use tighter spacing on dense operational screens." checked={appearance.compactMode} onChange={() => setAppearance((prev) => ({ ...prev, compactMode: !prev.compactMode, density: !prev.compactMode ? "compact" : prev.density }))} />
            <ToggleRow title="Sidebar hints" description="Show short helper labels where the layout has room." checked={appearance.showSidebarHints} onChange={() => setAppearance((prev) => ({ ...prev, showSidebarHints: !prev.showSidebarHints }))} />
          </div>
          <div className="mt-6 border-t border-gray-100 pt-4">
            <Button variant="primary" onClick={saveAppearance}>Save appearance</Button>
          </div>
        </Card>
      )}

      {activeTab === "backup" && (
        <div className="space-y-6">
          <Card title="Backup & data cards" subtitle="Export, import and route to dedicated data workflows." icon={<Database size={18} />} className="border border-gray-100">
            <input ref={backupInputRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleImportBackupFile(file);
            }} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <ActionCard icon={<Download size={18} />} title="Export shop data" description="Download products, sales, payment methods, business rules and selected settings." actionLabel="Download JSON" onClick={handleExportData} />
              <ActionCard icon={<UploadCloud size={18} />} title="Import backup products" description="Restore product records from a CeyPOS JSON export file." actionLabel="Choose file" onClick={() => backupInputRef.current?.click()} />
              <ActionCard icon={<UploadCloud size={18} />} title="Import wizard" description="For spreadsheet product import, use the full inventory import wizard." actionLabel="Open wizard" onClick={() => navigateTo("inventory", "inventory:import")} />
              <ActionCard icon={<FileText size={18} />} title="Reports export" description="For sales/inventory/customer reports, export from the Reports module." actionLabel="Open reports" onClick={() => navigateTo("reports", "reports:sales")} />
            </div>
            {backupStatus && <div className="mt-5"><SettingsNotice tone={backupStatus.tone}>{backupStatus.message}</SettingsNotice></div>}
          </Card>

          <Card title="Automatic backup preferences" subtitle="Stored locally until cloud backup scheduling is connected." icon={<RefreshCcw size={18} />} className="border border-gray-100">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ToggleRow title="Automatic backups" description="Keep reminders and backup preferences enabled for this shop." checked={backup.autoBackup} onChange={() => saveBackupSettings({ ...backup, autoBackup: !backup.autoBackup })} />
              <FieldLabel label="Backup frequency">
                <select value={backup.frequency} onChange={(event) => saveBackupSettings({ ...backup, frequency: event.target.value })} className={selectClass}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </FieldLabel>
              <ToggleRow title="Include products" description="Include catalog and stock data in manual exports." checked={backup.includeProducts} onChange={() => saveBackupSettings({ ...backup, includeProducts: !backup.includeProducts })} />
              <ToggleRow title="Include sales" description="Include transaction history in manual exports." checked={backup.includeSales} onChange={() => saveBackupSettings({ ...backup, includeSales: !backup.includeSales })} />
              <ToggleRow title="Include settings" description="Include local preferences and printer settings in exports." checked={backup.includeSettings} onChange={() => saveBackupSettings({ ...backup, includeSettings: !backup.includeSettings })} />
            </div>
            <p className="mt-4 text-xs text-gray-500">Last manual export: {backup.lastExportAt ? new Date(backup.lastExportAt).toLocaleString() : "Not exported from this browser yet"}</p>
          </Card>

          <Card title="Danger zone" subtitle="Destructive shop-wide actions require support/admin confirmation." icon={<AlertTriangle size={18} />} className="border border-red-100 bg-red-50/20">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ActionCard icon={<AlertTriangle size={18} />} title="Delete all shop data" description="Disabled here by design. This requires verified owner/admin recovery checks." actionLabel="Protected action" disabled tone="danger" onClick={() => undefined} />
              <ActionCard icon={<LifeBuoy size={18} />} title="Request data help" description="Open Support for restore, export or deletion requests that need human confirmation." actionLabel="Open support" onClick={() => navigateTo("support", "support:contact")} />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
