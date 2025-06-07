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
    <div className={`p-4 bg-white rounded-lg shadow-sm ${className}`}>
      {(title || subtitle) && (
        <header className="mb-4">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </header>
      )}
      {children}
    </div>
  );
};
