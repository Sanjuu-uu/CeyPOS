// src/components/Import/PaymentConfirmation.tsx
import React from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { CheckCircle } from 'lucide-react';

export interface PaymentConfirmationProps {
  isFastFlash: boolean;
  scheduleDate: string;
  scheduleTime: string;
  onNewPromotion: () => void;
  onViewHistory: () => void;
}

/**
 * Formats a date string (YYYY-MM-DD) and time string (HH:MM) into
 * "MMM dd, yyyy hh:mm AM/PM" style. E.g. "2025-06-10", "09:00" → "Jun 10, 2025 09:00 AM"
 */
const formatDateTime = (isoDate: string, isoTime: string) => {
  const dt = new Date(`${isoDate}T${isoTime}`);
  return dt.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const PaymentConfirmation: React.FC<PaymentConfirmationProps> = ({
  isFastFlash,
  scheduleDate,
  scheduleTime,
  onNewPromotion,
  onViewHistory,
}) => {
  return (
    <div className="flex justify-center items-start px-6 py-8 bg-gray-50 min-h-screen">
      <Card className="w-full max-w-md shadow-lg rounded-xl overflow-hidden">
        {/* Header */}
        <div className="bg-green-50 px-6 py-6 text-center">
          <CheckCircle size={48} className="mx-auto text-green-600" />
          <h2 className="mt-4 text-2xl font-semibold text-gray-800">Payment Successful!</h2>
          <p className="mt-2 text-sm text-gray-600">
            Your {isFastFlash ? 'FastFlash' : 'FlashPro'} promotion is scheduled for{' '}
            <span className="font-medium">{formatDateTime(scheduleDate, scheduleTime)}</span>.
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Reference ID: <span className="font-mono">#{Date.now()}</span>
          </p>
        </div>

        {/* Actions */}
        <div className="p-6 space-y-4 bg-white">
          <Button
            variant="primary"
            className="w-full px-6 py-2 text-white bg-verde-primary hover:bg-verde-primary/90"
            onClick={onNewPromotion}
          >
            Create New Promotion
          </Button>
          <Button
            variant="outline"
            className="w-full px-6 py-2 text-gray-700 hover:bg-gray-100"
            onClick={onViewHistory}
          >
            View Promotion History
          </Button>
        </div>
      </Card>
    </div>
  );
};
