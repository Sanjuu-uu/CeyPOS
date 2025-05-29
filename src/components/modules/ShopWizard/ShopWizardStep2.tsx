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

const countries = [
  'United States',
  'Canada',
  'United Kingdom',
  'Australia',
  'Germany',
  'France',
  'Japan',
  'South Korea',
  'Singapore',
  'Sri Lanka',
  'India',
  'Other',
];

export const ShopWizardStep2: React.FC = () => {
  const { formData, updateFormData } = useShopWizard();
  const [localData, setLocalData] = useState({
    address: formData.address,
    city: formData.city,
    state: formData.state,
    zipCode: formData.zipCode,
    country: formData.country,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  useEffect(() => {
    updateFormData(localData);
  }, [localData, updateFormData]);

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
              marginBottom: '8px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '20px',
              fontWeight: 600,
              lineHeight: 1.2
            }}>Where is your shop located?</h2>
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
              Help customers find you by providing your business address
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto">
            <div className="space-y-4">
              {/* Address */}
              <motion.div custom={0} variants={inputVariants} initial="initial" animate="animate">
                <label style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--gray--900)',
                  display: 'block',
                  marginBottom: '6px'
                }}>
                  Street Address *
                </label>
                <input
                  type="text"
                  value={localData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Enter your street address"
                  className="text-field-outline"
                  style={{
                    width: '100%',
                    height: '48px',
                    border: `1px solid ${errors.address ? '#ef4444' : 'var(--gray--200)'}`,
                    borderRadius: 'var(--radius--12px)',
                    backgroundColor: 'var(--main--white)',
                    padding: '0 16px',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    lineHeight: '48px',
                    transition: 'all .3s',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--gray--900)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = errors.address ? '#ef4444' : 'var(--gray--200)';
                  }}
                />
                {errors.address && (
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
                    {errors.address}
                  </motion.p>
                )}
              </motion.div>

              {/* City and State Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <motion.div custom={1} variants={inputVariants} initial="initial" animate="animate">
                  <label style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--gray--900)',
                    display: 'block',
                    marginBottom: '6px'
                  }}>
                    City *
                  </label>
                  <input
                    type="text"
                    value={localData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Enter city"
                    className="text-field-outline"
                    style={{
                      width: '100%',
                      height: '48px',
                      border: `1px solid ${errors.city ? '#ef4444' : 'var(--gray--200)'}`,
                      borderRadius: 'var(--radius--12px)',
                      backgroundColor: 'var(--main--white)',
                      padding: '0 16px',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '14px',
                      lineHeight: '48px',
                      transition: 'all .3s',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--gray--900)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = errors.city ? '#ef4444' : 'var(--gray--200)';
                    }}
                  />
                  {errors.city && (
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
                      {errors.city}
                    </motion.p>
                  )}
                </motion.div>

                <motion.div custom={2} variants={inputVariants} initial="initial" animate="animate">
                  <label style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--gray--900)',
                    display: 'block',
                    marginBottom: '6px'
                  }}>
                    State/Province
                  </label>
                  <input
                    type="text"
                    value={localData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder="Enter state or province"
                    className="text-field-outline"
                    style={{
                      width: '100%',
                      height: '48px',
                      border: '1px solid var(--gray--200)',
                      borderRadius: 'var(--radius--12px)',
                      backgroundColor: 'var(--main--white)',
                      padding: '0 16px',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '14px',
                      lineHeight: '48px',
                      transition: 'all .3s',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--gray--900)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--gray--200)';
                    }}
                  />
                </motion.div>
              </div>

              {/* ZIP Code and Country Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <motion.div custom={3} variants={inputVariants} initial="initial" animate="animate">
                  <label style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--gray--900)',
                    display: 'block',
                    marginBottom: '6px'
                  }}>
                    ZIP/Postal Code
                  </label>
                  <input
                    type="text"
                    value={localData.zipCode}
                    onChange={(e) => handleInputChange('zipCode', e.target.value)}
                    placeholder="Enter ZIP or postal code"
                    className="text-field-outline"
                    style={{
                      width: '100%',
                      height: '48px',
                      border: '1px solid var(--gray--200)',
                      borderRadius: 'var(--radius--12px)',
                      backgroundColor: 'var(--main--white)',
                      padding: '0 16px',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '14px',
                      lineHeight: '48px',
                      transition: 'all .3s',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--gray--900)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--gray--200)';
                    }}
                  />
                </motion.div>

                <motion.div custom={4} variants={inputVariants} initial="initial" animate="animate">
                  <label style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--gray--900)',
                    display: 'block',
                    marginBottom: '6px'
                  }}>
                    Country *
                  </label>
                  <select
                    value={localData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    className="text-field-outline"
                    style={{
                      width: '100%',
                      height: '48px',
                      border: `1px solid ${errors.country ? '#ef4444' : 'var(--gray--200)'}`,
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
                      e.target.style.borderColor = errors.country ? '#ef4444' : 'var(--gray--200)';
                    }}
                  >
                    <option value="">Select a country</option>
                    {countries.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                  {errors.country && (
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
                      {errors.country}
                    </motion.p>
                  )}
                </motion.div>
              </div>

              {/* Location Info */}
              <motion.div 
                custom={5} 
                variants={inputVariants} 
                initial="initial" 
                animate="animate"
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius--12px)',
                  backgroundColor: '#f8fffe',
                  border: '1px solid #e6f7e6',
                  marginTop: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--verde-naturale--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '1px'
                  }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 12l2 2 4-4" />
                    </svg>
                  </div>
                  <div>
                    <h4 style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--gray--900)',
                      margin: '0 0 3px 0'
                    }}>
                      Your address helps customers find you
                    </h4>
                    <p style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '11px',
                      fontWeight: 400,
                      color: 'var(--gray--600)',
                      margin: 0,
                      lineHeight: 1.3
                    }}>
                      This information will be used for shipping calculations, tax purposes, and helping customers locate your business.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
