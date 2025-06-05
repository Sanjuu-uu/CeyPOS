import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useShopWizard } from "../../../context/ShopWizardContext";
import "./styles/ShopWizard.css";

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
      delay: index * 0.1,
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
    description: "Physical goods, merchandise",
  },
  {
    value: "restaurant",
    label: "Restaurant",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8.1 13.34l2.83-2.83L3.91 3.5a4.008 4.008 0 0 0 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.20-1.10-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z" />
      </svg>
    ),
    description: "Food & beverage service",
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
    value: "wholesale",
    label: "Wholesale",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 7H4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2zM4 9h16v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9zm3 3v2h2v-2H7zm8 0v2h2v-2h-2z" />
      </svg>
    ),
    description: "Bulk & distribution",
  },
];

export const ShopWizardStep1: React.FC = () => {
  const { formData, updateFormData } = useShopWizard();
  const [localData, setLocalData] = useState({
    shopName: formData.shopName,
    ownerName: formData.ownerName,
    email: formData.email,
    phone: formData.phone,
    shopType: formData.shopType,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setLocalData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
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
          className="p-6 shadow-lg"
          style={{
            backgroundColor: "var(--main--white)",
            borderRadius: "var(--radius--16px)",
            border: "1px solid var(--gray--200)",
            minHeight: "400px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
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
              we are here
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
              Let's start with the basic information about your business
            </p>
          </motion.div>

          <div className="form-h">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column */}
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
                    onBlur={(e) => {
                      e.target.style.borderColor = errors.shopName
                        ? "#ef4444"
                        : "var(--gray--200)";
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
                    onBlur={(e) => {
                      e.target.style.borderColor = errors.ownerName
                        ? "#ef4444"
                        : "var(--gray--200)";
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
                    onBlur={(e) => {
                      e.target.style.borderColor = errors.email
                        ? "#ef4444"
                        : "var(--gray--200)";
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

                {/* Phone */}
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
                  <input
                    type="tel"
                    value={localData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="Enter phone number"
                    className="text-field-outline"
                    style={{
                      width: "100%",
                      height: "48px",
                      border: `1px solid ${
                        errors.phone ? "#ef4444" : "var(--gray--200)"
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
                    onBlur={(e) => {
                      e.target.style.borderColor = errors.phone
                        ? "#ef4444"
                        : "var(--gray--200)";
                    }}
                  />
                  {errors.phone && (
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
                      {errors.phone}
                    </motion.p>
                  )}
                </motion.div>
              </div>

              {/* Right Column - Shop Type Selection */}
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
                    Shop Type *
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
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() =>
                          handleInputChange("shopType", type.value)
                        }
                        style={{
                          padding: "12px",
                          borderRadius: "var(--radius--12px)",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          borderColor:
                            localData.shopType === type.value
                              ? "#c5f542"
                              : "var(--gray--200)",
                          backgroundColor:
                            localData.shopType === type.value
                              ? "#c5f542"
                              : "white",
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
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
