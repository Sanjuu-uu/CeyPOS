import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type EmployeeOnboardFormData = {
  displayName: string;
  mainTerminalEmail: string;
  phone: string;
  phoneVerified: boolean;
  terminalPaired: boolean;
  ownerVerified: boolean;
  shopId: string;
  dbFileName: string;
};

type EmployeeOnboardContextValue = {
  currentStep: number;
  totalSteps: number;
  animationDirection: "next" | "prev";
  formData: EmployeeOnboardFormData;
  updateFormData: (patch: Partial<EmployeeOnboardFormData>) => void;
  canProceed: boolean;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;
  error: string | null;
  setError: (message: string | null) => void;
  isBusy: boolean;
  setIsBusy: (busy: boolean) => void;
};

const defaultFormData: EmployeeOnboardFormData = {
  displayName: "",
  mainTerminalEmail: "",
  phone: "",
  phoneVerified: false,
  terminalPaired: false,
  ownerVerified: false,
  shopId: "",
  dbFileName: "",
};

const EmployeeOnboardContext = createContext<EmployeeOnboardContextValue | null>(
  null,
);

function validateStep(step: number, data: EmployeeOnboardFormData): boolean {
  switch (step) {
    case 1:
      return (
        data.displayName.trim().length > 0 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.mainTerminalEmail.trim()) &&
        data.ownerVerified &&
        data.phone.trim().length >= 7
      );
    case 2:
      return data.phoneVerified;
    case 3:
      return data.terminalPaired;
    default:
      return true;
  }
}

export function EmployeeOnboardProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [animationDirection, setAnimationDirection] = useState<"next" | "prev">(
    "next",
  );
  const [formData, setFormData] = useState<EmployeeOnboardFormData>(defaultFormData);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const totalSteps = 3;

  const updateFormData = useCallback((patch: Partial<EmployeeOnboardFormData>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  }, []);

  const canProceed = useMemo(
    () => validateStep(currentStep, formData),
    [currentStep, formData],
  );

  const nextStep = useCallback(() => {
    if (!validateStep(currentStep, formData)) return;
    setAnimationDirection("next");
    setCurrentStep((s) => Math.min(s + 1, totalSteps));
    setError(null);
  }, [currentStep, formData]);

  const previousStep = useCallback(() => {
    setAnimationDirection("prev");
    setCurrentStep((s) => Math.max(s - 1, 1));
    setError(null);
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(Math.max(1, Math.min(step, totalSteps)));
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      currentStep,
      totalSteps,
      animationDirection,
      formData,
      updateFormData,
      canProceed,
      nextStep,
      previousStep,
      goToStep,
      error,
      setError,
      isBusy,
      setIsBusy,
    }),
    [
      animationDirection,
      canProceed,
      currentStep,
      error,
      formData,
      goToStep,
      isBusy,
      nextStep,
      previousStep,
      updateFormData,
    ],
  );

  return (
    <EmployeeOnboardContext.Provider value={value}>
      {children}
    </EmployeeOnboardContext.Provider>
  );
}

export function useEmployeeOnboard() {
  const ctx = useContext(EmployeeOnboardContext);
  if (!ctx) {
    throw new Error("useEmployeeOnboard must be used within EmployeeOnboardProvider");
  }
  return ctx;
}
