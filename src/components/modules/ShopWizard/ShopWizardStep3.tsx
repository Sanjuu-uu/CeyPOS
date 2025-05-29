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

export const ShopWizardStep3: React.FC = () => {
  const { formData, updateFormData } = useShopWizard();
  const [localData, setLocalData] = useState({
    businessLicense: formData.businessLicense,
    taxId: formData.taxId,
    registrationNumber: formData.registrationNumber,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };  useEffect(() => {
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
              marginBottom: '6px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '20px',
              fontWeight: 600,
              lineHeight: 1.2
            }}>Business Registration</h2>
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
              Provide your business registration and tax information for compliance
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto">
            <div className="space-y-4">
              {/* Business License Number - Full Width */}
              <motion.div custom={0} variants={inputVariants} initial="initial" animate="animate">
                <label style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--gray--900)',
                  display: 'block',
                  marginBottom: '6px'
                }}>
                  Business License Number
                </label>
                <input
                  type="text"
                  value={localData.businessLicense}
                  onChange={(e) => handleInputChange('businessLicense', e.target.value)}
                  placeholder="Enter business license number"
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
                <p style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '11px',
                  fontWeight: 400,
                  color: 'var(--gray--400)',
                  marginTop: '4px',
                  margin: '4px 0 0 0'
                }}>
                  Optional - Required for certain business types
                </p>
              </motion.div>

              {/* Tax ID and Registration Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tax ID */}
                <motion.div custom={1} variants={inputVariants} initial="initial" animate="animate">
                  <label style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--gray--900)',
                    display: 'block',
                    marginBottom: '6px'
                  }}>
                    Tax ID/EIN
                  </label>
                  <input
                    type="text"
                    value={localData.taxId}
                    onChange={(e) => handleInputChange('taxId', e.target.value)}
                    placeholder="XX-XXXXXXX"
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
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '11px',
                    fontWeight: 400,
                    color: 'var(--gray--400)',
                    marginTop: '4px',
                    margin: '4px 0 0 0'
                  }}>
                    Optional - For tax reporting
                  </p>
                </motion.div>

                {/* Registration Number */}
                <motion.div custom={2} variants={inputVariants} initial="initial" animate="animate">
                  <label style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--gray--900)',
                    display: 'block',
                    marginBottom: '6px'
                  }}>
                    Registration Number
                  </label>
                  <input
                    type="text"
                    value={localData.registrationNumber}
                    onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                    placeholder="Company registration number"
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
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '11px',
                    fontWeight: 400,
                    color: 'var(--gray--400)',
                    marginTop: '4px',
                    margin: '4px 0 0 0'
                  }}>
                    Optional - Business registration ID
                  </p>
                </motion.div>
              </div>

              {/* Information Cards Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {/* Information Card */}
                <motion.div 
                  custom={3} 
                  variants={inputVariants} 
                  initial="initial" 
                  animate="animate"
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius--12px)',
                    backgroundColor: '#f8fffe',
                    border: '1px solid #e6f7e6'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius--8px)',
                      backgroundColor: 'var(--verde-naturale--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14,2 14,8 20,8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10,9 9,9 8,9" />
                      </svg>
                    </div>
                    <div>
                      <h4 style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--gray--900)',
                        margin: '0 0 6px 0'
                      }}>
                        Why do we need this?
                      </h4>
                      <p style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '11px',
                        fontWeight: 400,
                        color: 'var(--gray--600)',
                        margin: 0,
                        lineHeight: 1.4
                      }}>
                        Business registration details help with compliance, tax reporting, and establishing credibility.
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Quick Setup Card */}
                <motion.div
                  custom={4}
                  variants={inputVariants}
                  initial="initial"
                  animate="animate"
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius--12px)',
                    backgroundColor: 'var(--gray--50)',
                    border: '1px solid var(--gray--100)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius--8px)',
                      backgroundColor: 'var(--verde-naturale--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12l2 2 4-4" />
                      </svg>
                    </div>
                    <div>
                      <h4 style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--gray--900)',
                        margin: '0 0 6px 0'
                      }}>
                        Quick Setup
                      </h4>
                      <p style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '11px',
                        fontWeight: 400,
                        color: 'var(--gray--600)',
                        margin: 0,
                        lineHeight: 1.4
                      }}>
                        You can skip this step and add business details later. We'll help you get started right away!
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
