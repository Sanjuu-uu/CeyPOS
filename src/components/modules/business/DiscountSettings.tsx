import React from 'react';
import { Button } from '../../ui/Button';
import { NumericInput } from './BusinessComponents';
import { DiscountRule, type AddItemFn } from './BusinessRules';

interface DiscountSettingsProps {
  discounts: DiscountRule[];
  setDiscounts: React.Dispatch<React.SetStateAction<DiscountRule[]>>;
  addItem: AddItemFn;
  currencySymbol: string;
}

export const DiscountSettings: React.FC<DiscountSettingsProps> = ({ discounts, setDiscounts, addItem, currencySymbol }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold text-gray-900">Active Discounts</h2>
        <Button 
          size="sm" 
          onClick={() => addItem(setDiscounts, { name: "New Discount", type: 'percent', value: 0 })}
          className="bg-[#c5f542] text-black hover:bg-[#b8ea34] rounded-full px-4"
        >
          Add Discount
        </Button>
      </div>

      <div className="grid gap-4">
        {discounts.map((discount) => (
          <div key={discount.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-end group hover:border-gray-300 transition-colors">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-gray-400 mb-1 ml-1 uppercase">Label</label>
              <input 
                value={discount.name}
                onChange={e => {
                  setDiscounts(prev => prev.map(d => d.id === discount.id ? { ...d, name: e.target.value } : d));
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
                  setDiscounts(prev => prev.map(d => d.id === discount.id ? { ...d, type: e.target.value as 'fixed' | 'percent' } : d));
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
                  setDiscounts(prev => prev.map(d => d.id === discount.id ? { ...d, value: v } : d));
                }}
              />
            </div>
            <button 
              onClick={() => setDiscounts(prev => prev.filter(d => d.id !== discount.id))}
              className="h-12 rounded-xl bg-red-50 px-4 text-sm font-medium text-red-500 hover:bg-red-100 transition-colors"
            >
              Delete
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
  );
};
