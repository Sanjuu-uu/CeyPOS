import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShopWizard } from '../../../context/ShopWizardContext';
import { ShopWizardStep1 } from './ShopWizardStep1';
import { ShopWizardStep2 } from './ShopWizardStep2';
import { ShopWizardStep3 } from './ShopWizardStep3';
import { ShopWizardStep4 } from './ShopWizardStep4';
import { ShopWizardStep5 } from './ShopWizardStep5';
import { ShopWizardStep6 } from './ShopWizardStep6';
import { ShopWizardProgressBar } from './ShopWizardProgressBar';
import backgroundImage from './assets/blog-20background-1.png';
import './styles/ShopWizard.css';

const slideVariants = {
  initial: (direction: string) => ({
    y: direction === 'next' ? 200 : -200,
    opacity: 0,
  }),
  animate: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: (direction: string) => ({
    y: direction === 'next' ? -200 : 200,
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  }),
};

const containerVariants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
      staggerChildren: 0.05,
    },
  },
};

export const ShopWizard: React.FC = () => {
  const { currentStep, animationDirection } = useShopWizard();

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <ShopWizardStep1 />;
      case 2:
        return <ShopWizardStep2 />;
      case 3:
        return <ShopWizardStep3 />;
      case 4:
        return <ShopWizardStep4 />;
      case 5:
        return <ShopWizardStep5 />;
      case 6:
        return <ShopWizardStep6 />;
      default:
        return <ShopWizardStep1 />;
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className="h-screen flex flex-col"      style={{ 
        backgroundColor: 'var(--main--white)',
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        overflow: 'hidden' // Prevent scrollbar during animations
      }}
    >
      {/* Navigation Bar - Dashboard Style */}
      <motion.div
        className="navigation"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.95)', 
          backdropFilter: 'blur(10px)',
          flexShrink: 0 // Prevent navbar from shrinking
        }}
      >
        <div className="navigation-container">
          <div className="navigation-left">
            <div className="navigation-logo">
              <svg width="92" height="28" viewBox="0 0 92 28" fill="none">
                <rect width="92" height="28" rx="8" />
                <text x="46" y="18" textAnchor="middle" fill="var(--gray--900)" fontSize="12" fontWeight="600">
                  CeyPOS
                </text>
              </svg>
            </div>
          </div>
          
          <div className="nav-menu">
            <h3 style={{
              color: 'var(--gray--900)',
              letterSpacing: '-.01em',
              marginTop: 0,
              marginBottom: 0,
              fontSize: '24px',
              fontWeight: 600,
              lineHeight: 1.2,
              fontFamily: 'Inter, sans-serif'
            }}>
              Shop Creation In CeyPOS
            </h3>
          </div>

          <div className="navigation-right">
            <div className="navigation-button-group">
              <a href="#" className="button-outline-small">Home</a>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content - Centered and Optimized */}
      <div 
        className="flex-1 flex items-center justify-center px-4 overflow-hidden" 
        style={{ 
          height: 'calc(100vh - 140px)',  // Fixed height
          position: 'relative'
        }}
      >
        <div className="w-full max-w-5xl" style={{ height: '100%' }}>
          <AnimatePresence mode="wait" custom={animationDirection}>
            <motion.div
              key={currentStep}
              custom={animationDirection}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full h-full flex items-center justify-center"
              style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
            >
              <div className="w-full max-h-full" style={{ overflowY: 'auto', padding: '20px 0' }}>
                {renderStep()}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Progress Bar - Compact Footer */}
      <motion.div
        className="w-full px-6 pb-4 pt-2"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.95)', 
          backdropFilter: 'blur(10px)',
          flexShrink: 0, // Prevent footer from shrinking
          zIndex: 10 // Ensure footer stays on top
        }}
      >
        <div className="max-w-5xl mx-auto">
          <ShopWizardProgressBar className="w-full" />
        </div>
      </motion.div>
    </motion.div>
  );
};
