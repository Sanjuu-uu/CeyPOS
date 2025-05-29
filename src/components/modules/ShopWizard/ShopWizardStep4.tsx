import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useShopWizard } from '../../../context/ShopWizardContext';
import './styles/ShopWizard.css';

const cardVariants = {
  initial: { y: 20, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
};

const inputVariants = {
  initial: { y: 15, opacity: 0 },
  animate: (index: number) => ({
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.4,
      delay: index * 0.1,
      ease: 'easeOut',
    },
  }),
};

const currencies = {
  USD: { name: 'US Dollar', symbol: '$' },
  EUR: { name: 'Euro', symbol: '€' },
  GBP: { name: 'British Pound', symbol: '£' },
  JPY: { name: 'Japanese Yen', symbol: '¥' },
  CAD: { name: 'Canadian Dollar', symbol: 'C$' },
  AUD: { name: 'Australian Dollar', symbol: 'A$' },
  LKR: { name: 'Sri Lankan Rupee', symbol: 'Rs' },
  INR: { name: 'Indian Rupee', symbol: '₹' },
};

const timezones = [
  'UTC-12:00 (Baker Island)',
  'UTC-11:00 (Niue)',
  'UTC-10:00 (Hawaii)',
  'UTC-09:00 (Alaska)',
  'UTC-08:00 (Pacific Time)',
  'UTC-07:00 (Mountain Time)',
  'UTC-06:00 (Central Time)',
  'UTC-05:00 (Eastern Time)',
  'UTC-04:00 (Atlantic Time)',
  'UTC-03:00 (Argentina)',
  'UTC-02:00 (South Georgia)',
  'UTC-01:00 (Azores)',
  'UTC+00:00 (London)',
  'UTC+01:00 (Paris)',
  'UTC+02:00 (Cairo)',
  'UTC+03:00 (Moscow)',
  'UTC+04:00 (Dubai)',
  'UTC+05:00 (Pakistan)',
  'UTC+05:30 (India/Sri Lanka)',
  'UTC+06:00 (Bangladesh)',
  'UTC+07:00 (Bangkok)',
  'UTC+08:00 (Singapore)',
  'UTC+09:00 (Japan)',
  'UTC+10:00 (Sydney)',
  'UTC+11:00 (Solomon Islands)',
  'UTC+12:00 (New Zealand)',
];

const paymentMethods = [
  { value: 'cash', label: 'Cash', icon: '💵', description: 'Physical currency' },
  { value: 'credit-card', label: 'Credit Cards', icon: '💳', description: 'Visa, Mastercard, etc.' },
  { value: 'debit-card', label: 'Debit Cards', icon: '🏧', description: 'Bank debit cards' },
  { value: 'paypal', label: 'PayPal', icon: '🌐', description: 'Online payments' },
  { value: 'bank-transfer', label: 'Bank Transfer', icon: '🏦', description: 'Direct bank transfers' },
  { value: 'mobile-payment', label: 'Mobile Payments', icon: '📱', description: 'Apple Pay, Google Pay' },
  { value: 'cryptocurrency', label: 'Cryptocurrency', icon: '₿', description: 'Bitcoin, Ethereum, etc.' },
  { value: 'check', label: 'Checks', icon: '📄', description: 'Paper checks' },
];

const daysOfWeek = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export const ShopWizardStep4: React.FC = () => {
  const { formData, updateFormData } = useShopWizard();
  const [localData, setLocalData] = useState({
    currency: formData.currency,
    timezone: formData.timezone,
    operatingHours: formData.operatingHours,
    paymentMethods: formData.paymentMethods,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: any) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
    // Clear error when user makes changes
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePaymentMethodToggle = (methodValue: string) => {
    const updatedMethods = localData.paymentMethods.includes(methodValue)
      ? localData.paymentMethods.filter(method => method !== methodValue)
      : [...localData.paymentMethods, methodValue];
    
    handleInputChange('paymentMethods', updatedMethods);
  };

  const handleOperatingHoursChange = (day: string, field: string, value: string | boolean) => {
    const updatedHours = {
      ...localData.operatingHours,
      [day]: {
        ...localData.operatingHours[day as keyof typeof localData.operatingHours],
        [field]: value,
      },
    };
    handleInputChange('operatingHours', updatedHours);  };

  useEffect(() => {
    updateFormData(localData);
  }, [localData, updateFormData]);  return (
    <div className="w-full flex justify-center">
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        className="w-full max-w-4xl"
      >
        <div 
          className="p-6"
          style={{
            backgroundColor: 'var(--main--white)',
            borderRadius: 'var(--radius--16px)',
            border: '1px solid var(--gray--200)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
            background: 'linear-gradient(135deg, var(--main--white) 0%, #fafbfc 100%)',
            minHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}
        >
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-6"
          >
            <h2 style={{
              color: 'var(--gray--900)',
              letterSpacing: '-.01em',
              marginTop: 0,
              marginBottom: '6px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '20px',
              fontWeight: 600,
              lineHeight: 1.2
            }}>Shop Settings</h2>
            <p style={{ 
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              fontWeight: 400,
              color: 'var(--gray--600)',
              margin: 0,
              maxWidth: '400px',
              marginLeft: 'auto',
              marginRight: 'auto',
              lineHeight: 1.5
            }}>
              Configure your shop's operational preferences
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto">
            <div className="space-y-6">
              {/* Currency Selection */}
              <motion.div custom={0} variants={inputVariants} initial="initial" animate="animate">
                <label style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--gray--900)',
                  display: 'block',
                  marginBottom: '6px'
                }}>
                  Currency *
                </label>
                <select
                  value={localData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className="text-field-outline"
                  style={{
                    width: '100%',
                    height: '48px',
                    border: `1px solid ${errors.currency ? '#ef4444' : 'var(--gray--200)'}`,
                    borderRadius: 'var(--radius--12px)',
                    backgroundColor: 'var(--main--white)',
                    padding: '0 16px',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    lineHeight: '48px',
                    transition: 'all .3s',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--gray--900)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = errors.currency ? '#ef4444' : 'var(--gray--200)';
                  }}
                >
                  <option value="">Select your currency</option>
                  {Object.entries(currencies).map(([code, currency]) => (
                    <option key={code} value={code}>
                      {currency.name} ({currency.symbol})
                    </option>
                  ))}
                </select>
                {errors.currency && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '11px',
                      color: '#ef4444',
                      marginTop: '4px'
                    }}
                  >
                    {errors.currency}
                  </motion.p>
                )}
              </motion.div>

              {/* Payment Methods */}
              <motion.div custom={1} variants={inputVariants} initial="initial" animate="animate">
                <label style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--gray--900)',
                  display: 'block',
                  marginBottom: '12px'
                }}>
                  Payment Methods *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {paymentMethods.map((method, index) => (
                    <motion.label
                      key={method.value}
                      custom={2 + index}
                      variants={inputVariants}
                      initial="initial"
                      animate="animate"
                      className="checkbox-wrapper"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px',
                        borderRadius: 'var(--radius--12px)',
                        border: '1px solid var(--gray--200)',
                        backgroundColor: localData.paymentMethods.includes(method.value) 
                          ? 'rgba(216, 250, 82, 0.1)' 
                          : 'var(--main--white)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={localData.paymentMethods.includes(method.value)}
                        onChange={() => handlePaymentMethodToggle(method.value)}
                        className="checkbox"
                        style={{
                          appearance: 'none',
                          width: '20px',
                          height: '20px',
                          border: '1px solid var(--gray--200)',
                          borderRadius: '4px',
                          backgroundColor: 'var(--main--white)',
                          position: 'relative',
                          cursor: 'pointer',
                          transition: 'all 0.3s'
                        }}
                      />
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}>
                        <span style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: 'var(--gray--900)'
                        }}>
                          {method.label}
                        </span>
                        {method.description && (
                          <span style={{
                            fontFamily: 'Inter, sans-serif',
                            fontSize: '10px',
                            fontWeight: 400,
                            color: 'var(--gray--400)'
                          }}>
                            {method.description}
                          </span>
                        )}
                      </div>
                    </motion.label>
                  ))}
                </div>
                {errors.paymentMethods && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '11px',
                      color: '#ef4444',
                      marginTop: '6px'
                    }}
                  >
                    {errors.paymentMethods}
                  </motion.p>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
