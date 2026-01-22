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
  AlertCircle 
} from 'lucide-react';

// --- Improved NumericInput ---
// Fixes "Can't type 0" by passing raw values and allowing the parent to handle type conversion later.
const NumericInput = ({ 
  value, 
  onChange, 
  className, 
  placeholder,
  ...props 
}: { 
  value: number | string; 
  onChange: (val: string | number) => void;
  className?: string;
  placeholder?: string;
  [key: string]: any;
}) => (
  <input
    type="number"
    // If value is 0, show "0". If empty string, show empty. null/undefined fallback to ''
    value={value === 0 ? 0 : (value || '')} 
    onChange={(e) => onChange(e.target.value)} // Pass raw string to allow typing "0", "0.", "1.0"
    className={className}
    placeholder={placeholder}
    onWheel={(e) => e.currentTarget.blur()} // Prevent accidental scroll value changes
    {...props}
  />
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

  // Load Initial Data
  useEffect(() => {
    const loadData = () => {
        // @ts-ignore
        const rules = db.businessRules?.get();
        if (rules) {
            setLoyalty(rules.loyalty);
            
            setDiscounts((rules.discounts || []).map((d: any) => ({
              ...d,
              id: d.id || Math.floor(Math.random() * 1000000),
              type: d.type as 'fixed' | 'percent'
            })));

            setTaxes((rules.taxes || []).map((t: any) => ({
              ...t,
              id: t.id || Math.floor(Math.random() * 1000000)
            })));

            setSurcharges((rules.surcharges || []).map((s: any) => ({
              ...s,
              id: s.id || Math.floor(Math.random() * 1000000),
              type: s.type as 'fixed' | 'percent'
            })));
        }
    };

    loadData();
    // @ts-ignore
    const unsub = db.on('businessRulesUpdated', loadData);
    return () => { unsub && unsub(); };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
        // Convert strings to numbers before saving
        const cleanLoyalty = {
            ...loyalty,
            enabled: loyalty.enabled,
            earnRate: Number(loyalty.earnRate) || 0,
            redeemRate: Number(loyalty.redeemRate) || 0,
            minPointsToRedeem: Number(loyalty.minPointsToRedeem) || 0
        };

        const cleanDiscounts = discounts.map(d => ({
            id: d.id,
            name: d.name,
            type: d.type,
            value: Number(d.value) || 0
        }));

        const cleanTaxes = taxes.map(t => ({
            id: t.id,
            name: t.name,
            rate: Number(t.rate) || 0,
            isDefault: t.isDefault
        }));

        const cleanSurcharges = surcharges.map(s => ({
            id: s.id,
            minAmount: Number(s.minAmount) || 0,
            type: s.type,
            value: Number(s.value) || 0
        }));

        // @ts-ignore
        await db.businessRules.save({
            loyalty: cleanLoyalty,
            discounts: cleanDiscounts,
            taxes: cleanTaxes,
            surcharges: cleanSurcharges
        });
        alert("Configuration saved successfully!");
    } catch (err) {
        console.error(err);
        alert("Failed to save settings. Please try again.");
    } finally {
        setIsSaving(false);
    }
  };

  // --- Handlers ---
  const addDiscount = () => setDiscounts([...discounts, { id: Date.now(), name: "New Discount", type: "percent", value: 0 }]);
  const addTax = () => setTaxes([...taxes, { id: Date.now(), name: "New Tax", rate: 0, isDefault: false }]);
  const addSurcharge = () => setSurcharges([...surcharges, { id: Date.now(), minAmount: 0, type: "percent", value: 0 }]);

  return (
    <div className="space-y-6 h-full overflow-y-auto pb-20 p-4 md:p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Business Configuration</h1>
           <p className="text-sm text-gray-500">Manage loyalty points, taxes, discounts, and payment fees.</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-[#ecff76] text-gray-900 hover:bg-[#d9ec60] border-none font-bold min-w-[140px]"
        >
          {isSaving ? <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full mx-auto"/> : <span className="flex items-center gap-2"><Save size={16}/> Save Changes</span>}
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10 mx-[-1rem] px-4 md:mx-0 md:px-0">
        <nav className="-mb-px flex space-x-6 overflow-x-auto no-scrollbar">
          {[
            { id: 'loyalty', label: 'Loyalty Points', icon: <Award size={16} /> },
            { id: 'discounts', label: 'Discounts', icon: <Percent size={16} /> },
            { id: 'taxes', label: 'Taxes', icon: <Landmark size={16} /> },
            { id: 'surcharges', label: 'Card Charges', icon: <CreditCard size={16} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-[#ecff76] text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* === LOYALTY TAB === */}
      {activeTab === 'loyalty' && (
        <Card className="border border-gray-100">
           <div className="space-y-6">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                 <div>
                    <h3 className="font-bold text-gray-900">Enable Loyalty Program</h3>
                    <p className="text-xs text-gray-500">Customers earn points on every purchase.</p>
                 </div>
                 <button 
                    onClick={() => setLoyalty({...loyalty, enabled: !loyalty.enabled})}
                    className={`w-12 h-6 rounded-full transition-colors relative ${loyalty.enabled ? 'bg-[#ecff76]' : 'bg-gray-300'}`}
                 >
                    <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform duration-200 ${loyalty.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                 </button>
              </div>

              {/* Grid Inputs with Fixed Alignment */}
              <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 transition-opacity ${!loyalty.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                 
                 {/* Earning Rate */}
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Earning Rate</label>
                    <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-1 focus-within:ring-[#ecff76] focus-within:border-[#ecff76]">
                       <span className="bg-gray-50 px-3 py-2 text-sm text-gray-500 border-r border-gray-300 flex items-center whitespace-nowrap">
                          1 Point /
                       </span>
                       <NumericInput 
                          value={loyalty.earnRate}
                          onChange={(val) => setLoyalty({...loyalty, earnRate: val})}
                          className="w-full px-3 py-2 outline-none border-none text-gray-900"
                          placeholder="Amount"
                       />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Spend {currencySymbol}{loyalty.earnRate || 0} to earn 1 point.</p>
                 </div>

                 {/* Redemption Value */}
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Redemption Value</label>
                    <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-1 focus-within:ring-[#ecff76] focus-within:border-[#ecff76]">
                       <span className="bg-gray-50 px-3 py-2 text-sm text-gray-500 border-r border-gray-300 flex items-center whitespace-nowrap">
                          1 Point = {currencySymbol}
                       </span>
                       <NumericInput 
                          value={loyalty.redeemRate}
                          onChange={(val) => setLoyalty({...loyalty, redeemRate: val})}
                          className="w-full px-3 py-2 outline-none border-none text-gray-900"
                          placeholder="0.00"
                       />
                    </div>
                     <p className="text-[10px] text-gray-400 mt-1">100 points = {currencySymbol}{(Number(loyalty.redeemRate) * 100).toFixed(2)}</p>
                 </div>

                 {/* Min Points */}
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min. Points to Redeem</label>
                    <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-1 focus-within:ring-[#ecff76] focus-within:border-[#ecff76]">
                       <NumericInput 
                          value={loyalty.minPointsToRedeem}
                          onChange={(val) => setLoyalty({...loyalty, minPointsToRedeem: val})}
                          className="w-full px-3 py-2 outline-none border-none text-gray-900"
                          placeholder="e.g. 100"
                       />
                    </div>
                 </div>
              </div>
           </div>
        </Card>
      )}

      {/* === DISCOUNTS TAB === */}
      {activeTab === 'discounts' && (
        <Card 
            className="border border-gray-100"
            actions={<Button size="sm" variant="outline" icon={<Plus size={14}/>} onClick={addDiscount}>Add New</Button>}
        >
           <div className="space-y-4">
              {discounts.map((discount, index) => (
                  <div key={discount.id} className="flex flex-col md:flex-row gap-4 items-end md:items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex-1 w-full">
                          <label className="block text-xs font-bold text-gray-500 mb-1">Name</label>
                          <input 
                             value={discount.name}
                             onChange={(e) => {
                                 const n = [...discounts];
                                 n[index].name = e.target.value;
                                 setDiscounts(n);
                             }}
                             className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#ecff76] focus:ring-1 focus:ring-[#ecff76]"
                          />
                      </div>
                      <div className="w-full md:w-32">
                          <label className="block text-xs font-bold text-gray-500 mb-1">Type</label>
                          <select 
                             value={discount.type}
                             onChange={(e) => {
                                 const n = [...discounts];
                                 n[index].type = e.target.value as 'fixed' | 'percent';
                                 setDiscounts(n);
                             }}
                             className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-[#ecff76]"
                          >
                             <option value="percent">Percent (%)</option>
                             <option value="fixed">Fixed ({currencySymbol})</option>
                          </select>
                      </div>
                      <div className="w-full md:w-32">
                          <label className="block text-xs font-bold text-gray-500 mb-1">Value</label>
                          <NumericInput 
                             value={discount.value}
                             onChange={(val) => {
                                 const n = [...discounts];
                                 n[index].value = val;
                                 setDiscounts(n);
                             }}
                             className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#ecff76] focus:ring-1 focus:ring-[#ecff76]"
                          />
                      </div>
                      <button onClick={() => setDiscounts(discounts.filter(d => d.id !== discount.id))} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                  </div>
              ))}
              {!discounts.length && <div className="text-center py-8 text-gray-400 text-sm">No discounts found.</div>}
           </div>
        </Card>
      )}

      {/* === TAXES TAB === */}
      {activeTab === 'taxes' && (
        <Card 
            className="border border-gray-100"
            actions={<Button size="sm" variant="outline" icon={<Plus size={14}/>} onClick={addTax}>Add Tax</Button>}
        >
           <div className="space-y-4">
              {taxes.map((tax, index) => (
                  <div key={tax.id} className="flex flex-col md:flex-row gap-4 items-end md:items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex-1 w-full">
                          <label className="block text-xs font-bold text-gray-500 mb-1">Tax Name</label>
                          <input 
                             value={tax.name}
                             onChange={(e) => {
                                 const n = [...taxes];
                                 n[index].name = e.target.value;
                                 setTaxes(n);
                             }}
                             className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#ecff76] focus:ring-1 focus:ring-[#ecff76]"
                          />
                      </div>
                      <div className="w-full md:w-40">
                          <label className="block text-xs font-bold text-gray-500 mb-1">Rate (%)</label>
                          <NumericInput 
                             value={tax.rate}
                             onChange={(val) => {
                                 const n = [...taxes];
                                 n[index].rate = val;
                                 setTaxes(n);
                             }}
                             className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#ecff76] focus:ring-1 focus:ring-[#ecff76]"
                          />
                      </div>
                      <div className="w-full md:w-auto pb-2">
                          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                             <input 
                                type="checkbox"
                                checked={tax.isDefault}
                                onChange={(e) => {
                                     const n = taxes.map(t => ({...t, isDefault: t.id === tax.id ? e.target.checked : (e.target.checked ? false : t.isDefault) }));
                                     setTaxes(n);
                                }}
                                className="w-4 h-4 rounded text-[#ecff76] focus:ring-[#ecff76]"
                             />
                             Default
                          </label>
                      </div>
                      <button onClick={() => setTaxes(taxes.filter(t => t.id !== tax.id))} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                  </div>
              ))}
           </div>
        </Card>
      )}

      {/* === SURCHARGES TAB === */}
      {activeTab === 'surcharges' && (
        <Card 
            className="border border-gray-100"
            actions={<Button size="sm" variant="outline" icon={<Plus size={14}/>} onClick={addSurcharge}>Add Rule</Button>}
        >
           <div className="mb-4 p-3 bg-blue-50 text-blue-800 text-xs rounded border border-blue-100 flex gap-2">
              <AlertCircle size={16} />
              <p>Extra charges for card payments based on transaction total.</p>
           </div>
           <div className="space-y-4">
              {surcharges.map((charge, index) => (
                  <div key={charge.id} className="flex flex-col md:flex-row gap-4 items-end md:items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex-1 w-full">
                          <label className="block text-xs font-bold text-gray-500 mb-1">Min. Order Amount</label>
                          <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-1 focus-within:ring-[#ecff76] focus-within:border-[#ecff76]">
                            <span className="bg-gray-50 px-3 py-2 text-sm text-gray-500 border-r border-gray-300 flex items-center">
                                {currencySymbol}
                            </span>
                            <NumericInput 
                                value={charge.minAmount}
                                onChange={(val) => {
                                    const n = [...surcharges];
                                    n[index].minAmount = val;
                                    setSurcharges(n);
                                }}
                                className="w-full px-3 py-2 outline-none border-none text-gray-900"
                            />
                          </div>
                      </div>
                      <div className="w-full md:w-32">
                          <label className="block text-xs font-bold text-gray-500 mb-1">Type</label>
                          <select 
                             value={charge.type}
                             onChange={(e) => {
                                 const n = [...surcharges];
                                 n[index].type = e.target.value as 'fixed' | 'percent';
                                 setSurcharges(n);
                             }}
                             className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-[#ecff76]"
                          >
                             <option value="percent">Percent (%)</option>
                             <option value="fixed">Fixed ({currencySymbol})</option>
                          </select>
                      </div>
                      <div className="w-full md:w-32">
                          <label className="block text-xs font-bold text-gray-500 mb-1">Value</label>
                          <NumericInput 
                             value={charge.value}
                             onChange={(val) => {
                                 const n = [...surcharges];
                                 n[index].value = val;
                                 setSurcharges(n);
                             }}
                             className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#ecff76] focus:ring-1 focus:ring-[#ecff76]"
                          />
                      </div>
                      <button onClick={() => setSurcharges(surcharges.filter(c => c.id !== charge.id))} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                  </div>
              ))}
           </div>
        </Card>
      )}
    </div>
  );
};