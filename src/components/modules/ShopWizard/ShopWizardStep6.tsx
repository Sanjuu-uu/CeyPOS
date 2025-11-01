import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useShopWizard } from '../../../context/ShopWizardContext';
import { useNavigate } from 'react-router-dom';
import './styles/ShopWizard.css';

const cardVariants = {
  initial: { y: 20, opacity: 0, scale: 0.95 },
  animate: {
    y: 0,
    opacity: 1,
    scale: 1,
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
  },
};

const pulseVariants = {
  animate: {
    scale: [1, 1.05, 1],
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
  const {
    completeWizard,
    isSaving,
    completionError,
    clearCompletionError,
  } = useShopWizard();
  const [showConfetti] = useState(true);
  const [hasTriggeredCompletion, setHasTriggeredCompletion] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (hasTriggeredCompletion) {
      return;
    }

    setHasTriggeredCompletion(true);
    let cancelled = false;

    (async () => {
      try {
        await completeWizard();
      } catch (error) {
        if (!cancelled) {
          console.error('Shop completion failed', error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [completeWizard, hasTriggeredCompletion]);

  const handleGoToDashboard = () => {
    // Navigate to dashboard immediately
    navigate('/dashboard');
  };

  const handleRetry = () => {
    clearCompletionError();
    setHasTriggeredCompletion(false);
  };

  if (completionError) {
    return (
      <div className="h-full flex items-center justify-center relative overflow-hidden">
        <motion.div
          variants={cardVariants}
          initial="initial"
          animate="animate"
          className="relative z-20 w-full max-w-3xl"
          style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(12px)',
              borderRadius: '24px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
              border: '1px solid var(--red--200, #fecaca)',
              padding: '40px 36px',
            }}
          >
            <div className="flex flex-col items-center text-center space-y-6">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444',
                }}
              >
                <svg
                  style={{ width: '32px', height: '32px' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v4m0 4h.01M4.93 4.93l14.14 14.14M9.17 9.17l5.66 5.66M4.93 19.07l14.14-14.14"
                  />
                </svg>
              </motion.div>

              <div>
                <h2
                  style={{
                    color: 'var(--gray--900)',
                    fontSize: '28px',
                    fontWeight: 600,
                    marginBottom: '12px',
                  }}
                >
                  We couldn’t finish setting up your shop
                </h2>
                <p
                  style={{
                    color: 'var(--gray--600)',
                    fontSize: '15px',
                    lineHeight: 1.6,
                    maxWidth: '520px',
                    margin: '0 auto',
                  }}
                >
                  {completionError}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={isSaving}
                  className="button-primary"
                  style={{
                    padding: '12px 22px',
                    borderRadius: 'var(--radius--12px)',
                    backgroundColor: 'var(--gray--900)',
                    color: 'white',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: isSaving ? 0.7 : 1,
                  }}
                >
                  {isSaving ? 'Retrying...' : 'Try again'}
                </button>
                <button
                  type="button"
                  onClick={() => window.open('mailto:support@ceypossolutions.com')}
                  className="button-outline"
                  style={{
                    padding: '12px 22px',
                    borderRadius: 'var(--radius--12px)',
                    border: '1px solid var(--gray--200)',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--gray--800)',
                    background: 'white',
                  }}
                >
                  Contact support
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center relative overflow-hidden">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {Array.from({ length: 30 }).map((_, index) => (
            <Confetti key={index} index={index} />
          ))}
        </div>
      )}
      <motion.div
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
                  color: 'var(--gray--900)',
                  opacity: isSaving ? 0.8 : 1,
                }}
                disabled={isSaving}
              >
                {isSaving ? 'Finalizing...' : 'Go to Dashboard'}
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
