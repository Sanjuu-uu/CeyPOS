import React from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '../../ui/Button';
import { NumericInput } from './BusinessComponents';
import { SurchargeRule, type AddItemFn } from './BusinessRules';

interface SurchargeSettingsProps {
  surcharges: SurchargeRule[];
  setSurcharges: React.Dispatch<React.SetStateAction<SurchargeRule[]>>;
  addItem: AddItemFn;
  currencySymbol: string;
}

export const SurchargeSettings: React.FC<SurchargeSettingsProps> = ({ surcharges, setSurcharges, addItem, currencySymbol }) => {
  return (
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
        {surcharges.map((charge) => (
          <div key={charge.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-end group hover:border-gray-300 transition-colors">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-gray-400 mb-1 ml-1 uppercase">If Order Total &gt;</label>
              <NumericInput 
                value={charge.minAmount}
                onChange={v => {
                  setSurcharges(prev => prev.map(s => s.id === charge.id ? { ...s, minAmount: v } : s));
                }}
                prefix={currencySymbol}
              />
            </div>
            <div className="w-full md:w-40">
              <label className="block text-xs font-bold text-gray-400 mb-1 ml-1 uppercase">Fee Type</label>
              <select 
                value={charge.type}
                onChange={e => {
                  setSurcharges(prev => prev.map(s => s.id === charge.id ? { ...s, type: e.target.value as 'fixed' | 'percent' } : s));
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
                  setSurcharges(prev => prev.map(s => s.id === charge.id ? { ...s, value: v } : s));
                }}
              />
            </div>
            <button 
              onClick={() => setSurcharges(prev => prev.filter(s => s.id !== charge.id))}
              className="h-12 w-12 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        {/* Fix 9: Empty state */}
        {surcharges.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <p className="text-gray-400 font-medium">No surcharges configured yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};