import React from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import { Button } from '../../ui/Button';
import { NumericInput } from './BusinessComponents';
import { TaxRule, type AddItemFn } from './BusinessRules';

interface TaxSettingsProps {
  taxes: TaxRule[];
  setTaxes: React.Dispatch<React.SetStateAction<TaxRule[]>>;
  addItem: AddItemFn;
}

export const TaxSettings: React.FC<TaxSettingsProps> = ({ taxes, setTaxes, addItem }) => {
  return (
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
        {taxes.map((tax) => (
          <div key={String(tax.id)} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center group hover:border-gray-300 transition-colors">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-gray-400 mb-1 ml-1 uppercase">Tax Name</label>
              <input 
                value={tax.name}
                onChange={e => {
                  setTaxes(prev => prev.map(t => t.id === tax.id ? { ...t, name: e.target.value } : t));
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
                  setTaxes(prev => prev.map(t => t.id === tax.id ? { ...t, rate: v } : t));
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
                  // ✅ FIX: Removed unused 'e' argument here
                  onChange={() => {
                    // Logic: If clicking an unchecked item, set it to default and unset others.
                    // If clicking the ALREADY checked item, do nothing (prevent 0 defaults).
                    if (!tax.isDefault) {
                      setTaxes(prev => prev.map(t => ({
                        ...t,
                        isDefault: t.id === tax.id
                      })));
                    }
                  }}
                  className="hidden"
                />
                <span className="text-sm font-bold text-gray-700">Default</span>
              </label>
            </div>
            <div className="pt-5">
              <button 
                  onClick={() => setTaxes(prev => prev.filter(t => t.id !== tax.id))}
                  className="h-12 w-12 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
              >
                  <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        {taxes.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <p className="text-gray-400 font-medium">No tax rates configured yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};