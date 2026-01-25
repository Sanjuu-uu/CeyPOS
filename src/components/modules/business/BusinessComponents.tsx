import React from 'react';
import { Check, X as XIcon } from 'lucide-react';

// ✅ Fix: Omit 'onChange' from standard props to prevent type conflict
interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: number | string;
  onChange: (val: number | string) => void;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export const NumericInput = ({ 
  value, 
  onChange, 
  className = "", 
  placeholder,
  prefix,
  suffix,
  ...props 
}: NumericInputProps) => (
  <div className={`flex items-center bg-white border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-[#ecff76] focus-within:border-transparent transition-all overflow-hidden h-12 shadow-sm ${className}`}>
    {prefix && (
      <span className="pl-4 pr-2 text-gray-500 text-sm font-bold select-none border-r border-gray-100 h-full flex items-center bg-gray-50">
        {prefix}
      </span>
    )}
    <input
      type="number"
      // ✅ Fix: Check for null/undefined specifically so 0 is rendered
      value={value === undefined || value === null ? '' : value}
      onChange={(e) => {
        const val = e.target.value;
        if (val === '') {
          onChange('');
        } else {
          // Keep as number if valid, otherwise string (for "0." etc)
          const num = parseFloat(val);
          onChange(isNaN(num) ? val : num);
        }
      }}
      className="w-full h-full px-4 bg-transparent outline-none text-gray-900 placeholder:text-gray-300 font-bold"
      placeholder={placeholder}
      // Fix: Prevent scrolling from changing value without jarring blur
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

export const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) => (
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