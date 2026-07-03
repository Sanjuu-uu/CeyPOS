import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import { useClerk, useUser } from '@clerk/clerk-react';
import { authFetch, waitForApiReady } from '../lib/api';

// Define the complete shop form data interface
export interface ShopFormData {
  // Step 1: Shop Details
  shopName: string;
  ownerName: string;
  email: string;
  phone: string;
  shopType: string;
  
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
  completeWizard: () => Promise<{ shopId: string; dbFileName: string }>;
  isCompleted: boolean;
  resetWizard: () => void;

  // Unique shopId for this session/shop
  shopId: string;
  shopDbFileName: string;
  isSaving: boolean;
  completionError: string | null;
  clearCompletionError: () => void;
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

type CompletionOutcome = { shopId: string; dbFileName: string };

// Provider component
interface ShopWizardProviderProps {
  children: ReactNode;
  userEmail?: string;
  initialShopId?: string;
  initialDbFileName?: string;
  initialCompleted?: boolean;
  initialFormData?: Partial<ShopFormData>;
  onStatusChange?: (status: {
    shopId?: string;
    dbFileName?: string;
    isCompleted?: boolean;
  }) => void;
}

export const ShopWizardProvider: React.FC<ShopWizardProviderProps> = ({
  children,
  userEmail,
  initialShopId,
  initialDbFileName,
  initialCompleted,
  initialFormData,
  onStatusChange,
}) => {
  const clerk = useClerk();
  const { user } = useUser();

  const sanitizedInitialForm = useMemo<Partial<ShopFormData>>(() => {
    if (!initialFormData) {
      return {};
    }

    const accumulator: Partial<ShopFormData> = {};

    (Object.keys(initialFormData) as Array<keyof ShopFormData>).forEach((key) => {
      const value = initialFormData[key];
      if (value === undefined || value === null) {
        return;
      }

      if (typeof value === 'string') {
        if (value.trim().length === 0) {
          return;
        }
        accumulator[key] = value as ShopFormData[typeof key];
        return;
      }

      if (Array.isArray(value)) {
        const filtered = value.filter(
          (item): item is string => typeof item === 'string' && item.trim().length > 0,
        );
        if (filtered.length > 0) {
          accumulator[key] = filtered as ShopFormData[typeof key];
        }
        return;
      }

      if (typeof value === 'object') {
        accumulator[key] = { ...(value as object) } as ShopFormData[typeof key];
      }
    });

    return accumulator;
  }, [initialFormData]);

  const derivedInitialEmail = useMemo(() => {
    if (userEmail) {
      return userEmail;
    }

    const candidate = sanitizedInitialForm.email;
    return typeof candidate === 'string' ? candidate : defaultFormData.email;
  }, [sanitizedInitialForm.email, userEmail]);

  const [formData, setFormData] = useState<ShopFormData>(() => ({
    ...defaultFormData,
    ...sanitizedInitialForm,
    email: derivedInitialEmail,
  }));
  const [currentStep, setCurrentStep] = useState(1);
  const [animationDirection, setAnimationDirection] = useState<AnimationDirection>('next');
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);

  const [shopId, setShopId] = useState<string>(initialShopId ?? '');
  const [shopDbFileName, setShopDbFileName] = useState<string>(initialDbFileName ?? '');
  const [isCompleted, setIsCompleted] = useState<boolean>(
    Boolean(initialCompleted && (initialShopId || initialDbFileName))
  );
  const completionStateRef = useRef<{
    status: 'idle' | 'pending' | 'success';
    promise: Promise<CompletionOutcome> | null;
    result: CompletionOutcome | null;
  }>({ status: 'idle', promise: null, result: null });
  const totalSteps = 6;

  useEffect(() => {
    if (!userEmail && Object.keys(sanitizedInitialForm).length === 0) {
      return;
    }

    setFormData((prev) => {
      const next = { ...prev };
      let hasMutated = false;

      if (!next.email && (userEmail || sanitizedInitialForm.email)) {
        const newEmail = userEmail ?? sanitizedInitialForm.email;
        if (typeof newEmail === 'string' && newEmail.trim().length > 0) {
          next.email = newEmail;
          hasMutated = true;
        }
      }

      (Object.keys(sanitizedInitialForm) as Array<keyof ShopFormData>).forEach((key) => {
        if (key === 'email') {
          return;
        }

        const value = sanitizedInitialForm[key];
        if (value === undefined || value === null) {
          return;
        }

        const currentValue = next[key];

        if (typeof value === 'string') {
          if (!currentValue) {
            next[key] = value as ShopFormData[typeof key];
            hasMutated = true;
          }
          return;
        }

        if (Array.isArray(value)) {
          const currentArray = Array.isArray(currentValue) ? currentValue : [];
          if (currentArray.length === 0 && value.length > 0) {
            next[key] = [...value] as ShopFormData[typeof key];
            hasMutated = true;
          }
          return;
        }

        if (typeof value === 'object') {
          if (!currentValue) {
            next[key] = { ...(value as object) } as ShopFormData[typeof key];
            hasMutated = true;
          }
        }
      });

      return hasMutated ? next : prev;
    });
  }, [sanitizedInitialForm, userEmail]);

  useEffect(() => {
    if (typeof initialShopId === 'string') {
      setShopId(initialShopId);
    }
  }, [initialShopId]);

  useEffect(() => {
    if (typeof initialDbFileName === 'string') {
      setShopDbFileName(initialDbFileName);
    }
  }, [initialDbFileName]);

  useEffect(() => {
    setIsCompleted(Boolean(initialCompleted && (initialShopId || initialDbFileName)));
  }, [initialCompleted, initialShopId, initialDbFileName]);

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

  const completeWizard = useCallback(async () => {
    if (completionStateRef.current.status === 'pending' && completionStateRef.current.promise) {
      return completionStateRef.current.promise;
    }

    if (completionStateRef.current.status === 'success' && completionStateRef.current.result) {
      return Promise.resolve(completionStateRef.current.result);
    }

    const ownerEmail = (formData.email || userEmail || user?.primaryEmailAddress?.emailAddress || '').trim();

    if (!ownerEmail) {
      const message = 'Owner email is required to complete shop setup.';
      setCompletionError(message);
      throw new Error(message);
    }

    const execution = (async () => {
      setIsSaving(true);
      setCompletionError(null);

      try {
        await waitForApiReady();
        const shouldUpdateExistingShop = Boolean(
          isCompleted && shopId && shopDbFileName,
        );
        const payload = {
          shopId: shouldUpdateExistingShop ? shopId : undefined,
          formData: {
            ...formData,
            email: ownerEmail,
          },
          userEmail: ownerEmail,
        };

        const response = await authFetch('/api/shop/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || result?.ok === false) {
          const message = result?.error || response.statusText || 'Failed to setup shop';
          setCompletionError(message);
          throw new Error(message);
        }

        const nextShopId = String(result.shopId || shopId || '');
        const nextDbFileName = String(
          result.dbFileName ||
            (typeof result.db_path === 'string'
              ? result.db_path.split(/\\|\//).pop() || ''
              : '')
        );

        if (!nextShopId) {
          throw new Error('Server did not return a shop identifier.');
        }

        setShopId(nextShopId);
        setShopDbFileName(nextDbFileName);
        setIsCompleted(true);

        onStatusChange?.({
          shopId: nextShopId,
          dbFileName: nextDbFileName,
          isCompleted: true,
        });

        if (user) {
          try {
            await clerk.user?.update({
              unsafeMetadata: {
                ...user.unsafeMetadata,
                shopCompleted: true,
                shopId: nextShopId,
                dbFileName: nextDbFileName,
                shopName: formData.shopName,
                ownerName: formData.ownerName,
                ownerEmail,
                phone: formData.phone,
                shopType: formData.shopType,
                address: formData.address,
                city: formData.city,
                state: formData.state,
                zipCode: formData.zipCode,
                country: formData.country,
                businessLicense: formData.businessLicense,
                taxId: formData.taxId,
                registrationNumber: formData.registrationNumber,
                currency: formData.currency,
                timezone: formData.timezone,
                paymentMethods: formData.paymentMethods,
                operatingHours: formData.operatingHours,
                lastShopSetupAt: new Date().toISOString(),
              },
            });
            await user.reload?.();
          } catch (error) {
            console.warn('Failed to update user metadata in Clerk:', error);
          }
        }

        const outcome: CompletionOutcome = { shopId: nextShopId, dbFileName: nextDbFileName };
        completionStateRef.current = {
          status: 'success',
          promise: null,
          result: outcome,
        };
        return outcome;
      } catch (error) {
        completionStateRef.current = {
          status: 'idle',
          promise: null,
          result: null,
        };
        console.error('Failed to complete wizard', error);
        if (error instanceof Error) {
          setCompletionError(error.message);
          throw error;
        }
        const fallback = 'Failed to complete shop setup. Please try again.';
        setCompletionError(fallback);
        throw new Error(fallback);
      } finally {
        setIsSaving(false);
      }
    })();

    completionStateRef.current = {
      status: 'pending',
      promise: execution,
      result: null,
    };

    return execution;
  }, [clerk.user, formData, isCompleted, onStatusChange, shopDbFileName, shopId, user, userEmail]);

  // Add function to reset wizard (for testing)
  const resetWizard = useCallback(() => {
    setIsCompleted(false);
    setShopId('');
    setShopDbFileName('');
    setCurrentStep(1);
    setFormData((prev) => ({ ...defaultFormData, email: prev.email }));
    setCompletionError(null);
    onStatusChange?.({ isCompleted: false, shopId: '', dbFileName: '' });
    completionStateRef.current = { status: 'idle', promise: null, result: null };
  }, [onStatusChange]);

  const canProceed = useMemo(() => validateStep(currentStep), [validateStep, currentStep]);

  const clearCompletionError = useCallback(() => {
    setCompletionError(null);
  }, []);

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
    resetWizard,
    isCompleted,
    shopId,
    shopDbFileName,
    isSaving,
    completionError,
    clearCompletionError,
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
