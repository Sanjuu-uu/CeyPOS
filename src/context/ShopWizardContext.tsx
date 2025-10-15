import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { useClerk, useUser } from '@clerk/clerk-react';
import { generateShopId } from '../lib/api';

// Define the complete shop form data interface
export interface ShopFormData {
  // Step 1: Shop Details
  shopName: string;
  ownerName: string;
  email: string;
  phone: string;
  shopType: 'retail' | 'restaurant' | 'service' | 'wholesale' | '';
  
  // Step 2: Location Info
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  
  // Step 3: Business Registration
  businessLicense: string;
  taxId: string;
  registrationNumber: string;
  
  // Step 4: Shop Settings
  currency: string;
  timezone: string;
  operatingHours: {
    monday: { open: string; close: string; closed: boolean };
    tuesday: { open: string; close: string; closed: boolean };
    wednesday: { open: string; close: string; closed: boolean };
    thursday: { open: string; close: string; closed: boolean };
    friday: { open: string; close: string; closed: boolean };
    saturday: { open: string; close: string; closed: boolean };
    sunday: { open: string; close: string; closed: boolean };
  };
  paymentMethods: string[];
}

// Animation direction type
export type AnimationDirection = 'next' | 'previous' | 'initial';

// Shop Wizard Context interface
export interface ShopWizardContextType {
  // Form data
  formData: ShopFormData;
  updateFormData: (stepData: Partial<ShopFormData>) => void;

  // Navigation
  currentStep: number;
  totalSteps: number;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;

  // Animation state
  animationDirection: AnimationDirection;
  isAnimating: boolean;
  // Validation
  validateStep: (step: number) => boolean;
  isStepCompleted: (step: number) => boolean;
  canProceed: boolean;

  // Wizard completion
  completeWizard: () => Promise<string>; // Return shopId
  isCompleted: boolean;
  resetWizard: () => void;

  // Unique shopId for this session/shop
  shopId: string;
}

// Default form data
const defaultFormData: ShopFormData = {
  // Step 1: Shop Details
  shopName: '',
  ownerName: '',
  email: '',
  phone: '',
  shopType: '',
  
  // Step 2: Location Info
  address: '',
  city: '',
  state: '',
  zipCode: '',
  country: '',
  
  // Step 3: Business Registration
  businessLicense: '',
  taxId: '',
  registrationNumber: '',
  
  // Step 4: Shop Settings
  currency: 'USD',
  timezone: 'UTC',
  operatingHours: {
    monday: { open: '09:00', close: '17:00', closed: false },
    tuesday: { open: '09:00', close: '17:00', closed: false },
    wednesday: { open: '09:00', close: '17:00', closed: false },
    thursday: { open: '09:00', close: '17:00', closed: false },
    friday: { open: '09:00', close: '17:00', closed: false },
    saturday: { open: '09:00', close: '17:00', closed: false },
    sunday: { open: '09:00', close: '17:00', closed: true },
  },
  paymentMethods: [],
};

// Create the context
const ShopWizardContext = createContext<ShopWizardContextType | undefined>(undefined);

// Provider component
export const ShopWizardProvider: React.FC<{ children: ReactNode, userId?: string, userEmail?: string }> = ({ children, userId: propUserId, userEmail: propUserEmail }) => {
  const clerk = useClerk();
  const { user } = useUser();
  // Check localStorage for existing shop setup on initialization
  const [isCompleted, setIsCompleted] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ceypos-shop-completed') === 'true';
    }
    return false;
  });

  const [formData, setFormData] = useState<ShopFormData>(defaultFormData);
  const [currentStep, setCurrentStep] = useState(1);
  const [animationDirection, setAnimationDirection] = useState<AnimationDirection>('next');
  const [isAnimating, setIsAnimating] = useState(false);
  // Persisted shopId for this session - use email-based ID for consistency
  const [shopId, setShopId] = useState(() => {
    if (propUserEmail) {
      return generateShopId(propUserEmail);
    }
    if (propUserId) {
      return `user_${propUserId}`;
    }
    return localStorage.getItem('ceypos-shop-id') || '';
  });
  const totalSteps = 6;

  const updateFormData = useCallback((stepData: Partial<ShopFormData>) => {
    setFormData(prev => ({ ...prev, ...stepData }));
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps) {
      setAnimationDirection('next');
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setIsAnimating(false);
      }, 200);
    }
  }, [currentStep]);

  const previousStep = useCallback(() => {
    if (currentStep > 1) {
  setAnimationDirection('previous');
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev - 1);
        setIsAnimating(false);
      }, 200);
    }
  }, [currentStep]);

  const goToStep = (step: number) => {
    if (step >= 1 && step <= totalSteps && step !== currentStep) {
      setAnimationDirection(step > currentStep ? 'next' : 'previous');
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(step);
        setIsAnimating(false);
      }, 200);
    }
  };

  const validateStep = useCallback((step: number): boolean => {
    switch (step) {
      case 1: // Shop Details
        return !!(formData.shopName && formData.ownerName && formData.email && formData.phone && formData.shopType);
      case 2: // Location Info
        return !!(formData.address && formData.city && formData.state && formData.zipCode && formData.country);
      case 3: // Business Registration
        return !!(formData.businessLicense && formData.taxId && formData.registrationNumber);
      case 4: // Shop Settings
        return !!(formData.currency && formData.timezone && formData.paymentMethods.length > 0);
      case 5: // Review & Confirm
        return !!(formData.shopName && formData.ownerName && formData.email && formData.phone && formData.shopType) &&
               !!(formData.address && formData.city && formData.state && formData.zipCode && formData.country) &&
               !!(formData.businessLicense && formData.taxId && formData.registrationNumber) &&
               !!(formData.currency && formData.timezone && formData.paymentMethods.length > 0);
      default:
        return false;
    }
  }, [formData]);

  const isStepCompleted = useCallback((step: number): boolean => {
    return validateStep(step);
  }, [validateStep]);

  const completeWizard = async (): Promise<string> => {
    try {
      // Use email-based shopId for consistency across login/register
      let _shopId = shopId;
      if (!_shopId && propUserEmail) {
        _shopId = generateShopId(propUserEmail);
      }
      if (!_shopId && propUserId) {
        _shopId = `user_${propUserId}`;
      }
      if (!_shopId) {
        _shopId = localStorage.getItem('ceypos-shop-id') || '';
      }
      if (!_shopId) {
        // Final fallback - should not happen with proper user data
        _shopId = String(Math.floor(Date.now() / 1000));
      }

      setShopId(_shopId);
      localStorage.setItem('ceypos-shop-id', _shopId);

      // Persist to backend SQLite - this creates the database file
      const response = await fetch('/api/shop/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId: _shopId, formData }),
      });

      if (!response.ok) {
        throw new Error(`Failed to setup shop: ${response.statusText}`);
      }

      setIsCompleted(true);
      localStorage.setItem('ceypos-shop-completed', 'true');
      localStorage.setItem('ceypos-shop-data', JSON.stringify(formData));
      console.log('Shop created successfully:', { shopId: _shopId, formData });

      // Update Clerk user metadata to mark shop as completed
      if (user) {
        try {
          await clerk.user?.update({
            unsafeMetadata: {
              ...user.unsafeMetadata,
              shopCompleted: true,
              shopId: _shopId,
              shopName: formData.shopName,
              ownerName: formData.ownerName,
              email: formData.email,
              phone: formData.phone,
              shopType: formData.shopType,
              businessLicense: formData.businessLicense,
              taxId: formData.taxId,
              registrationNumber: formData.registrationNumber,
            },
          });
        } catch (error) {
          console.warn('Failed to update user metadata:', error);
        }
      }

      // Navigation is handled by the component that calls completeWizard
      return _shopId;
    } catch (e) {
      console.error('Failed to complete wizard', e);
      throw e;
    }
  };

  // Add function to reset wizard (for testing)
  const resetWizard = () => {
  setIsCompleted(false);
  setShopId('');
  localStorage.removeItem('ceypos-shop-completed');
  localStorage.removeItem('ceypos-shop-data');
  localStorage.removeItem('ceypos-shop-id');
  };

  const canProceed = useMemo(() => validateStep(currentStep), [validateStep, currentStep]);

  const contextValue: ShopWizardContextType = {
  formData,
  updateFormData,
  currentStep,
  totalSteps,
  nextStep,
  previousStep,
  goToStep,
  animationDirection,
  isAnimating,
  validateStep,
  isStepCompleted,
  canProceed,
  completeWizard,
  resetWizard, // Add reset function
  isCompleted,
  shopId,
  };

  return (
    <ShopWizardContext.Provider value={contextValue}>
      {children}
    </ShopWizardContext.Provider>
  );
};

// Custom hook to use the Shop Wizard context
export const useShopWizard = (): ShopWizardContextType => {
  const context = useContext(ShopWizardContext);
  if (context === undefined) {
    throw new Error('useShopWizard must be used within a ShopWizardProvider');
  }
  return context;
};
