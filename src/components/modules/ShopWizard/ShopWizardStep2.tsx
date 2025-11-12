import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useShopWizard } from '../../../context/ShopWizardContext';
import './styles/ShopWizard.css';

// --- Configuration Data ---
const countryStateMap: { [country: string]: string[] } = {
  "United States": [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", 
    "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", 
    "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", 
    "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", 
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", 
    "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", 
    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", 
    "Wisconsin", "Wyoming"
  ],
  "United Kingdom": [
    "England", "Northern Ireland", "Scotland", "Wales"
  ],
  "Australia": [
    "Australian Capital Territory", "New South Wales", "Northern Territory", "Queensland", 
    "South Australia", "Tasmania", "Victoria", "Western Australia"
  ],
  "Singapore": [
    "Central Region", "East Region", "North Region", "North-East Region", "West Region"
  ],
  "Sri Lanka": [
    "Central Province", "Eastern Province", "North Central Province", "Northern Province", 
    "North Western Province", "Sabaragamuwa Province", "Southern Province", "Uva Province", 
    "Western Province"
  ],
  "India": [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", 
    "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", 
    "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", 
    "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", 
    "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", 
    "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", 
    "Ladakh", "Lakshadweep", "Puducherry"
  ]
};

const countries = Object.keys(countryStateMap);

// --- Animation Variants (Kept as is) ---
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

// --- Component with Dynamic Selectors and Fixed Validation/Styling ---
export const ShopWizardStep2: React.FC = () => {
  const { formData, updateFormData } = useShopWizard();
  const [localData, setLocalData] = useState({
    address: formData.address || '',
    city: formData.city || '',
    state: formData.state || '',
    zipCode: formData.zipCode || '',
    country: formData.country || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Get the list of states based on the current country selection
  const availableStates = countryStateMap[localData.country] || [];
  
  // Determine if the State/Province field should be disabled (no states for selected country)
  const isStateDisabled = localData.country !== '' && availableStates.length === 0;


  /**
   * Validation Function: Checks all rules and updates the errors state.
   * @returns boolean - true if valid, false otherwise
   */
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    // 1. Validate REQUIRED Fields (Address, City, Country)
    if (localData.address.trim() === '') {
      newErrors.address = 'Street Address is required.';
      isValid = false;
    }
    if (localData.city.trim() === '') {
      newErrors.city = 'City is required.';
      isValid = false;
    }
    if (localData.country.trim() === '') {
      newErrors.country = 'Country is required.';
      isValid = false;
    }

    // 2. Validate State/Province (if a selection is available/required for the country)
    if (availableStates.length > 0 && localData.state.trim() === '') {
        newErrors.state = 'State/Province is required.';
        isValid = false;
    }
    
    // 3. Validate ZIP/Postal Code (NOW REQUIRED)
    const zipTrimmed = localData.zipCode.trim();
    if (zipTrimmed === '') {
        newErrors.zipCode = 'ZIP/Postal Code is required.';
        isValid = false;
    } else if (zipTrimmed.length < 3) {
      newErrors.zipCode = 'Please enter a valid ZIP/Postal Code (min 3 characters).';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  }, [localData, availableStates.length]);


  const handleInputChange = (field: string, value: string) => {
    // Special handling for country change to reset state
    if (field === 'country') {
        const nextStateValue = ''; // Always clear state on country change
        setLocalData(prev => ({ 
            ...prev, 
            country: value, 
            state: nextStateValue // Reset state when country changes
        }));
    } else {
        setLocalData(prev => ({ ...prev, [field]: value }));
    }

    // Optimistically clear the error when the user interacts with a field that has an error.
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Effect to update the global form data whenever local data changes
  // and re-validate if errors are already visible (dynamic validation feedback).
  useEffect(() => {
    updateFormData(localData);
    if (Object.keys(errors).length > 0) {
        validateForm(); 
    }
  }, [localData, updateFormData, validateForm, errors]);

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
                    // Fix: Ensure border reverts to gray or error color after focus
                    validateForm(); // Validate first to update errors
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
                {/* COUNTRY SELECTOR */}
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
                      validateForm(); // Validate first to update errors
                       // Fix: Ensure border reverts to gray or error color after focus
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
                

                {/* STATE/PROVINCE SELECTOR */}
                <motion.div custom={2} variants={inputVariants} initial="initial" animate="animate">
                  <label style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--gray--900)',
                    display: 'block',
                    marginBottom: '6px'
                  }}>
                    State/Province {availableStates.length > 0 ? '*' : ''}
                  </label>
                  <select
                    value={localData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className="text-field-outline"
                    disabled={localData.country === '' || isStateDisabled}
                    style={{
                      width: '100%',
                      height: '48px',
                      border: `1px solid ${errors.state ? '#ef4444' : (localData.country === '' || isStateDisabled ? 'var(--gray--300)' : 'var(--gray--200)')}`,
                      borderRadius: 'var(--radius--12px)',
                      backgroundColor: localData.country === '' || isStateDisabled ? 'var(--gray--50)' : 'var(--main--white)',
                      padding: '0 16px',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '14px',
                      lineHeight: '48px',
                      transition: 'all .3s',
                      outline: 'none',
                      cursor: localData.country === '' || isStateDisabled ? 'not-allowed' : 'pointer'
                    }}
                    onFocus={(e) => {
                       if (!isStateDisabled) {
                           e.target.style.borderColor = 'var(--gray--900)';
                       }
                    }}
                    onBlur={(e) => {
                       validateForm(); // Validate first to update errors
                       // Fix: Ensure border reverts to gray, disabled, or error color after focus
                       const defaultBorderColor = localData.country === '' || isStateDisabled ? 'var(--gray--300)' : 'var(--gray--200)';
                       e.target.style.borderColor = errors.state ? '#ef4444' : defaultBorderColor;
                    }}
                  >
                    <option value="">
                      {localData.country === ''
                        ? 'Select a country first'
                        : availableStates.length > 0
                          ? 'Select state or province'
                          : 'Not applicable'
                      }
                    </option>
                    {availableStates.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                  {errors.state && (
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
                      {errors.state}
                    </motion.p>
                  )}
                </motion.div>
              </div>

              {/* ZIP Code and Country Row */}
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
                       validateForm(); // Validate first to update errors
                       // Fix: Ensure border reverts to gray or error color after focus
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
                <motion.div custom={3} variants={inputVariants} initial="initial" animate="animate">
                  <label style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--gray--900)',
                    display: 'block',
                    marginBottom: '6px'
                  }}>
                    ZIP/Postal Code *
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
                      border: `1px solid ${errors.zipCode ? '#ef4444' : 'var(--gray--200)'}`,
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
                      validateForm(); // Validate first to update errors
                      // Fix: Ensure border reverts to gray or error color after focus
                      e.target.style.borderColor = errors.zipCode ? '#ef4444' : 'var(--gray--200)';
                    }}
                  />
                  {errors.zipCode && (
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
                      {errors.zipCode}
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