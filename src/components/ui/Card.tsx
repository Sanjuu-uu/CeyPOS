import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
  actions?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  icon,
  className = '',
  footer,
  actions
}) => {
  return (
    <section className={`overflow-hidden rounded-2xl border border-[#e4e4e0] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${className}`}>
      {(title || subtitle || icon) && (
        <div className="flex items-center justify-between border-b border-[#eeeeeb] px-5 py-4">
          <div className="flex items-center gap-3">
            {icon && <div className="text-[#5f5f5a]">{icon}</div>}
            <div>
              {title && <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-[#181818]">{title}</h3>}
              {subtitle && <p className="mt-1 text-xs text-[#777773]">{subtitle}</p>}
            </div>
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div className="px-5 py-5">{children}</div>
      {footer && (
        <div className="border-t border-[#eeeeeb] bg-[#f9f9f7] px-5 py-3">
          {footer}
        </div>
      )}
    </section>
  );
};
