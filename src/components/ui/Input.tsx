import React from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  helperText,
  error,
  leftIcon,
  rightIcon,
  size = 'md',
  fullWidth = false,
  containerClassName = '',
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'h-8 text-xs',
    md: 'h-10 text-sm',
    lg: 'h-12 text-base'
  };
  
  const baseInputClasses = 'bg-white border rounded-lg focus:outline-none focus:ring-2 transition-colors duration-200';
  const stateClasses = error
    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 text-red-900 placeholder-red-300'
    : 'border-gray-300 focus:border-[#c5f542] focus:ring-[#c5f542]/25 text-gray-900 placeholder-gray-400';
  
  const iconClasses = {
    left: leftIcon ? 'pl-10' : '',
    right: rightIcon ? 'pr-10' : ''
  };
  
  const inputClasses = [
    baseInputClasses,
    stateClasses,
    sizeClasses[size],
    iconClasses.left,
    iconClasses.right,
    'w-full',
    className
  ].join(' ');
  
  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
            {leftIcon}
          </div>
        )}
        <input className={inputClasses} {...props} />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
            {rightIcon}
          </div>
        )}
      </div>
      {(helperText || error) && (
        <p className={`mt-1 text-xs ${error ? 'text-red-500' : 'text-gray-500'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
};
