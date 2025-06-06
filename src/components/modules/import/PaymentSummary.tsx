import React from 'react'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { List } from 'lucide-react'

export interface PaymentSummaryProps {
  promotionName: string
  isFastFlash: boolean
  scheduleDate: string
  scheduleTime: string
  audience: 'all' | 'segment'
  sendWhatsApp: boolean
  sendEmail: boolean
  cost: number
  onPay: () => void
  onBack: () => void
}

const formatDateTime = (isoDate: string, isoTime: string) => {
  const dt = new Date(`${isoDate}T${isoTime}`)
  return dt.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export const PaymentSummary: React.FC<PaymentSummaryProps> = ({
  promotionName,
  isFastFlash,
  scheduleDate,
  scheduleTime,
  audience,
  sendWhatsApp,
  sendEmail,
  cost,
  onPay,
  onBack,
}) => {
  return (
    <div className="bg-gray-50 min-h-screen flex items-start justify-center px-4 sm:px-6 lg:px-8 py-8">
      <Card className="w-full max-w-md shadow-lg rounded-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gray-100 px-4 sm:px-6 py-4 flex items-center space-x-2">
          <List size={20} className="text-verde-primary" />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Payment Summary</h2>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 bg-white">
          <div className="space-y-2">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Promotion:</span> {promotionName}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Type:</span> {isFastFlash ? 'FastFlash' : 'FlashPro'}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Scheduled For:</span> {formatDateTime(scheduleDate, scheduleTime)}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Audience:</span>{' '}
              {audience === 'all' ? 'All Customers' : 'Customer Segment'}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Channels:</span>{' '}
              {[sendWhatsApp && 'WhatsApp', sendEmail && 'Email'].filter(Boolean).join(', ')}
            </p>
          </div>

          <div className="pt-4 border-t border-gray-200 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Base Fee</span>
              <span className="text-sm text-gray-700">₹{cost}</span>
            </div>
            {/* Optional Tax line */}
            {/* <div className="flex justify-between">
              <span className="text-sm text-gray-600">GST (5%)</span>
              <span className="text-sm text-gray-700">₹{(cost * 0.05).toFixed(2)}</span>
            </div> */}
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="font-medium text-gray-800">Total Due</span>
              <span className="font-medium text-gray-800">₹{cost}</span>
            </div>
          </div>

          <div className="pt-6 space-y-3">
            <Button
              variant="primary"
              className="w-full px-4 py-2 text-white bg-verde-primary hover:bg-verde-primary/90"
              onClick={onPay}
            >
              Pay ₹{cost}
            </Button>
            <Button
              variant="outline"
              className="w-full px-4 py-2 text-gray-700 hover:bg-gray-100"
              onClick={onBack}
            >
              Back to Edit
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
