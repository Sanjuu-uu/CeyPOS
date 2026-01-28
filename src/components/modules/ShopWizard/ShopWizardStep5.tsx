import React from 'react';
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

const sectionVariants = {
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

const shopTypeLabels = {
  retail: 'Retail Store',
  restaurant: 'Restaurant',
  service: 'Service Business',
  wholesale: 'Wholesale',
};

const paymentMethodLabels = {
  'cash': 'Cash',
  'credit-card': 'Credit Cards',
  'debit-card': 'Debit Cards',
  'paypal': 'PayPal',
  'bank-transfer': 'Bank Transfer',
  'mobile-payment': 'Mobile Payments',
  'cryptocurrency': 'Cryptocurrency',
  'check': 'Checks',
  'KOKO': 'KOKO',
};

export const ShopWizardStep5: React.FC = () => {
  const { formData } = useShopWizard();

  const formatOperatingHours = () => {
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return daysOfWeek.map((day, index) => {
      const hours = formData.operatingHours[day as keyof typeof formData.operatingHours];
      return {
        day: dayNames[index],
        hours: hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`,
      };
    });
  };

  const formattedOperatingHours = formatOperatingHours();
  const selectedPaymentMethods = formData.paymentMethods ?? [];

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
            }}>Review & Confirm</h2>
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
              Please review your shop information before proceeding to setup
            </p>
          </motion.div>

          {/* All 4 components in one horizontal row */}
          <div className="grid grid-cols-1 xl:grid-cols-4 lg:grid-cols-2 gap-4 mb-6">
            {/* Shop Details */}
            <motion.div 
              custom={0} 
              variants={sectionVariants} 
              initial="initial" 
              animate="animate"
              style={{
                backgroundColor: '#f8fffe',
                borderRadius: 'var(--radius--12px)',
                padding: '16px',
                border: '1px solid #e6f7e6'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: 'var(--radius--8px)',
                  backgroundColor: 'var(--verde-naturale--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9,22 9,12 15,12 15,22" />
                  </svg>
                </div>
                <h3 style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--gray--900)',
                  margin: 0
                }}>
                  Shop Details
                </h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '10px',
                    fontWeight: 500,
                    color: 'var(--gray--500)',
                    margin: '0 0 2px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Shop Name
                  </p>
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--gray--900)',
                    margin: 0
                  }}>
                    {formData.shopName || 'Not specified'}
                  </p>
                </div>
                
                <div>
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '10px',
                    fontWeight: 500,
                    color: 'var(--gray--500)',
                    margin: '0 0 2px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Owner
                  </p>
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--gray--900)',
                    margin: 0
                  }}>
                    {formData.ownerName || 'Not specified'}
                  </p>
                </div>
                
                <div>
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '10px',
                    fontWeight: 500,
                    color: 'var(--gray--500)',
                    margin: '0 0 2px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Type
                  </p>
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--gray--900)',
                    margin: 0
                  }}>
                    {shopTypeLabels[formData.shopType as keyof typeof shopTypeLabels] || 'Not specified'}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Location Details */}
            <motion.div 
              custom={1} 
              variants={sectionVariants} 
              initial="initial" 
              animate="animate"
              style={{
                backgroundColor: 'var(--gray--50)',
                borderRadius: 'var(--radius--12px)',
                padding: '16px',
                border: '1px solid var(--gray--100)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: 'var(--radius--8px)',
                  backgroundColor: 'var(--gray--700)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <h3 style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--gray--900)',
                  margin: 0
                }}>
                  Location
                </h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '10px',
                    fontWeight: 500,
                    color: 'var(--gray--500)',
                    margin: '0 0 2px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Address
                  </p>
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--gray--900)',
                    margin: 0,
                    lineHeight: 1.3
                  }}>
                    {formData.address || 'Not specified'}
                  </p>
                </div>
                
                <div>
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '10px',
                    fontWeight: 500,
                    color: 'var(--gray--500)',
                    margin: '0 0 2px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    City & Country
                  </p>
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--gray--900)',
                    margin: 0
                  }}>
                    {formData.city || 'Not specified'}, {formData.country || 'Not specified'}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Business Registration */}
            <motion.div 
              custom={2} 
              variants={sectionVariants} 
              initial="initial" 
              animate="animate"
              style={{
                backgroundColor: '#fef7f0',
                borderRadius: 'var(--radius--12px)',
                padding: '16px',
                border: '1px solid #f4e4d3'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: 'var(--radius--8px)',
                  backgroundColor: '#f97316',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14,2 14,8 20,8" />
                  </svg>
                </div>
                <h3 style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--gray--900)',
                  margin: 0
                }}>
                  Registration
                </h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '10px',
                    fontWeight: 500,
                    color: 'var(--gray--500)',
                    margin: '0 0 2px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    License
                  </p>
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--gray--900)',
                    margin: 0
                  }}>
                    {formData.businessLicense || 'Not provided'}
                  </p>
                </div>
                
                <div>
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '10px',
                    fontWeight: 500,
                    color: 'var(--gray--500)',
                    margin: '0 0 2px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Tax ID
                  </p>
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--gray--900)',
                    margin: 0
                  }}>
                    {formData.taxId || 'Not provided'}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Payment & Settings */}
            <motion.div 
              custom={3} 
              variants={sectionVariants} 
              initial="initial" 
              animate="animate"
              style={{
                backgroundColor: '#f0f4ff',
                borderRadius: 'var(--radius--12px)',
                padding: '16px',
                border: '1px solid #d1e0ff'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: 'var(--radius--8px)',
                  backgroundColor: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                </div>
                <h3 style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--gray--900)',
                  margin: 0
                }}>
                  Settings
                </h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '10px',
                    fontWeight: 500,
                    color: 'var(--gray--500)',
                    margin: '0 0 2px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Currency
                  </p>
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--gray--900)',
                    margin: 0
                  }}>
                    {formData.currency 
                      ? `${currencies[formData.currency as keyof typeof currencies]?.name} (${currencies[formData.currency as keyof typeof currencies]?.symbol})`
                      : 'Not specified'
                    }
                  </p>
                </div>
                
                <div>
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '10px',
                    fontWeight: 500,
                    color: 'var(--gray--500)',
                    margin: '0 0 2px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Payments
                  </p>
                  {selectedPaymentMethods.length > 0 ? (
                    <ul style={{
                      listStyle: 'disc inside',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'var(--gray--900)',
                      margin: '0',
                      paddingLeft: '16px',
                    }}>
                      {selectedPaymentMethods.map((method) => (
                        <li key={method}>
                          {paymentMethodLabels[method as keyof typeof paymentMethodLabels] ?? method}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'var(--gray--900)',
                      margin: 0,
                    }}>
                      None selected
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Operating Hours Overview */}
          <motion.div
            custom={4}
            variants={sectionVariants}
            initial="initial"
            animate="animate"
            style={{
              padding: '16px',
              borderRadius: 'var(--radius--12px)',
              border: '1px solid var(--gray--100)',
              backgroundColor: '#ffffff',
              marginBottom: '16px',
            }}
          >
            <h4 style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--gray--900)',
              margin: '0 0 8px 0',
            }}>
              Operating Hours
            </h4>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '8px',
              }}
            >
              {formattedOperatingHours.map((entry) => (
                <div
                  key={entry.day}
                  style={{
                    padding: '8px',
                    border: '1px solid var(--gray--100)',
                    borderRadius: 'var(--radius--8px)',
                    backgroundColor: 'var(--gray--50)',
                  }}
                >
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: 'var(--gray--600)',
                    margin: '0 0 4px 0',
                  }}>
                    {entry.day}
                  </p>
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--gray--900)',
                    margin: 0,
                  }}>
                    {entry.hours}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Confirmation Message */}
          <motion.div
            custom={5}
            variants={sectionVariants}
            initial="initial"
            animate="animate"
            style={{
              padding: '16px',
              borderRadius: 'var(--radius--12px)',
              backgroundColor: '#f8fffe',
              border: '1px solid #e6f7e6',
              textAlign: 'center'
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--verde-naturale--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <h4 style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--gray--900)',
              margin: '0 0 6px 0'
            }}>
              Ready to Setup Your Shop
            </h4>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '12px',
              fontWeight: 400,
              color: 'var(--gray--600)',
              margin: 0,
              lineHeight: 1.4
            }}>
              Everything looks good! Click Next to complete the setup and start using CeyPOS.
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
