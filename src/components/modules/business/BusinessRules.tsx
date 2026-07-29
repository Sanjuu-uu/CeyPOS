import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/Button';
import { useApp } from '../../../context/AppContext';
import { db } from '../../../lib/db';
import { getSearchHash } from '../../../lib/navigationSearch';

// Import sub-components
import { LoyaltySettings } from './LoyaltySettings';
import { DiscountSettings } from './DiscountSettings';
import { TaxSettings } from './TaxSettings';
import { SurchargeSettings } from './SurchargeSettings';

// --- TYPES ---

export interface LoyaltyConfig {
  enabled: boolean;
  earnRate: number | string;
  redeemRate: number | string;
  minPointsToRedeem: number | string;
}

export interface DiscountRule {
  id: number | string;
  name: string;
  type: 'fixed' | 'percent';
  value: number | string;
}

export interface TaxRule {
  id: number | string;
  name: string;
  rate: number | string;
  isDefault: boolean;
}

export interface SurchargeRule {
  id: number | string;
  minAmount: number | string;
  type: 'fixed' | 'percent';
  value: number | string;
}

export type AddItemFn = <T extends { id: string | number }>(
  setter: React.Dispatch<React.SetStateAction<T[]>>,
  template: Omit<T, 'id'>,
) => void;

// Fix 2: Define DB Interface to avoid @ts-ignore
interface BusinessRulesData {
  loyalty: LoyaltyConfig;
  discounts: DiscountRule[];
  taxes: TaxRule[];
  surcharges: SurchargeRule[];
}

interface DatabaseService {
  businessRules?: {
    get: () => BusinessRulesData;
    save: (data: BusinessRulesData) => Promise<void>;
  };
  on: (event: string, cb: () => void) => () => void;
}

// Cast db to typed interface
const database = db as unknown as DatabaseService;

// Fix 1: Robust ID Generation with Fallback
const generateId = (): string => {
  // Check if crypto.randomUUID is supported (modern browsers / Node 19+)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const ensureUniqueId = <T extends { id?: string | number }>(item: T): T & {
  id: string | number;
} => ({
  ...item,
  id: item.id ?? generateId(),
});

type TabKey = 'loyalty' | 'discounts' | 'taxes' | 'surcharges';

const NAV_TABS: ReadonlyArray<{
  id: TabKey;
  label: string;
}> = [
  { id: 'loyalty', label: 'Loyalty Points' },
  { id: 'discounts', label: 'Discounts' },
  { id: 'taxes', label: 'Tax Rates' },
  { id: 'surcharges', label: 'Surcharges' },
] as const;

export const BusinessRules: React.FC = () => {
  const { currentShop } = useApp();
  const currencySymbol = currentShop?.currency ?? '$';

  const [activeTab, setActiveTab] = useState<TabKey>('loyalty');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const tabs: TabKey[] = ['loyalty', 'discounts', 'taxes', 'surcharges'];
    const applySearchHash = () => {
      const hash = getSearchHash();
      const tab = hash.startsWith('business:') ? hash.split(':')[1] : '';
      if (tabs.includes(tab as TabKey)) setActiveTab(tab as TabKey);
    };

    applySearchHash();
    window.addEventListener('hashchange', applySearchHash);
    return () => window.removeEventListener('hashchange', applySearchHash);
  }, []);

  // --- STATE ---
  const [loyalty, setLoyalty] = useState<LoyaltyConfig>({
    enabled: false,
    earnRate: 1,
    redeemRate: 0.01,
    minPointsToRedeem: 0
  });

  const [discounts, setDiscounts] = useState<DiscountRule[]>([]);
  const [taxes, setTaxes] = useState<TaxRule[]>([]);
  const [surcharges, setSurcharges] = useState<SurchargeRule[]>([]);

  // Load Data
  useEffect(() => {
    const loadData = () => {
      const rules = database.businessRules?.get();
      if (rules) {
        setLoyalty(rules.loyalty);
        setDiscounts((rules.discounts ?? []).map(ensureUniqueId));
        setTaxes((rules.taxes ?? []).map(ensureUniqueId));
        setSurcharges((rules.surcharges ?? []).map(ensureUniqueId));
      }
    };

    loadData();

    const unsubscribe = database.on('businessRulesUpdated', loadData);
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
        // Sanitize numbers before saving (Handles Issue 4)
        const cleanState: BusinessRulesData = {
          loyalty: {
            ...loyalty,
            earnRate: Number(loyalty.earnRate) || 0,
            redeemRate: Number(loyalty.redeemRate) || 0,
            minPointsToRedeem: Number(loyalty.minPointsToRedeem) || 0,
          },
          discounts: discounts.map((rule) => ({
            ...rule,
            value: Number(rule.value) || 0,
          })),
          taxes: taxes.map((rule) => ({
            ...rule,
            rate: Number(rule.rate) || 0,
          })),
          surcharges: surcharges.map((rule) => ({
            ...rule,
            minAmount: Number(rule.minAmount) || 0,
            value: Number(rule.value) || 0,
          })),
        };

        if (database.businessRules) {
            await database.businessRules.save(cleanState);
        }
    } catch (err) {
        console.error("Failed to save rules:", err);
    } finally {
        setIsSaving(false);
    }
  };

  // Fix 3: Strongly Typed addItem Generic
  const addItem: AddItemFn = (setter, template) => {
    setter((previous) => {
      type Item = typeof previous[number];
      const nextItem = { ...template, id: generateId() } as Item;
      return [...previous, nextItem];
    });
  };

  return (
    <div className="flex h-full flex-col bg-transparent">
      
      {/* --- Header Section --- */}
      <div className="page-action-row sticky top-0 z-20 mb-5 border-b border-transparent bg-transparent">
        <div>
           <p className="page-subheading mt-2">Manage loyalty rules and reward settings</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className={`${
            isSaving ? 'bg-gray-100 text-gray-400' : 'bg-[#c5f542] text-black hover:bg-[#b8ea34]'
          }`}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-hidden">
        
        {/* --- Sidebar Navigation --- */}
        <div className="module-tabs">
          {NAV_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`module-tab ${
                activeTab === tab.id 
                  ? 'module-tab-active' 
                  : ''
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* --- Main Content Area --- */}
        <div className="flex-1 overflow-y-auto bg-transparent">
          <div className="max-w-5xl mx-auto">
            {activeTab === 'loyalty' && <LoyaltySettings loyalty={loyalty} setLoyalty={setLoyalty} currencySymbol={currencySymbol} />}
            {activeTab === 'discounts' && <DiscountSettings discounts={discounts} setDiscounts={setDiscounts} addItem={addItem} currencySymbol={currencySymbol} />}
            {activeTab === 'taxes' && <TaxSettings taxes={taxes} setTaxes={setTaxes} addItem={addItem} />}
            {activeTab === 'surcharges' && <SurchargeSettings surcharges={surcharges} setSurcharges={setSurcharges} addItem={addItem} currencySymbol={currencySymbol} />}
          </div>
        </div>
      </div>
    </div>
  );
};
