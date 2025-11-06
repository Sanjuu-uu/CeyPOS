import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useShopWizard } from "../../../context/ShopWizardContext";
import "./styles/ShopWizard.css";

// ... (cardVariants, inputVariants, shopTypes, predefinedShopTypeValues, countryCodes all remain the same) ...

const cardVariants = {
  initial: { y: 20, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut",
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
      delay: index * 0.05,
      ease: "easeOut",
    },
  }),
};

const shopTypes = [
  {
    value: "retail",
    label: "Retail Store",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 4V2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2h4a1 1 0 0 1 1 1v1.5a1.5 1.5 0 0 1-1.5 1.5h-.5v12a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8h-.5A1.5 1.5 0 0 1 2 6.5V5a1 1 0 0 1 1-1h4zm0 4v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8H7zm2-3h6V3H9v2z" />
      </svg>
    ),
    description: "Physical goods",
  },
  {
    value: "restaurant",
    label: "Restaurant",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8.1 13.34l2.83-2.83L3.91 3.5a4.008 4.008 0 0 0 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.20-1.10-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z" />
      </svg>
    ),
    description: "Food & beverage",
  },
  {
    value: "service",
    label: "Service Business",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z" />
      </svg>
    ),
    description: "Professional services",
  },
  {
    value: "salon_spa",
    label: "Salon / Spa",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C9.2 2 7 4.2 7 7s.9 4.3 2.5 5.5c-.3 1.2-1 3.1-1.5 4.5H9v2h2v-2h2v2h2v-2h-1c-.5-1.4-1.2-3.3-1.5-4.5C16.1 11.3 17 9 17 7s-2.2-5-5-5zM9 7c0-1.7 1.3-3 3-3s3 1.3 3 3-1.3 3-3 3-3-1.3-3-3z" />
      </svg>
    ),
    description: "Beauty & wellness",
  },
  {
    value: "ecommerce",
    label: "E-commerce",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4 14H8c-.6 0-1-.4-1-1s.4-1 1-1h8c.6 0 1 .4 1 1s-.4 1-1 1zm-1-4H9c-.6 0-1-.4-1-1s.4-1 1-1h6c.6 0 1 .4 1 1s-.4 1-1 1z" />
      </svg>
    ),
    description: "Online-only store",
  },
  {
    value: "wholesale",
    label: "Wholesale",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 7H4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2zM4 9h16v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9zm3 3v2h2v-2H7zm8 0v2h2v-2h-2z" />
      </svg>
    ),
    description: "Bulk & distribution",
  },
  {
    value: "other",
    label: "Other",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 5C10.9 5 10 5.9 10 7s.9 2 2 2 2-.9 2-2-.9-2-2-2zM12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM12 17c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
      </svg>
    ),
    description: "Please specify",
  },
];

const predefinedShopTypeValues = [
  "retail",
  "restaurant",
  "service",
  "salon_spa",
  "ecommerce",
  "wholesale",
  "other",
] as const;

type ShopTypeEnum = (typeof predefinedShopTypeValues)[number] | "";

const countryCodes = [
  { value: "+94", label: "LK +94" },
  { value: "+91", label: "IN +91" },
  { value: "+1", label: "US +1" },
  { value: "+44", label: "UK +44" },
  { value: "+61", label: "AU +61" },
  { value: "+65", label: "SG +65" },
];

/**
 * Validates a single field.
 * @returns An error message string, or an empty string if valid.
 */
const validateField = (
  field: string,
  value: string,
  uiSelectedType?: string
): string => {
  switch (field) {
    case "shopName":
      return value.trim() ? "" : "Shop name is required.";
    case "ownerName":
      return value.trim() ? "" : "Owner name is required.";
    case "email":
      if (!value.trim()) return "Email address is required.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
        return "Please enter a valid email address.";
      return "";
    case "localPhone":
      if (!value.trim()) return "Phone number is required.";
      if (!/^[0-9\s-]{7,10}$/.test(value))
        return "Please enter a valid phone number (7-10 digits).";
      return "";
    case "shopType":
      if (!uiSelectedType) {
        return "Please select a shop type.";
      }
      return "";
    case "otherShopType":
      if (uiSelectedType === "other" && !value.trim()) {
        return "Please specify your shop type.";
      }
      return "";
    default:
      return "";
  }
};

export const ShopWizardStep1: React.FC = () => {
  const { formData, updateFormData } = useShopWizard();

  const [localData, setLocalData] = useState({
    shopName: formData.shopName,
    ownerName: formData.ownerName,
    email: formData.email,
  });

  const [countryCode, setCountryCode] = useState("+94");
  const [localPhone, setLocalPhone] = useState("");
  const [uiSelectedType, setUiSelectedType] = useState<ShopTypeEnum>("");
  const [otherShopType, setOtherShopType] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (formData.shopType) {
      const isPredefined = (
        predefinedShopTypeValues as readonly string[]
      ).includes(formData.shopType);
      if (isPredefined) {
        setUiSelectedType(formData.shopType as ShopTypeEnum);
      } else {
        setUiSelectedType("other");
        setOtherShopType(formData.shopType);
      }
    }

    if (formData.phone) {
      const parts = formData.phone.split(" ");
      const foundCode = countryCodes.find((c) => c.value === parts[0]);
      if (foundCode && parts.length > 1) {
        setCountryCode(foundCode.value);
        setLocalPhone(parts.slice(1).join(" "));
      } else {
        setLocalPhone(formData.phone);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (field: string, value: string) => {
    if (field in localData) {
      setLocalData((prev) => ({ ...prev, [field]: value }));
    } else if (field === "countryCode") {
      setCountryCode(value);
    } else if (field === "localPhone") {
      setLocalPhone(value);
    } else if (field === "otherShopType") {
      setOtherShopType(value);
    }

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }

    if (field === "otherShopType" && errors.shopType) {
      setErrors((prev) => ({ ...prev, shopType: "" }));
    }
  };

  const handleShopTypeClick = (value: ShopTypeEnum) => {
    setUiSelectedType(value);
    if (value !== "other" && errors.otherShopType) {
      setErrors((prev) => ({ ...prev, otherShopType: "" }));
    }
    if (errors.shopType) {
      setErrors((prev) => ({ ...prev, shopType: "" }));
    }
  };

  const handleBlur = (field: keyof typeof errors) => {
    let error = "";
    let value = "";

    if (field === "localPhone") {
      value = localPhone;
      error = validateField(field, value);
    } else if (field === "shopType") {
      error = validateField(field, "", uiSelectedType);
    } else if (field === "otherShopType") {
      value = otherShopType;
      error = validateField(field, value, uiSelectedType);
    } else if (field in localData) {
      value = localData[field as keyof typeof localData];
      error = validateField(field, value);
    }

    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }));
    } else {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // --- MODIFIED: This useEffect now contains the validation fixes ---
  useEffect(() => {
    // --- FIX 1: Validate phone locally ---
    const phoneError = validateField("localPhone", localPhone);
    // If phone is invalid, send an empty string to force context validation to fail
    const combinedPhone = phoneError
      ? ""
      : `${countryCode} ${localPhone}`.trim();

    // --- FIX 2: Validate "Other" shop type locally ---
    const otherShopTypeError = validateField(
      "otherShopType",
      otherShopType,
      uiSelectedType
    );
    // If "Other" is selected but the field is empty, send an empty string
    // to force context validation to fail
    const finalShopType = otherShopTypeError ? "" : uiSelectedType;

    // Send the potentially "falsified" data to the context
    const dataToUpdate = {
      ...localData,
      phone: combinedPhone,
      shopType: finalShopType,
      otherShopType: uiSelectedType === "other" ? otherShopType : "",
    };

    // This update will now trigger the context's validation
    // If phone or shopType is "", the context will set canProceed = false
    updateFormData(dataToUpdate as any);
  }, [
    localData,
    countryCode,
    localPhone,
    uiSelectedType,
    otherShopType,
    updateFormData,
  ]);

  return (
    <div className="w-full flex justify-center">
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        className="w-full max-w-4xl"
      >
        <div
          className="p-6 shadow-lg"
          style={{
            backgroundColor: "var(--main--white)",
            borderRadius: "var(--radius--16px)",
            border: "1px solid var(--gray--200)",
          }}
        >
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-6"
          >
            <h2
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "20px",
                fontWeight: 600,
                lineHeight: 1.3,
                color: "var(--gray--900)",
                marginBottom: "6px",
              }}
            >
              Tell Us About Your Shop
            </h2>
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "14px",
                fontWeight: 400,
                lineHeight: 1.5,
                color: "var(--gray--500)",
              }}
            >
              Let's start with the basic information. Please provide accurate
              details for your new CeyPOS account.
            </p>
          </motion.div>

          <div className="form-h">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3">
              {/* --- Left Column --- */}
              <div className="space-y-3">
                {/* Shop Name */}
                <motion.div
                  custom={0}
                  variants={inputVariants}
                  initial="initial"
                  animate="animate"
                >
                  <label
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "var(--gray--900)",
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    Shop Name *
                  </label>
                  <input
                    type="text"
                    value={localData.shopName}
                    onChange={(e) =>
                      handleInputChange("shopName", e.target.value)
                    }
                    onBlur={() => handleBlur("shopName")}
                    placeholder="Enter your shop name"
                    className="text-field-outline"
                    style={{
                      width: "100%",
                      height: "48px",
                      border: `1px solid ${
                        errors.shopName ? "#ef4444" : "var(--gray--200)"
                      }`,
                      borderRadius: "var(--radius--12px)",
                      backgroundColor: "var(--main--white)",
                      padding: "0 16px",
                      fontFamily: "Inter, sans-serif",
                      fontSize: "14px",
                      lineHeight: "48px",
                      transition: "all .3s",
                      outline: "none",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "var(--gray--900)";
                    }}
                    onBlurCapture={(e) => {
                      e.target.style.borderColor = errors.shopName
                        ? "#ef4444"
                        : "var(--gray--200)";
                      handleBlur("shopName");
                    }}
                  />
                  {errors.shopName && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "11px",
                        color: "#ef4444",
                        marginTop: "3px",
                      }}
                    >
                      {errors.shopName}
                    </motion.p>
                  )}
                </motion.div>

                {/* Owner Name */}
                <motion.div
                  custom={1}
                  variants={inputVariants}
                  initial="initial"
                  animate="animate"
                >
                  <label
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "var(--gray--900)",
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    Owner Name *
                  </label>
                  <input
                    type="text"
                    value={localData.ownerName}
                    onChange={(e) =>
                      handleInputChange("ownerName", e.target.value)
                    }
                    onBlur={() => handleBlur("ownerName")}
                    placeholder="Enter owner's full name"
                    className="text-field-outline"
                    style={{
                      width: "100%",
                      height: "48px",
                      border: `1px solid ${
                        errors.ownerName ? "#ef4444" : "var(--gray--200)"
                      }`,
                      borderRadius: "var(--radius--12px)",
                      backgroundColor: "var(--main--white)",
                      padding: "0 16px",
                      fontFamily: "Inter, sans-serif",
                      fontSize: "14px",
                      lineHeight: "48px",
                      transition: "all .3s",
                      outline: "none",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "var(--gray--900)";
                    }}
                    onBlurCapture={(e) => {
                      e.target.style.borderColor = errors.ownerName
                        ? "#ef4444"
                        : "var(--gray--200)";
                      handleBlur("ownerName");
                    }}
                  />
                  {errors.ownerName && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "11px",
                        color: "#ef4444",
                        marginTop: "3px",
                      }}
                    >
                      {errors.ownerName}
                    </motion.p>
                  )}
                </motion.div>

                {/* Email */}
                <motion.div
                  custom={2}
                  variants={inputVariants}
                  initial="initial"
                  animate="animate"
                >
                  <label
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "var(--gray--900)",
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={localData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    onBlur={() => handleBlur("email")}
                    placeholder="Enter email address"
                    className="text-field-outline"
                    style={{
                      width: "100%",
                      height: "48px",
                      border: `1px solid ${
                        errors.email ? "#ef4444" : "var(--gray--200)"
                      }`,
                      borderRadius: "var(--radius--12px)",
                      backgroundColor: "var(--main--white)",
                      padding: "0 16px",
                      fontFamily: "Inter, sans-serif",
                      fontSize: "14px",
                      lineHeight: "48px",
                      transition: "all .3s",
                      outline: "none",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "var(--gray--900)";
                    }}
                    onBlurCapture={(e) => {
                      e.target.style.borderColor = errors.email
                        ? "#ef4444"
                        : "var(--gray--200)";
                      handleBlur("email");
                    }}
                  />
                  {errors.email && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "11px",
                        color: "#ef4444",
                        marginTop: "3px",
                      }}
                    >
                      {errors.email}
                    </motion.p>
                  )}
                </motion.div>

                {/* Phone Number Group */}
                <motion.div
                  custom={3}
                  variants={inputVariants}
                  initial="initial"
                  animate="animate"
                >
                  <label
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "var(--gray--900)",
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    Phone Number *
                  </label>
                  <div style={{ display: "flex", gap: "0px" }}>
                    <select
                      value={countryCode}
                      onChange={(e) =>
                        handleInputChange("countryCode", e.target.value)
                      }
                      style={{
                        height: "48px",
                        border: "1px solid var(--gray--200)",
                        borderRight: "none",
                        borderRadius:
                          "var(--radius--12px) 0 0 var(--radius--12px)",
                        backgroundColor: "var(--gray--100)",
                        padding: "0 16px",
                        fontFamily: "Inter, sans-serif",
                        fontSize: "14px",
                        color: "var(--gray--700)",
                        transition: "all .3s",
                        outline: "none",
                        appearance: "none",
                        cursor: "pointer",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "var(--gray--900)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "var(--gray--200)";
                      }}
                    >
                      {countryCodes.map((code) => (
                        <option key={code.value} value={code.value}>
                          {code.label}
                        </option>
                      ))}
                    </select>

                    <input
                      type="tel"
                      value={localPhone}
                      onChange={(e) =>
                        handleInputChange("localPhone", e.target.value)
                      }
                      onBlur={() => handleBlur("localPhone")}
                      placeholder="e.g. 771234567"
                      className="text-field-outline"
                      style={{
                        width: "100%",
                        height: "48px",
                        border: `1px solid ${
                          errors.localPhone ? "#ef4444" : "var(--gray--200)"
                        }`,
                        borderRadius:
                          "0 var(--radius--12px) var(--radius--12px) 0",
                        backgroundColor: "var(--main--white)",
                        padding: "0 16px",
                        fontFamily: "Inter, sans-serif",
                        fontSize: "14px",
                        lineHeight: "48px",
                        transition: "all .3s",
                        outline: "none",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "var(--gray--900)";
                      }}
                      onBlurCapture={(e) => {
                        e.target.style.borderColor = errors.localPhone
                          ? "#ef4444"
                          : "var(--gray--200)";
                        handleBlur("localPhone");
                      }}
                    />
                  </div>
                  {errors.localPhone && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "11px",
                        color: "#ef4444",
                        marginTop: "3px",
                      }}
                    >
                      {errors.localPhone}
                    </motion.p>
                  )}
                </motion.div>
              </div>

              {/* --- Right Column --- */}
              <div className="space-y-3">
                <motion.div
                  custom={4}
                  variants={inputVariants}
                  initial="initial"
                  animate="animate"
                >
                  <label
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "var(--gray--900)",
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    Select The Shop Type *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {shopTypes.map((type, index) => (
                      <motion.button
                        key={type.value}
                        type="button"
                        custom={5 + index}
                        variants={inputVariants}
                        initial="initial"
                        animate="animate"
                        whileTap={{ scale: 0.98 }}
                        onClick={() =>
                          handleShopTypeClick(type.value as ShopTypeEnum)
                        }
                        style={{
                          padding: "12px",
                          borderRadius: "var(--radius--12px)",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          borderColor:
                            uiSelectedType === type.value
                              ? "#c5f542"
                              : errors.shopType
                              ? "#ef4444"
                              : "var(--gray--200)",
                          backgroundColor:
                            uiSelectedType === type.value ? "#c5f542" : "white",
                          textAlign: "left",
                          transition: "all 0.2s ease",
                          cursor: "pointer",
                          height: "70px",
                        }}
                        className="hover:shadow-md"
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            marginBottom: "4px",
                          }}
                        >
                          <div
                            style={{
                              color: "var(--gray--900)",
                              marginRight: "8px",
                              transform: "scale(0.8)",
                            }}
                          >
                            {type.icon}
                          </div>
                          <span
                            style={{
                              fontFamily: "Inter, sans-serif",
                              fontSize: "12px",
                              fontWeight: 500,
                              color: "var(--gray--900)",
                            }}
                          >
                            {type.label}
                          </span>
                        </div>
                        <p
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: "10px",
                            fontWeight: 400,
                            color: "var(--gray--500)",
                            margin: 0,
                            lineHeight: 1.3,
                          }}
                        >
                          {type.description}
                        </p>
                      </motion.button>
                    ))}
                  </div>
                  {errors.shopType && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "11px",
                        color: "#ef4444",
                        marginTop: "6px",
                      }}
                    >
                      {errors.shopType}
                    </motion.p>
                  )}
                </motion.div>

                {/* "Other" Input */}
                <AnimatePresence>
                  {uiSelectedType === "other" && (
                    <motion.div
                      custom={1}
                      variants={inputVariants}
                      initial="initial"
                      animate="animate"
                      exit={{
                        opacity: 0,
                        y: -10,
                        transition: { duration: 0.2 },
                      }}
                    >
                      <label
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "12px",
                          fontWeight: 500,
                          color: "var(--gray--900)",
                          display: "block",
                          marginBottom: "6px",
                        }}
                      >
                        Please specify *
                      </label>
                      <input
                        type="text"
                        value={otherShopType}
                        onChange={(e) =>
                          handleInputChange("otherShopType", e.target.value)
                        }
                        onBlur={() => handleBlur("otherShopType")}
                        placeholder="e.g. 'Gym' or 'Bookstore'"
                        className="text-field-outline"
                        style={{
                          width: "100%",
                          height: "48px",
                          border: `1px solid ${
                            errors.otherShopType
                              ? "#ef4444"
                              : "var(--gray--200)"
                          }`,
                          borderRadius: "var(--radius--12px)",
                          backgroundColor: "var(--main--white)",
                          padding: "0 16px",
                          fontFamily: "Inter, sans-serif",
                          fontSize: "14px",
                          lineHeight: "48px",
                          transition: "all .3s",
                          outline: "none",
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = "var(--gray--900)";
                        }}
                        onBlurCapture={(e) => {
                          e.target.style.borderColor = errors.otherShopType
                            ? "#ef4444"
                            : "var(--gray--200)";
                          handleBlur("otherShopType");
                        }}
                      />
                      {errors.otherShopType && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: "11px",
                            color: "#ef4444",
                            marginTop: "3px",
                          }}
                        >
                          {errors.otherShopType}
                        </motion.p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
