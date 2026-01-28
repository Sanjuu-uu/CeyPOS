import React, { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  children,
  ...props
}) => {
  const variantStyles = {
    primary: 'bg-[#c5f542] text-gray-900 hover:bg-[#b8e635] border-none',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 border-none',
    outline: 'bg-transparent text-gray-900 border border-gray-200 hover:bg-gray-900 hover:text-white hover:border-gray-900',
    dark: 'bg-gray-900 text-white hover:bg-opacity-80 border-none',
  };

  const sizeStyles = {
    sm: 'py-1.5 px-4 text-xs',
    md: 'py-2.5 px-6 text-sm',
    lg: 'py-3 px-8 text-base',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`inline-flex items-center justify-center font-medium rounded-full transition-all duration-200 ${variantStyles[variant]} ${sizeStyles[size]} ${widthClass} ${className}`}
      {...props}
    >
      {icon && iconPosition === 'left' && <span className="mr-2">{icon}</span>}
      {children}
      {icon && iconPosition === 'right' && <span className="ml-2">{icon}</span>}
    </button>
  );
};