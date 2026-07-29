import React from 'react';

export interface CardProps {
  /** Main title shown at the top of the card */
  title?: React.ReactNode;
  /** Subtitle or value shown just under the title */
  subtitle?: React.ReactNode;
  /** Any child content (e.g. charts, tables, chat) */
  children?: React.ReactNode;
  /** Extra Tailwind classes to customize padding, borders, etc. */
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  className = '',
}) => {
  return (
    <section className={`rounded-2xl border border-[#e4e4e0] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${className}`}>
      {(title || subtitle) && (
        <header className="mb-5">
          {title && <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-[#181818]">{title}</h3>}
          {subtitle && <p className="mt-1 text-xs text-[#777773]">{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  );
};
