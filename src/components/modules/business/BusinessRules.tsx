import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/Button';
import { useApp } from '../../../context/AppContext';
import { db } from '../../../lib/db';
import { Award, Percent, CreditCard, Landmark, Save } from 'lucide-react';

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
        save: (data: any) => Promise<void>;
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

const ensureUniqueId = (item: any) => ({
  ...item,
  id: item.id || generateId()
});

export const BusinessRules: React.FC = () => {
  const { currentShop } = useApp();
  const currencySymbol = (currentShop as any)?.currency || '$';

  const [activeTab, setActiveTab] = useState<'loyalty' | 'discounts' | 'taxes' | 'surcharges'>('loyalty');
  const [isSaving, setIsSaving] = useState(false);

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
        // Fix 2: Safe DB Access
        const rules = database.businessRules?.get();
        if (rules) {
            setLoyalty(rules.loyalty);
            setDiscounts((rules.discounts || []).map(ensureUniqueId));
            setTaxes((rules.taxes || []).map(ensureUniqueId));
            setSurcharges((rules.surcharges || []).map(ensureUniqueId));
        }
    };
    loadData();
    
    const unsub = database.on('businessRulesUpdated', loadData);
    return () => { unsub && unsub(); };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
        // Sanitize numbers before saving (Handles Issue 4)
        const cleanState = {
            loyalty: { 
                ...loyalty, 
                earnRate: Number(loyalty.earnRate) || 0, 
                redeemRate: Number(loyalty.redeemRate) || 0, 
                minPointsToRedeem: Number(loyalty.minPointsToRedeem) || 0 
            },
            discounts: discounts.map(d => ({ ...d, value: Number(d.value) || 0 })),
            taxes: taxes.map(t => ({ ...t, rate: Number(t.rate) || 0 })),
            surcharges: surcharges.map(s => ({ ...s, minAmount: Number(s.minAmount) || 0, value: Number(s.value) || 0 }))
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
  const addItem = <T extends { id: string | number }>(
    setter: React.Dispatch<React.SetStateAction<T[]>>, 
    template: Omit<T, 'id'>
  ) => {
    // Cast result to T to satisfy compiler that id is present
    setter((prev) => [...prev, { ...template, id: generateId() } as unknown as T]);
  };

  return (
    <div className="flex flex-col h-full bg-white/50">
      
      {/* --- Header Section --- */}
      <div className="px-8 py-6 bg-white border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20 shadow-sm">
        <div>
           <h1 className="text-2xl font-black text-gray-900 tracking-tight">Configuration</h1>
           <p className="text-gray-500 font-medium text-sm mt-1">Manage core business rules and automations.</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className={`h-12 px-6 rounded-full font-bold text-sm transition-all shadow-lg hover:shadow-xl ${
            isSaving ? 'bg-gray-100 text-gray-400' : 'bg-[#ecff76] text-black hover:bg-[#d9ec60] hover:scale-105'
          }`}
        >
          {isSaving ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/>
              Saving...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Save size={18} />
              Save Changes
            </div>
          )}
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* --- Sidebar Navigation --- */}
        <div className="w-full md:w-64 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-200 p-4 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible">
          {[
            { id: 'loyalty', label: 'Loyalty Points', icon: Award, desc: 'Rewards program' },
            { id: 'discounts', label: 'Discounts', icon: Percent, desc: 'Sales & offers' },
            { id: 'taxes', label: 'Tax Rates', icon: Landmark, desc: 'VAT & Service fees' },
            { id: 'surcharges', label: 'Surcharges', icon: CreditCard, desc: 'Payment fees' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all text-left group min-w-[200px] md:min-w-0 ${
                activeTab === tab.id 
                  ? 'bg-white shadow-md border border-gray-100' 
                  : 'hover:bg-gray-100 border border-transparent'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                activeTab === tab.id ? 'bg-[#ecff76] text-black' : 'bg-gray-200 text-gray-500 group-hover:bg-gray-300'
              }`}>
                <tab.icon size={20} />
              </div>
              <div>
                <div className={`font-bold text-sm ${activeTab === tab.id ? 'text-gray-900' : 'text-gray-600'}`}>
                  {tab.label}
                </div>
                <div className="text-xs text-gray-400 font-medium">{tab.desc}</div>
              </div>
            </button>
          ))}
        </div>

        {/* --- Main Content Area --- */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-white/50">
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