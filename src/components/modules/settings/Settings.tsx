import React, { useState, useEffect } from "react";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import {
  Store,
  User,
  Bell,
  Shield,
  Palette,
  Database,
  Save,
  Upload,
  Download,
  Trash2,
  Eye,
  EyeOff,
  Keyboard,
  CheckCircle2,
} from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { db } from "../../../lib/db";
import { KeyboardShortcuts } from "../../../types";

// --- NEW: KEYBOARD SETTINGS SUB-COMPONENT ---
const KeyboardSettings: React.FC = () => {
  // Default fallbacks in case db.ts hasn't been updated with the new keys yet
  const defaultShortcuts: KeyboardShortcuts = {
    focusSearch: "F1",
    checkout: "F2",
    clearCart: "F3",
    togglePayment: "F4",
    addCustomer: "F5",
    confirmPayment: "Enter",
    increaseQuantity: "+",
    decreaseQuantity: "-",
  };

  const [shortcuts, setShortcuts] = useState<KeyboardShortcuts>({
    ...defaultShortcuts,
    ...(db.shortcuts.get() || {}),
  });
  const [savedStatus, setSavedStatus] = useState(false);

  const handleKeyRecord = (
    e: React.KeyboardEvent<HTMLInputElement>,
    action: keyof KeyboardShortcuts,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Ignore pure modifier keys
    if (["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab"].includes(e.key))
      return;

    let keyName = e.key;
    if (keyName === " ") keyName = "Space";
    if (keyName.length === 1 && keyName.match(/[a-z]/i))
      keyName = keyName.toUpperCase();

    setShortcuts((prev) => ({ ...prev, [action]: keyName }));
    setSavedStatus(false);
  };

  const handleSave = () => {
    db.shortcuts.save(shortcuts);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 3000);
  };

  return (
    <div className="space-y-6">
      <Card title="Customizable Shortcuts" className="border border-gray-100">
        <p className="text-sm text-gray-500 mb-6">
          Click on any input field and press a key to assign a new shortcut for
          this terminal.
        </p>
        <div className="space-y-3">
          {[
            {
              id: "focusSearch",
              label: "Focus Search/Barcode",
              desc: "Jump to the search bar",
            },
            {
              id: "checkout",
              label: "Checkout",
              desc: "Jump to the payment screen",
            },
            {
              id: "clearCart",
              label: "Clear Cart",
              desc: "Wipe current transaction",
            },
            {
              id: "togglePayment",
              label: "Toggle Payment",
              desc: "Cycle Cash/Card/QR",
            },
            {
              id: "addCustomer",
              label: "Add Customer",
              desc: "Focus customer lookup/name field",
            },
            {
              id: "confirmPayment",
              label: "Confirm Payment",
              desc: "Finalize sale on checkout screen",
            },
            {
              id: "increaseQuantity",
              label: "Increase Quantity",
              desc: "Add +1 to last scanned item",
            },
            {
              id: "decreaseQuantity",
              label: "Decrease Quantity",
              desc: "Remove -1 from last scanned item",
            },
          ].map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div>
                <p className="font-medium text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
              <div className="w-48">
                <input
                  type="text"
                  value={shortcuts[item.id as keyof KeyboardShortcuts]}
                  onKeyDown={(e) =>
                    handleKeyRecord(e, item.id as keyof KeyboardShortcuts)
                  }
                  readOnly
                  placeholder="Press key..."
                  className="w-full text-center font-mono font-bold text-verde-primary bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-verde-primary focus:border-verde-primary cursor-pointer shadow-sm transition-all"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-4 pt-4 border-t border-gray-100">
          <Button
            variant="primary"
            icon={<Save size={16} />}
            onClick={handleSave}
          >
            Save Keybindings
          </Button>
          {savedStatus && (
            <span className="text-green-600 text-sm font-bold flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 size={16} /> Saved to this device
            </span>
          )}
        </div>
      </Card>

      <Card title="System Hotkeys (Fixed)" className="border border-gray-100">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="font-medium text-gray-900">Quick Select Product</p>
              <p className="text-xs text-gray-500">
                Adds item from visible grid to cart
              </p>
            </div>
            <div className="flex gap-1">
              <span className="font-mono font-bold text-gray-600 bg-white border border-gray-300 rounded px-3 py-1">
                1
              </span>
              <span className="text-gray-400 mt-1">-</span>
              <span className="font-mono font-bold text-gray-600 bg-white border border-gray-300 rounded px-3 py-1">
                9
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="font-medium text-gray-900">Hardware Scanner</p>
              <p className="text-xs text-gray-500">
                Auto-detects rapid barcode input
              </p>
            </div>
            <div className="font-mono font-bold text-gray-600 bg-white border border-gray-300 rounded px-3 py-1">
              Auto
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

// --- MAIN SETTINGS COMPONENT ---
export const Settings: React.FC = () => {
  const { currentShop, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<
    | "general"
    | "users"
    | "notifications"
    | "security"
    | "appearance"
    | "backup"
    | "keybindings"
  >("general");
  const [showPassword, setShowPassword] = useState(false);

  // Shop settings state
  const [shopSettings, setShopSettings] = useState({
    name: currentShop?.name || "",
    address: currentShop?.address || "",
    contact: currentShop?.contact || "",
    email: "",
    website: "",
    currency: "USD",
    timezone: "America/New_York",
    taxRate: "8.5",
    receiptMessage: "Thank you for your business!",
  });

  // User settings state
  const [userSettings, setUserSettings] = useState({
    username: currentUser?.name || "",
    email: currentUser?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    lowStockAlerts: true,
    dailyReports: false,
    salesAlerts: true,
    systemUpdates: true,
  });

  // Appearance settings
  const [appearance, setAppearance] = useState({
    theme: "light",
    compactMode: false,
    showSidebar: true,
    language: "en",
  });

  const handleShopSettingsChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setShopSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleUserSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleNotificationChange = (setting: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [setting]: !prev[setting] }));
  };

  const handleAppearanceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAppearance((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveSettings = () => {
    console.log("Saving settings...");
  };

  const handleExportData = () => {
    console.log("Exporting data...");
  };

  const handleImportData = () => {
    console.log("Importing data...");
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="heading-h2">Settings</h1>
        <Button
          variant="primary"
          icon={<Save size={16} />}
          onClick={handleSaveSettings}
        >
          Save Changes
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 overflow-x-auto no-scrollbar">
        <nav className="-mb-px flex space-x-8 min-w-max">
          {[
            { id: "general", label: "General", icon: <Store size={16} /> },
            { id: "users", label: "Users", icon: <User size={16} /> },
            {
              id: "keybindings",
              label: "Keybindings",
              icon: <Keyboard size={16} />,
            },
            {
              id: "notifications",
              label: "Notifications",
              icon: <Bell size={16} />,
            },
            { id: "security", label: "Security", icon: <Shield size={16} /> },
            {
              id: "appearance",
              label: "Appearance",
              icon: <Palette size={16} />,
            },
            {
              id: "backup",
              label: "Backup & Data",
              icon: <Database size={16} />,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-verde-primary text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "keybindings" && <KeyboardSettings />}

      {/* General Settings Tab */}
      {activeTab === "general" && (
        <div className="space-y-6">
          <Card title="Shop Information" className="border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Shop Name"
                name="name"
                value={shopSettings.name}
                onChange={handleShopSettingsChange}
                placeholder="Enter shop name"
              />
              <Input
                label="Contact Number"
                name="contact"
                value={shopSettings.contact}
                onChange={handleShopSettingsChange}
                placeholder="Enter contact number"
              />
              <Input
                label="Email Address"
                name="email"
                type="email"
                value={shopSettings.email}
                onChange={handleShopSettingsChange}
                placeholder="Enter email address"
              />
              <Input
                label="Website"
                name="website"
                value={shopSettings.website}
                onChange={handleShopSettingsChange}
                placeholder="Enter website URL"
              />
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  name="address"
                  value={shopSettings.address}
                  onChange={handleShopSettingsChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-verde-primary focus:border-verde-primary"
                  placeholder="Enter shop address"
                />
              </div>
            </div>
          </Card>

          <Card title="Business Settings" className="border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <select
                  name="currency"
                  value={shopSettings.currency}
                  onChange={handleShopSettingsChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-verde-primary focus:border-verde-primary"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone
                </label>
                <select
                  name="timezone"
                  value={shopSettings.timezone}
                  onChange={handleShopSettingsChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-verde-primary focus:border-verde-primary"
                >
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                </select>
              </div>
              <Input
                label="Tax Rate (%)"
                name="taxRate"
                type="number"
                value={shopSettings.taxRate}
                onChange={handleShopSettingsChange}
                placeholder="Enter tax rate"
              />
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Receipt Message
                </label>
                <textarea
                  name="receiptMessage"
                  value={shopSettings.receiptMessage}
                  onChange={handleShopSettingsChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-verde-primary focus:border-verde-primary"
                  placeholder="Enter receipt message"
                />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="space-y-6">
          <Card title="User Profile" className="border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Username"
                name="username"
                value={userSettings.username}
                onChange={handleUserSettingsChange}
                placeholder="Enter username"
              />
              <Input
                label="Email"
                name="email"
                type="email"
                value={userSettings.email}
                onChange={handleUserSettingsChange}
                placeholder="Enter email"
              />
            </div>
          </Card>

          <Card title="Change Password" className="border border-gray-100">
            <div className="space-y-4">
              <Input
                label="Current Password"
                name="currentPassword"
                type={showPassword ? "text" : "password"}
                value={userSettings.currentPassword}
                onChange={handleUserSettingsChange}
                placeholder="Enter current password"
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="New Password"
                  name="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={userSettings.newPassword}
                  onChange={handleUserSettingsChange}
                  placeholder="Enter new password"
                />
                <Input
                  label="Confirm Password"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={userSettings.confirmPassword}
                  onChange={handleUserSettingsChange}
                  placeholder="Confirm new password"
                />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <Card
          title="Notification Preferences"
          className="border border-gray-100"
        >
          <div className="space-y-4">
            {Object.entries({
              emailNotifications: "Email Notifications",
              lowStockAlerts: "Low Stock Alerts",
              dailyReports: "Daily Sales Reports",
              salesAlerts: "Real-time Sales Alerts",
              systemUpdates: "System Updates",
            }).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{label}</p>
                  <p className="text-sm text-gray-500">
                    {key === "emailNotifications" &&
                      "Receive notifications via email"}
                    {key === "lowStockAlerts" &&
                      "Get notified when products are running low"}
                    {key === "dailyReports" &&
                      "Receive daily sales summary reports"}
                    {key === "salesAlerts" &&
                      "Get instant notifications for new sales"}
                    {key === "systemUpdates" &&
                      "Receive notifications about system updates"}
                  </p>
                </div>
                <button
                  onClick={() =>
                    handleNotificationChange(key as keyof typeof notifications)
                  }
                  className={`w-12 h-6 rounded-full transition-colors ${
                    notifications[key as keyof typeof notifications]
                      ? "bg-verde-primary"
                      : "bg-gray-200"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      notifications[key as keyof typeof notifications]
                        ? "translate-x-6"
                        : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Security Tab */}
      {activeTab === "security" && (
        <div className="space-y-6">
          <Card title="Security Settings" className="border border-gray-100">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    Two-Factor Authentication
                  </p>
                  <p className="text-sm text-gray-500">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Enable 2FA
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Session Timeout</p>
                  <p className="text-sm text-gray-500">
                    Automatically log out after inactivity
                  </p>
                </div>
                <select className="px-3 py-1 border border-gray-300 rounded text-sm outline-none focus:border-verde-primary">
                  <option>30 minutes</option>
                  <option>1 hour</option>
                  <option>4 hours</option>
                  <option>Never</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Login Alerts</p>
                  <p className="text-sm text-gray-500">
                    Get notified of new login attempts
                  </p>
                </div>
                <button className="w-12 h-6 rounded-full bg-verde-primary">
                  <div className="w-5 h-5 bg-white rounded-full shadow translate-x-6" />
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Appearance Tab */}
      {activeTab === "appearance" && (
        <Card title="Appearance Settings" className="border border-gray-100">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Theme
              </label>
              <select
                name="theme"
                value={appearance.theme}
                onChange={handleAppearanceChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-verde-primary focus:border-verde-primary"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto (System)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <select
                name="language"
                value={appearance.language}
                onChange={handleAppearanceChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-verde-primary focus:border-verde-primary"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Compact Mode</p>
                  <p className="text-sm text-gray-500">
                    Use smaller UI elements
                  </p>
                </div>
                <button className="w-12 h-6 rounded-full bg-gray-200">
                  <div className="w-5 h-5 bg-white rounded-full shadow translate-x-0.5" />
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Backup & Data Tab */}
      {activeTab === "backup" && (
        <div className="space-y-6">
          <Card title="Data Management" className="border border-gray-100">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Export Data</p>
                  <p className="text-sm text-gray-500">
                    Download your shop data as a backup
                  </p>
                </div>
                <Button
                  variant="outline"
                  icon={<Download size={16} />}
                  onClick={handleExportData}
                >
                  Export
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Import Data</p>
                  <p className="text-sm text-gray-500">
                    Restore data from a backup file
                  </p>
                </div>
                <Button
                  variant="outline"
                  icon={<Upload size={16} />}
                  onClick={handleImportData}
                >
                  Import
                </Button>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-red-600">Danger Zone</p>
                    <p className="text-sm text-gray-500">
                      Permanently delete all shop data
                    </p>
                  </div>
                  <button className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition-colors">
                    <Trash2 size={16} /> Delete All Data
                  </button>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Auto Backup" className="border border-gray-100">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Automatic Backups</p>
                  <p className="text-sm text-gray-500">
                    Automatically backup your data
                  </p>
                </div>
                <button className="w-12 h-6 rounded-full bg-verde-primary">
                  <div className="w-5 h-5 bg-white rounded-full shadow translate-x-6" />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Backup Frequency
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-verde-primary focus:border-verde-primary">
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                </select>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Last backup: March 15, 2024 at 2:30 AM
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
