import React, { useState, useEffect, useCallback } from 'react';
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

// Filtered Currencies for: United States, United Kingdom, Australia, Singapore, Sri Lanka, India
const currencies = {
  USD: { name: 'US Dollar', symbol: '$' },
  GBP: { name: 'British Pound', symbol: '£' },
  AUD: { name: 'Australian Dollar', symbol: 'A$' },
  SGD: { name: 'Singapore Dollar', symbol: 'S$' },
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

// Updated payment methods array with status for disabling/upcoming feature
const paymentMethods = [
  { value: 'cash', label: 'Cash', icon: '💵', description: 'Physical currency', status: 'available' },
  { value: 'debit-card', label: 'Debit Cards', icon: '🏧', description: 'Bank debit cards', status: 'available' },
  { value: 'bank-transfer', label: 'Bank Transfer', icon: '🏦', description: 'Direct bank transfers', status: 'available' },
  { value: 'mobile-payment', label: 'Mobile Payments', icon: '📱', description: 'QR payments', status: 'available' },
  { value: 'credit-card', label: 'Credit Cards', icon: '💳', description: 'installment payments', status: 'upcoming' },
  { value: 'KOKO', label: 'KOKO', icon: '🌐', description: 'installment payments', status: 'upcoming' },
  { value: 'cryptocurrency', label: 'Cryptocurrency', icon: '₿', description: 'Bitcoin, Ethereum, etc.', status: 'upcoming' },
  { value: 'check', label: 'Checks', icon: '📄', description: 'Paper checks', status: 'upcoming' },
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

interface LocalData {
  currency: string;
  timezone: string;
  operatingHours: any;
  paymentMethods: string[];
}

export const ShopWizardStep4: React.FC = () => {
  const { formData, updateFormData } = useShopWizard();
  const [localData, setLocalData] = useState<LocalData>({
    currency: formData.currency || '',
    timezone: formData.timezone,
    operatingHours: formData.operatingHours,
    paymentMethods: formData.paymentMethods,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validation Logic
  const validateForm = useCallback((data: LocalData) => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    if (!data.currency) {
      newErrors.currency = 'Currency is required.';
      isValid = false;
    }

    if (data.paymentMethods.length === 0) {
      newErrors.paymentMethods = 'Please select at least one payment method.';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  }, []);

  const handleInputChange = (field: keyof LocalData, value: any) => {
    const updatedData = { ...localData, [field]: value };
    setLocalData(updatedData);

    // Live validation after state update
    validateForm(updatedData);
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
    handleInputChange('operatingHours', updatedHours);
  };
  
  // Update global state whenever localData changes
  useEffect(() => {
    updateFormData(localData);
  }, [localData, updateFormData]);
  
  
  // Helper component for error message
  const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
    <motion.p
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: '11px',
        fontWeight: 500,
        color: 'var(--red--600, #DC2626)',
        marginTop: '4px',
        margin: '4px 0 0 0'
      }}
    >
      {message}
    </motion.p>
  );
  

  return (
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
                    // Border color logic matching Step 3
                    border: `1px solid ${errors.currency ? 'var(--red--500)' : 'var(--gray--200)'}`,
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
                    e.target.style.borderColor = errors.currency ? 'var(--red--500)' : 'var(--gray--900)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = errors.currency ? 'var(--red--500)' : 'var(--gray--200)';
                  }}
                >
                  <option value="">Select your currency</option>
                  {Object.entries(currencies).map(([code, currency]) => (
                    <option key={code} value={code}>
                      {currency.name} ({currency.symbol})
                    </option>
                  ))}
                </select>
                {/* Conditional Error/Help Text */}
                {errors.currency ? (
                  <ErrorMessage message={errors.currency} />
                ) : (
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '11px',
                    fontWeight: 400,
                    color: 'var(--gray--400)',
                    marginTop: '4px',
                    margin: '4px 0 0 0'
                  }}>
                    Select the primary currency for your shop.
                  </p>
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
                  {paymentMethods.map((method, index) => {
                    const isUpcoming = method.status === 'upcoming';
                    return (
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
                          // Visually disable the card
                          opacity: isUpcoming ? 0.6 : 1,
                          pointerEvents: isUpcoming ? 'none' : 'auto', // Disable clicking
                          cursor: isUpcoming ? 'not-allowed' : 'pointer',
                          border: isUpcoming ? '1px dashed var(--gray--300)' : '1px solid var(--gray--200)',
                          backgroundColor: localData.paymentMethods.includes(method.value) 
                            ? 'rgba(216, 250, 82, 0.1)' 
                            : 'var(--main--white)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={localData.paymentMethods.includes(method.value)}
                          onChange={() => handlePaymentMethodToggle(method.value)}
                          disabled={isUpcoming} // Disable the checkbox
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
                            {/* Upcoming Indicator */}
                            {isUpcoming && (
                              <span style={{
                                  marginLeft: '8px',
                                  fontStyle: 'italic',
                                  fontWeight: 400,
                                  color: 'var(--gray--500)',
                                  fontSize: '10px'
                              }}>
                                (Upcoming)
                              </span>
                            )}
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
                    );
                  })}
                </div>
                {/* Payment Methods Error Message (Using ErrorMessage Component) */}
                {errors.paymentMethods && (
                  <ErrorMessage message={errors.paymentMethods} />
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};