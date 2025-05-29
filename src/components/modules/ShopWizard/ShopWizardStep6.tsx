import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useShopWizard } from '../../../context/ShopWizardContext';
import './styles/ShopWizard.css';

const cardVariants = {
  initial: { y: 20, opacity: 0, scale: 0.95 },
  animate: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

const confettiVariants = {
  initial: { y: -100, opacity: 0, rotate: 0, x: 0 },
  animate: (index: number) => ({
    y: [0, 200, 600],
    opacity: [0, 1, 0],
    rotate: [0, 180, 360],
    x: [0, Math.random() * 400 - 200, Math.random() * 400 - 200],
    transition: {
      duration: 2 + Math.random() * 2,
      delay: index * 0.1,
      repeat: Infinity,
      repeatDelay: 3,
    },
  }),
};

const checkmarkVariants = {
  initial: { scale: 0, rotate: -180 },
  animate: {
    scale: 1,
    rotate: 0,
    transition: {
      duration: 0.6,
      delay: 0.3,
      type: 'spring',
      stiffness: 200,
      damping: 10,
    },
  },
};

const pulseVariants = {
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

const Confetti: React.FC<{ index: number }> = ({ index }) => {
  const colors = ['#ECFF76', '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFDAB9'];
  const shapes = ['🎉', '🎊', '✨', '🌟', '💫', '🎈'];
  
  return (
    <motion.div
      className="absolute text-2xl pointer-events-none"
      style={{
        left: `${Math.random() * 100}%`,
        color: colors[index % colors.length],
      }}
      custom={index}
      variants={confettiVariants}
      initial="initial"
      animate="animate"
    >
      {shapes[index % shapes.length]}
    </motion.div>
  );
};

export const ShopWizardStep6: React.FC = () => {
  const { formData, completeWizard } = useShopWizard();
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    // Auto complete wizard when this step loads
    completeWizard();
  }, [completeWizard]);

  const handleGoToDashboard = () => {
    // Navigate to dashboard immediately
    window.history.pushState(null, '', '/dashboard');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="h-full flex items-center justify-center relative overflow-hidden">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {Array.from({ length: 30 }).map((_, index) => (
            <Confetti key={index} index={index} />
          ))}
        </div>
      )}      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        className="relative z-20 w-full max-w-4xl"
        style={{
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Main Success Card */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '24px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08), 0 8px 16px rgba(0, 0, 0, 0.04)',
            border: '1px solid var(--gray--200)',
            padding: '48px 40px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative Background Elements */}
          <div
            style={{
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              width: '200%',
              height: '200%',
              background: `radial-gradient(circle at 50% 50%, var(--verde-naturale--primary)08 0%, transparent 50%)`,
              pointerEvents: 'none',
            }}
          />
          
          {/* Success Icon */}
          <motion.div
            className="flex items-center justify-center mb-8"
            variants={pulseVariants}
            animate="animate"
          >
            <motion.div
              style={{
                width: '80px',
                height: '80px',
                background: `linear-gradient(135deg, var(--verde-naturale--primary), var(--verde-naturale--primary)CC)`,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 8px 24px var(--verde-naturale--primary)40`,
              }}
              variants={checkmarkVariants}
              initial="initial"
              animate="animate"
            >
              <svg
                style={{ width: '40px', height: '40px', color: 'var(--white)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </motion.div>
          </motion.div>

          {/* Success Content */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <h2 style={{
              color: 'var(--gray--900)',
              letterSpacing: '-.01em',
              marginTop: 0,
              marginBottom: '12px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '32px',
              fontWeight: 600,
              lineHeight: 1.2
            }}>
              🎉 Shop Created Successfully!
            </h2>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '16px',
              fontWeight: 400,
              color: 'var(--gray--600)',
              margin: '0 0 32px 0',
              maxWidth: '480px',
              marginLeft: 'auto',
              marginRight: 'auto',
              lineHeight: 1.5
            }}>
              Your shop has been successfully created and is ready to use. You can now start managing your inventory, processing sales, and growing your business with CeyPOS.
            </p>
            
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={handleGoToDashboard}
                className="button-primary"
                style={{
                  padding: '12px 24px',
                  borderRadius: 'var(--radius--12px)',
                  backgroundColor: 'var(--verde-naturale--primary)',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--gray--900)'
                }}
              >
                Go to Dashboard
              </button>
              <button 
                onClick={() => window.open('/help', '_blank')}
                className="button-outline"
                style={{
                  padding: '12px 24px',
                  borderRadius: 'var(--radius--12px)',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--gray--200)',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--gray--900)'
                }}
              >
                View Help Center
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
