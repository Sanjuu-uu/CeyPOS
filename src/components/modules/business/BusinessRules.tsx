import React, { useState, useEffect } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { useApp } from '../../../context/AppContext';
import { db } from '../../../lib/db';
import { 
  Award, 
  Percent, 
  CreditCard, 
  Landmark, 
  Save, 
  Plus, 
  Trash2, 
  AlertCircle,
  Check,
  X as XIcon,
  ArrowRight
} from 'lucide-react';

// --- Components ---

// 1. Robust Numeric Input
const NumericInput = ({ 
  value, 
  onChange, 
  className = "", 
  placeholder,
  prefix,
  suffix,
  ...props 
}: { 
  value: number | string; 
  onChange: (val: string | number) => void;
  className?: string;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  [key: string]: any;
}) => (
  <div className={`flex items-center bg-white border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-[#ecff76] focus-within:border-transparent transition-all overflow-hidden h-12 shadow-sm ${className}`}>
    {prefix && (
      <span className="pl-4 pr-2 text-gray-500 text-sm font-bold select-none border-r border-gray-100 h-full flex items-center bg-gray-50">
        {prefix}
      </span>
    )}
    <input
      type="number"
      value={value === 0 ? 0 : (value || '')} 
      onChange={(e) => onChange(e.target.value)} 
      className="w-full h-full px-4 bg-transparent outline-none text-gray-900 placeholder:text-gray-300 font-bold"
      placeholder={placeholder}
      onWheel={(e) => e.currentTarget.blur()}
      {...props}
    />
    {suffix && (
      <span className="pr-4 pl-2 text-gray-500 text-sm font-bold select-none border-l border-gray-100 h-full flex items-center bg-gray-50">
        {suffix}
      </span>
    )}
  </div>
);

// 2. Custom Toggle Switch
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) => (
  <button 
    onClick={() => onChange(!checked)}
    className={`w-14 h-8 rounded-full transition-all duration-300 relative focus:outline-none shadow-inner ${
        checked ? 'bg-[#ecff76]' : 'bg-gray-200'
    }`}
  >
    <div 
        className={`w-6 h-6 bg-white rounded-full shadow-md absolute top-1 transition-transform duration-300 flex items-center justify-center ${
            checked ? 'translate-x-7' : 'translate-x-1'
        }`} 
    >
        {checked ? <Check size={12} className="text-black" /> : <XIcon size={12} className="text-gray-400" />}
    </div>
  </button>
);

export const BusinessRules: React.FC = () => {
  const { currentShop } = useApp();
  const currencySymbol = (currentShop as any)?.currency || '$';

  const [activeTab, setActiveTab] = useState<'loyalty' | 'discounts' | 'taxes' | 'surcharges'>('loyalty');
  const [isSaving, setIsSaving] = useState(false);

  // --- STATE ---
  const [loyalty, setLoyalty] = useState<{
    enabled: boolean;
    earnRate: number | string;
    redeemRate: number | string;
    minPointsToRedeem: number | string;
  }>({
    enabled: false,
    earnRate: 1,
    redeemRate: 0.01,
    minPointsToRedeem: 0
  });

  const [discounts, setDiscounts] = useState<Array<{ id: number; name: string; type: 'fixed' | 'percent'; value: number | string }>>([]);
  const [taxes, setTaxes] = useState<Array<{ id: number; name: string; rate: number | string; isDefault: boolean }>>([]);
  const [surcharges, setSurcharges] = useState<Array<{ id: number; minAmount: number | string; type: 'fixed' | 'percent'; value: number | string }>>([]);

  // Load Data
  useEffect(() => {
    const loadData = () => {
        // @ts-ignore
        const rules = db.businessRules?.get();
        if (rules) {
            setLoyalty(rules.loyalty);
            setDiscounts(mapIds(rules.discounts));
            setTaxes(mapIds(rules.taxes));
            setSurcharges(mapIds(rules.surcharges));
        }
    };
    loadData();
    // @ts-ignore
    const unsub = db.on('businessRulesUpdated', loadData);
    return () => { unsub && unsub(); };
  }, []);

  const mapIds = (arr: any[]) => (arr || []).map(item => ({ ...item, id: item.id || Date.now() + Math.random() }));

  const handleSave = async () => {
    setIsSaving(true);
    try {
        const cleanState = {
            loyalty: { ...loyalty, earnRate: Number(loyalty.earnRate) || 0, redeemRate: Number(loyalty.redeemRate) || 0, minPointsToRedeem: Number(loyalty.minPointsToRedeem) || 0 },
            discounts: discounts.map(d => ({ ...d, value: Number(d.value) || 0 })),
            taxes: taxes.map(t => ({ ...t, rate: Number(t.rate) || 0 })),
            surcharges: surcharges.map(s => ({ ...s, minAmount: Number(s.minAmount) || 0, value: Number(s.value) || 0 }))
        };
        // @ts-ignore
        await db.businessRules.save(cleanState);
        setTimeout(() => setIsSaving(false), 500);
    } catch (err) {
        console.error(err);
        setIsSaving(false);
    }
  };

  const addItem = (setter: any, template: any) => setter((prev: any) => [...prev, { ...template, id: Date.now() }]);

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
            
            {/* === LOYALTY TAB (REDESIGNED) === */}
            {activeTab === 'loyalty' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Status Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex items-center justify-between transition-colors hover:border-gray-300">
                    <div className="flex items-center gap-5">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors shadow-sm ${loyalty.enabled ? 'bg-[#ecff76] text-black' : 'bg-gray-100 text-gray-400'}`}>
                            <Award size={28} strokeWidth={2} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900">Loyalty Program</h2>
                            <p className="text-gray-500 font-medium text-sm mt-0.5">
                                {loyalty.enabled 
                                    ? "Active · Customers are currently earning points" 
                                    : "Inactive · Enable to start rewarding your customers"}
                            </p>
                        </div>
                    </div>
                    <Toggle checked={loyalty.enabled} onChange={(val) => setLoyalty({...loyalty, enabled: val})} />
                </div>

                {/* Rules Grid */}
                <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-all duration-500 ${!loyalty.enabled ? 'opacity-40 grayscale pointer-events-none blur-[1px]' : ''}`}>
                    
                    {/* Earning Strategy */}
                    <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm flex flex-col h-full relative overflow-hidden group hover:border-[#ecff76] transition-all hover:shadow-md">
                        <div className="absolute -right-6 -top-6 w-32 h-32 bg-blue-50 rounded-full opacity-50 blur-2xl group-hover:bg-[#ecff76]/20 transition-colors"></div>
                        
                        <div className="relative z-10 mb-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-600 mb-3 uppercase tracking-wider">
                                <Plus size={12} /> Earning Strategy
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">How customers earn</h3>
                            <p className="text-gray-500 text-sm mt-1">Set the exchange rate for spending.</p>
                        </div>

                        <div className="relative z-10 space-y-6 mt-auto">
                            <div className="bg-gray-50/80 p-5 rounded-2xl border border-gray-100">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Points Calculation</label>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold text-gray-500 whitespace-nowrap">Every</span>
                                    <NumericInput 
                                        value={loyalty.earnRate} 
                                        onChange={v => setLoyalty({...loyalty, earnRate: v})}
                                        prefix={currencySymbol}
                                        className="bg-white flex-1 font-mono text-lg"
                                        placeholder="0"
                                    />
                                    <span className="text-sm font-bold text-gray-500 whitespace-nowrap flex items-center gap-2">
                                        Spent <ArrowRight size={14}/> 1 Point
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 px-2">
                                <div className="w-1 h-8 bg-gray-200 rounded-full"></div>
                                <p className="text-xs text-gray-500 font-medium">
                                    <span className="font-bold text-gray-900">Preview:</span> A customer spending <span className="font-bold">{currencySymbol}100</span> will earn <span className="inline-flex items-center justify-center px-2 py-0.5 bg-black text-white rounded text-[10px] font-bold mx-1">{(100 / (Number(loyalty.earnRate) || 1)).toFixed(0)} PTS</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Redemption Strategy */}
                    <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm flex flex-col h-full relative overflow-hidden group hover:border-[#ecff76] transition-all hover:shadow-md">
                        <div className="absolute -right-6 -top-6 w-32 h-32 bg-purple-50 rounded-full opacity-50 blur-2xl group-hover:bg-[#ecff76]/20 transition-colors"></div>

                        <div className="relative z-10 mb-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-600 mb-3 uppercase tracking-wider">
                                <Award size={12} /> Redemption Strategy
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">How customers spend</h3>
                            <p className="text-gray-500 text-sm mt-1">Set the value of points and limits.</p>
                        </div>

                        <div className="relative z-10 space-y-4 mt-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">1 Point Value</label>
                                    <NumericInput 
                                        value={loyalty.redeemRate} 
                                        onChange={v => setLoyalty({...loyalty, redeemRate: v})}
                                        prefix={currencySymbol}
                                        className="bg-white font-mono"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Min. to Redeem</label>
                                    <NumericInput 
                                        value={loyalty.minPointsToRedeem} 
                                        onChange={v => setLoyalty({...loyalty, minPointsToRedeem: v})}
                                        suffix="PTS"
                                        className="bg-white font-mono"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 px-2">
                                <div className="w-1 h-8 bg-gray-200 rounded-full"></div>
                                <p className="text-xs text-gray-500 font-medium">
                                    <span className="font-bold text-gray-900">Preview:</span> 100 Points = <span className="font-bold text-green-600">{currencySymbol}{(Number(loyalty.redeemRate) * 100).toFixed(2)} Discount</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
              </div>
            )}

            {/* === DISCOUNTS (Refined) === */}
            {activeTab === 'discounts' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-bold text-gray-900">Active Discounts</h2>
                  <Button 
                    size="sm" 
                    onClick={() => addItem(setDiscounts, { name: "New Discount", type: 'percent', value: 0 })}
                    className="bg-black text-white hover:bg-gray-800 rounded-full px-4"
                  >
                    <Plus size={16} className="mr-2"/> Add Discount
                  </Button>
                </div>

                <div className="grid gap-4">
                  {discounts.map((discount, index) => (
                    <div key={discount.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-end group hover:border-gray-300 transition-colors">
                      <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-gray-400 mb-1 ml-1 uppercase">Label</label>
                        <input 
                          value={discount.name}
                          onChange={e => {
                            const n = [...discounts];
                            n[index].name = e.target.value;
                            setDiscounts(n);
                          }}
                          className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ecff76] focus:bg-white outline-none font-medium transition-all"
                          placeholder="Summer Sale"
                        />
                      </div>
                      <div className="w-full md:w-40">
                        <label className="block text-xs font-bold text-gray-400 mb-1 ml-1 uppercase">Type</label>
                        <select 
                          value={discount.type}
                          onChange={e => {
                            const n = [...discounts];
                            n[index].type = e.target.value as 'fixed' | 'percent';
                            setDiscounts(n);
                          }}
                          className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ecff76] focus:bg-white outline-none font-medium appearance-none cursor-pointer"
                        >
                          <option value="percent">Percent (%)</option>
                          <option value="fixed">Fixed ({currencySymbol})</option>
                        </select>
                      </div>
                      <div className="w-full md:w-32">
                        <label className="block text-xs font-bold text-gray-400 mb-1 ml-1 uppercase">Value</label>
                        <NumericInput 
                          value={discount.value}
                          onChange={v => {
                            const n = [...discounts];
                            n[index].value = v;
                            setDiscounts(n);
                          }}
                        />
                      </div>
                      <button 
                        onClick={() => setDiscounts(discounts.filter(d => d.id !== discount.id))}
                        className="h-12 w-12 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  {discounts.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                      <p className="text-gray-400 font-medium">No discounts configured yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* === TAXES (Refined) === */}
            {activeTab === 'taxes' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-bold text-gray-900">Tax Rates</h2>
                  <Button 
                    size="sm" 
                    onClick={() => addItem(setTaxes, { name: "New Tax", rate: 0, isDefault: false })}
                    className="bg-black text-white hover:bg-gray-800 rounded-full px-4"
                  >
                    <Plus size={16} className="mr-2"/> Add Tax
                  </Button>
                </div>

                <div className="grid gap-4">
                  {taxes.map((tax, index) => (
                    <div key={tax.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center group hover:border-gray-300 transition-colors">
                      <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-gray-400 mb-1 ml-1 uppercase">Tax Name</label>
                        <input 
                          value={tax.name}
                          onChange={e => {
                            const n = [...taxes];
                            n[index].name = e.target.value;
                            setTaxes(n);
                          }}
                          className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ecff76] focus:bg-white outline-none font-medium"
                          placeholder="VAT"
                        />
                      </div>
                      <div className="w-full md:w-32">
                        <label className="block text-xs font-bold text-gray-400 mb-1 ml-1 uppercase">Rate (%)</label>
                        <NumericInput 
                          value={tax.rate}
                          onChange={v => {
                            const n = [...taxes];
                            n[index].rate = v;
                            setTaxes(n);
                          }}
                        />
                      </div>
                      <div className="w-full md:w-auto h-12 flex items-center pt-5">
                        <label className="flex items-center gap-3 cursor-pointer select-none px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${tax.isDefault ? 'border-[#ecff76] bg-[#ecff76]' : 'border-gray-300'}`}>
                            {tax.isDefault && <Check size={12} className="text-black"/>}
                          </div>
                          <input 
                            type="checkbox"
                            checked={tax.isDefault}
                            onChange={e => {
                              const n = taxes.map(t => ({...t, isDefault: t.id === tax.id ? e.target.checked : (e.target.checked ? false : t.isDefault) }));
                              setTaxes(n);
                            }}
                            className="hidden"
                          />
                          <span className="text-sm font-bold text-gray-700">Default</span>
                        </label>
                      </div>
                      <div className="pt-5">
                        <button 
                            onClick={() => setTaxes(taxes.filter(t => t.id !== tax.id))}
                            className="h-12 w-12 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                        >
                            <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* === SURCHARGES (Refined) === */}
            {activeTab === 'surcharges' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-bold text-gray-900">Payment Surcharges</h2>
                  <Button 
                    size="sm" 
                    onClick={() => addItem(setSurcharges, { minAmount: 0, type: 'percent', value: 0 })}
                    className="bg-black text-white hover:bg-gray-800 rounded-full px-4"
                  >
                    <Plus size={16} className="mr-2"/> Add Rule
                  </Button>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-blue-900 mb-6">
                  <AlertCircle size={20} className="shrink-0" />
                  <p className="text-sm font-medium">Automatically apply extra fees to card payments based on the total transaction amount.</p>
                </div>

                <div className="grid gap-4">
                  {surcharges.map((charge, index) => (
                    <div key={charge.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-end group hover:border-gray-300 transition-colors">
                      <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-gray-400 mb-1 ml-1 uppercase">If Order Total &gt;</label>
                        <NumericInput 
                          value={charge.minAmount}
                          onChange={v => {
                            const n = [...surcharges];
                            n[index].minAmount = v;
                            setSurcharges(n);
                          }}
                          prefix={currencySymbol}
                        />
                      </div>
                      <div className="w-full md:w-40">
                        <label className="block text-xs font-bold text-gray-400 mb-1 ml-1 uppercase">Fee Type</label>
                        <select 
                          value={charge.type}
                          onChange={e => {
                            const n = [...surcharges];
                            n[index].type = e.target.value as 'fixed' | 'percent';
                            setSurcharges(n);
                          }}
                          className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ecff76] focus:bg-white outline-none font-medium appearance-none cursor-pointer"
                        >
                          <option value="percent">Percent (%)</option>
                          <option value="fixed">Fixed ({currencySymbol})</option>
                        </select>
                      </div>
                      <div className="w-full md:w-32">
                        <label className="block text-xs font-bold text-gray-400 mb-1 ml-1 uppercase">Fee Value</label>
                        <NumericInput 
                          value={charge.value}
                          onChange={v => {
                            const n = [...surcharges];
                            n[index].value = v;
                            setSurcharges(n);
                          }}
                        />
                      </div>
                      <button 
                        onClick={() => setSurcharges(surcharges.filter(c => c.id !== charge.id))}
                        className="h-12 w-12 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};