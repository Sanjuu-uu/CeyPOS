import React from 'react';
import { NumericInput, Toggle } from './BusinessComponents';
import { LoyaltyConfig } from './BusinessRules';

interface LoyaltySettingsProps {
  loyalty: LoyaltyConfig;
  setLoyalty: React.Dispatch<React.SetStateAction<LoyaltyConfig>>;
  currencySymbol: string;
}

export const LoyaltySettings: React.FC<LoyaltySettingsProps> = ({ loyalty, setLoyalty, currencySymbol }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex items-center justify-between transition-colors hover:border-gray-300">
        <div>
            <h2 className="text-xl font-black text-gray-900">Loyalty Program</h2>
            <p className="text-gray-500 font-medium text-sm mt-0.5">
              {loyalty.enabled 
                ? "Active · Customers are currently earning points" 
                : "Inactive · Enable to start rewarding your customers"}
            </p>
        </div>
        <Toggle checked={loyalty.enabled} onChange={(val) => setLoyalty({...loyalty, enabled: val})} />
      </div>

      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-all duration-500 ${!loyalty.enabled ? 'opacity-40 grayscale pointer-events-none blur-[1px]' : ''}`}>
        <div className="bg-white p-8 rounded-2xl border border-[#e4e4e0] shadow-sm flex flex-col h-full relative overflow-hidden group hover:border-[#c5f542] transition-all hover:shadow-md">
          
          <div className="relative z-10 mb-6">
            <div className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full text-xs font-bold text-gray-600 mb-3 uppercase tracking-wider">
              Earning Strategy
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
                  onChange={v => setLoyalty(prev => ({...prev, earnRate: v}))}
                  prefix={currencySymbol}
                  className="bg-white flex-1 font-mono text-lg"
                  placeholder="0"
                />
                <span className="text-sm font-bold text-gray-500 whitespace-nowrap flex items-center gap-2">
                  Spent to 1 Point
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

        <div className="bg-white p-8 rounded-2xl border border-[#e4e4e0] shadow-sm flex flex-col h-full relative overflow-hidden group hover:border-[#c5f542] transition-all hover:shadow-md">

          <div className="relative z-10 mb-6">
            <div className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full text-xs font-bold text-gray-600 mb-3 uppercase tracking-wider">
              Redemption Strategy
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
                  onChange={v => setLoyalty(prev => ({...prev, redeemRate: v}))}
                  prefix={currencySymbol}
                  className="bg-white font-mono"
                  placeholder="0.00"
                />
              </div>
              <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Min. to Redeem</label>
                <NumericInput 
                  value={loyalty.minPointsToRedeem} 
                  onChange={v => setLoyalty(prev => ({...prev, minPointsToRedeem: v}))}
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
  );
};
