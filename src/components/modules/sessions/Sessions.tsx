import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import QRCode from 'qrcode';
import { useUser } from '@clerk/clerk-react';
import { postJSON } from '../../../lib/api';
import { db } from '../../../lib/db';
import { useApp } from '../../../context/AppContext';
import { 
  Smartphone, 
  MonitorSpeaker, 
  QrCode, 
  Wifi, 
  X,
  CheckCircle,
  Copy,
  RefreshCw,
  Shield,
  Loader2
} from 'lucide-react';

interface SessionWizardProps {
  sessionType: 'cashier' | 'barcode' | 'checkout' | null;
  onClose: () => void;
  onSessionLinked: (sessionType: 'barcode' | 'checkout') => void;
  shopId: string;
  userEmail: string;
  userId: string | null;
}

const SessionWizard: React.FC<SessionWizardProps> = ({ sessionType, onClose, onSessionLinked, shopId, userEmail, userId }) => {
  const [step, setStep] = useState(1);
  const [twoFACode, setTwoFACode] = useState('CY-4829-3761');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [sessionLink, setSessionLink] = useState<string | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [connectionState, setConnectionState] = useState<'pending' | 'connected'>('pending');

  const isMobileSession = sessionType === 'barcode' || sessionType === 'checkout';
  const canCreateSession = Boolean(shopId && userEmail && isMobileSession);
  const flowLabel = sessionType === 'checkout' ? 'mobile checkout' : 'product import';

  const generateNewCode = () => {
    const newCode = `CY-${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`;
    setTwoFACode(newCode);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(twoFACode);
  };

  const copySessionLink = () => {
    if (sessionLink) {
      navigator.clipboard.writeText(sessionLink);
    }
  };

  useEffect(() => {
    if (!canCreateSession || step !== 2) return;
    if (sessionLink || isGenerating) return;

    const createSession = async () => {
      setIsGenerating(true);
      setSessionError(null);
      try {
        const result = await postJSON<{
          sessionId: string;
          scanUrl: string | null;
          expiresAt: string;
        }>("/api/mobile/sessions/create", {
          shopId,
          sessionType,
          userEmail,
          userId,
          deviceMeta: {
            userAgent: navigator.userAgent,
          },
        });

        if (!result?.scanUrl) {
          throw new Error("Failed to generate QR link");
        }

        const qrUrl = await QRCode.toDataURL(result.scanUrl, {
          width: 240,
          margin: 2,
          color: {
            dark: "#0f172a",
            light: "#ffffff",
          },
        });

        setSessionLink(result.scanUrl);
        setSessionExpiresAt(result.expiresAt);
        setQrDataUrl(qrUrl);
        setConnectionState('pending');
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create session";
        setSessionError(message);
      } finally {
        setIsGenerating(false);
      }
    };

    createSession();
  }, [canCreateSession, isGenerating, sessionLink, sessionType, shopId, step, userEmail, userId]);

  useEffect(() => {
    if (!sessionLink || !shopId) return;
    const createdSessionId = new URL(sessionLink).searchParams.get('session');
    if (!createdSessionId) return;

    const unsubscribe = db.on('sessionUpdated', (event: unknown) => {
      if (!event || typeof event !== 'object') return;
      const candidate = event as Record<string, unknown>;
      const payload =
        candidate.payload && typeof candidate.payload === 'object'
          ? (candidate.payload as Record<string, unknown>)
          : {};
      const action = typeof candidate.action === 'string' ? candidate.action : '';
      if (payload.sessionId !== createdSessionId) return;
      if (action === 'linked' || action === 'mobile_connected') {
        setConnectionState('connected');
        setStep(3);
        if (sessionType === 'barcode' || sessionType === 'checkout') {
          onSessionLinked(sessionType);
        }
      }
    });

    return () => unsubscribe();
  }, [onSessionLinked, sessionLink, sessionType, shopId]);

  if (!sessionType) return null;

  const sessionConfig = {
    cashier: {
      title: 'Connect Cashier Device',
      description: 'Connect another cashier terminal to your shop',
      icon: <MonitorSpeaker size={24} />,
      authMethod: '2FA Code'
    },
    barcode: {
      title: 'CeyPoS Mobile - Barcode Sync',
      description: 'Sync barcode scanning with your mobile device',
      icon: <QrCode size={24} />,
      authMethod: 'QR Code'
    },
    checkout: {
      title: 'CeyPoS Mobile - Checkout Session',
      description: 'Enable mobile checkout capabilities',
      icon: <Smartphone size={24} />,
      authMethod: 'QR Code'
    }
  };

  const config = sessionConfig[sessionType];

  return (
    <div className="fixed inset-0 flex items-center justify-center z-40">
      <div className="absolute inset-0 top-[40px] bg-black/5 backdrop-blur-sm"></div>
      
      <div 
        className="bg-white shadow-2xl w-full max-w-2xl h-[70vh] flex flex-col relative z-10 mt-[40px]"
        style={{ 
          borderRadius: 'var(--radius--16px)',
          border: '1px solid var(--gray--200)',
        }}
      >
        {/* Header */}
        <div className="p-6 border-b flex-shrink-0" style={{ borderColor: 'var(--gray--200)' }}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: 'var(--gray--100)' }}
              >
                {config.icon}
              </div>
              <div>
                <h2 
                  className="text-xl font-bold"
                  style={{ color: 'var(--gray--900)' }}
                >
                  {config.title}
                </h2>
                <p 
                  className="text-sm"
                  style={{ color: 'var(--gray--600)' }}
                >
                  {config.description}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                    stepNum <= step 
                      ? 'text-black' 
                      : 'text-gray-400'
                  }`}
                  style={{
                    backgroundColor: stepNum <= step 
                      ? '#c5f542' 
                      : 'var(--gray--200)',
                  }}
                >
                  {stepNum < step ? <CheckCircle size={16} /> : stepNum}
                </div>
                {stepNum < 3 && (
                  <div 
                    className="w-8 h-0.5 mx-2 transition-all duration-200"
                    style={{
                      backgroundColor: stepNum < step 
                        ? '#c5f542' 
                        : 'var(--gray--200)',
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center space-y-6"
              >
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Initialize Connection</h3>
                  <p className="text-gray-600">
                    Preparing to connect your {sessionType === 'cashier' ? 'cashier device' : flowLabel} device
                  </p>
                </div>
                
                <div 
                  className="p-6 rounded-lg border"
                  style={{ borderColor: 'var(--gray--200)', backgroundColor: 'var(--gray--50)' }}
                >
                  <Wifi size={48} className="mx-auto mb-4 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    The QR link is tied to this shop and expires quickly for safety.
                  </p>
                </div>

                <Button
                  variant="primary"
                  onClick={() => setStep(2)}
                  className="w-full"
                  disabled={isMobileSession && !canCreateSession}
                >
                  {isMobileSession && !canCreateSession ? 'Shop account required' : 'Start Connection'}
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center space-y-6"
              >
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">
                    {sessionType === 'cashier' ? 'Enter 2FA Code' : 'Scan QR Code'}
                  </h3>
                  <p className="text-gray-600">
                    {sessionType === 'cashier' 
                      ? 'Enter this code on your cashier device' 
                      : `Scan this QR code with your phone to start ${flowLabel}`
                    }
                  </p>
                </div>

                {sessionType === 'cashier' ? (
                  <div className="space-y-4">
                    <div 
                      className="p-6 rounded-lg border text-center"
                      style={{ borderColor: 'var(--gray--200)', backgroundColor: 'var(--gray--50)' }}
                    >
                      <Shield size={32} className="mx-auto mb-4 text-gray-600" />
                      <div 
                        className="text-3xl font-mono font-bold mb-4"
                        style={{ color: 'var(--gray--900)' }}
                      >
                        {twoFACode}
                      </div>
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={copyToClipboard}
                          className="flex items-center gap-2 px-3 py-1 rounded text-sm hover:bg-gray-200 transition-colors"
                        >
                          <Copy size={14} />
                          Copy
                        </button>
                        <button
                          onClick={generateNewCode}
                          className="flex items-center gap-2 px-3 py-1 rounded text-sm hover:bg-gray-200 transition-colors"
                        >
                          <RefreshCw size={14} />
                          New Code
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Code expires in 5 minutes
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div 
                      className="p-8 rounded-lg border flex items-center justify-center"
                      style={{ borderColor: 'var(--gray--200)', backgroundColor: 'var(--gray--50)' }}
                    >
                      <div className="w-48 h-48 bg-white border-2 border-gray-300 flex items-center justify-center">
                        {qrDataUrl ? (
                          <img src={qrDataUrl} alt="Mobile session QR code" className="w-40 h-40" />
                        ) : (
                          <div className="text-center">
                            <QrCode size={64} className="mx-auto mb-2 text-gray-400" />
                            <p className="text-xs text-gray-500">
                              {isGenerating ? "Generating..." : "QR Code"}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {sessionError && (
                      <p className="text-xs text-red-500">{sessionError}</p>
                    )}

                    {sessionLink && (
                      <div className="space-y-2 text-xs text-gray-500">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={copySessionLink}
                            className="flex items-center gap-2 px-3 py-1 rounded text-xs hover:bg-gray-200 transition-colors"
                          >
                            <Copy size={14} />
                            Copy Link
                          </button>
                          <button
                            onClick={() => {
                              setSessionLink(null);
                              setQrDataUrl(null);
                              setConnectionState('pending');
                            }}
                            className="flex items-center gap-2 px-3 py-1 rounded text-xs hover:bg-gray-200 transition-colors"
                          >
                            <RefreshCw size={14} />
                            New QR
                          </button>
                        </div>
                        <p>Open CeyPoS Mobile and scan this QR code.</p>
                        {sessionExpiresAt && (
                          <p>Expires: {new Date(sessionExpiresAt).toLocaleTimeString()}</p>
                        )}
                        <p className="flex items-center justify-center gap-1 text-gray-600">
                          {connectionState === 'connected' ? (
                            <>
                              <CheckCircle size={14} />
                              Mobile connected
                            </>
                          ) : (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              Waiting for mobile sign in and camera permission
                            </>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  variant="primary"
                  onClick={() => setStep(3)}
                  className="w-full"
                >
                  I scanned the QR
                </Button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center space-y-6"
              >
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Session Ready</h3>
                  <p className="text-gray-600">
                    {connectionState === 'connected'
                      ? 'Mobile is connected and scanning into this shop.'
                      : 'Keep this window open while the device connects.'}
                  </p>
                </div>

                <div 
                  className="p-6 rounded-lg border"
                  style={{ borderColor: 'var(--gray--200)', backgroundColor: 'var(--gray--50)' }}
                >
                  <div className="flex items-center gap-3 justify-center mb-4">
                    {config.icon}
                    <span className="text-lg font-medium">{config.title}</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Session will be active for this shop
                  </p>
                </div>

                <Button
                  variant="primary"
                  onClick={onClose}
                  className="w-full"
                >
                  Close
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export const Sessions: React.FC = () => {
  const { activeShopId, setCurrentModule } = useApp();
  const { user } = useUser();
  const userEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    "";
  const userId = user?.id ?? null;
  const shopId = activeShopId ?? "";

  const [showWizard, setShowWizard] = useState(false);
  const [activeSession, setActiveSession] = useState<'cashier' | 'barcode' | 'checkout' | null>(null);

  const startSession = (sessionType: 'cashier' | 'barcode' | 'checkout') => {
    setActiveSession(sessionType);
    setShowWizard(true);
  };

  const closeWizard = () => {
    setShowWizard(false);
    setActiveSession(null);
  };

  const handleSessionLinked = useCallback((sessionType: 'barcode' | 'checkout') => {
    setShowWizard(false);
    setActiveSession(null);
    setCurrentModule(sessionType === 'checkout' ? 'pos' : 'inventory');
  }, [setCurrentModule]);

  const sessions = [
    {
      id: 'cashier',
      title: 'Connect Cashier Device',
      description: 'Connect another cashier terminal to your shop for multiple point-of-sale operations',
      icon: <MonitorSpeaker size={32} />,
      color: '#c5f542',
      features: ['Multi-terminal support', '2FA authentication', 'Real-time sync']
    },
    {
      id: 'barcode',
      title: 'CeyPoS Mobile - Barcode Sync',
      description: 'Sync barcode scanning capabilities with your mobile device for inventory management',
      icon: <QrCode size={32} />,
      color: '#b39efc',
      features: ['Mobile barcode scanning', 'Inventory sync', 'Offline capability']
    },
    {
      id: 'checkout',
      title: 'CeyPoS Mobile - Checkout Session',
      description: 'Enable mobile checkout capabilities for on-the-go sales and customer service',
      icon: <Smartphone size={32} />,
      color: '#ef94b5',
      features: ['Mobile checkout', 'Customer management', 'Receipt generation']
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-h2">Device Sessions</h1>
          <p className="text-gray-600 mt-2">
            Connect and manage different devices with your CeyPoS shop
          </p>
        </div>
      </div>

      {/* Session Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.map((session) => (
          <motion.div
            key={session.id}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="h-full border border-gray-100 hover:shadow-lg transition-all duration-200">
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div 
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: `${session.color}20` }}
                  >
                    <div style={{ color: session.color }}>
                      {session.icon}
                    </div>
                  </div>
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: '#e5e7eb' }}
                  ></div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-lg text-gray-900">
                    {session.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {session.description}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-900">Features:</h4>
                  <ul className="space-y-1">
                    {session.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-xs text-gray-600">
                        <div 
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: session.color }}
                        ></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  variant="primary"
                  onClick={() => startSession(session.id as 'cashier' | 'barcode' | 'checkout')}
                  className="w-full mt-4"
                  style={{ 
                    backgroundColor: session.color,
                    color: 'black',
                    border: 'none'
                  }}
                >
                  Start Session
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Active Sessions */}
      <Card className="border border-gray-100">
        <div className="p-6">
          <h2 className="font-semibold text-lg mb-4">Active Sessions</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="font-medium text-green-900">Main Terminal</p>
                  <p className="text-sm text-green-700">Current device - Always active</p>
                </div>
              </div>
              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                ACTIVE
              </span>
            </div>
            
            <div className="text-center py-8 text-gray-500">
              <Wifi size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No additional sessions active</p>
              <p className="text-xs mt-1">Start a session above to connect more devices</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Session Wizard */}
      <AnimatePresence>
        {showWizard && (
          <SessionWizard
            sessionType={activeSession}
            onClose={closeWizard}
            onSessionLinked={handleSessionLinked}
            shopId={shopId}
            userEmail={userEmail}
            userId={userId}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
