import { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useSignUp } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

const Register = () => {
  const { isLoaded, signUp, setActive } = useSignUp();
  const navigate = useNavigate();
  
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptPolicy, setAcceptPolicy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('register'); // 'register' | 'verify'
  const [verificationCode, setVerificationCode] = useState('');

  // Clear error when user starts typing
  const clearError = () => {
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLoaded || !signUp) {
      console.log('Clerk not loaded yet');
      return;
    }
    
    if (!acceptPolicy) {
      setError('Please accept the Privacy Policy to continue');
      return;
    }

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('Starting registration...');
      
      // Simple registration with just email and password
      const result = await signUp.create({
        emailAddress: email.trim(),
        password: password,
      });
      
      console.log('Registration result:', result);

      if (result.status === 'complete') {
        // Registration complete - sign in and redirect
        await setActive({ session: result.createdSessionId });
        navigate('/shop-wizard');
      } else if (result.status === 'missing_requirements') {
        // Email verification required
        console.log('Email verification required');
        
        // Prepare email verification with code strategy
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        
        setStep('verify');
        setError('');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      
      let errorMessage = 'Registration failed. Please try again.';
      
      if (err.errors && err.errors.length > 0) {
        const firstError = err.errors[0];
        const message = firstError.message || firstError.longMessage || '';
        
        if (message.includes('email address is taken') || message.includes('email_address_taken')) {
          errorMessage = 'This email address is already registered. Please try logging in instead.';
        } else if (message.includes('password')) {
          errorMessage = 'Password must be at least 8 characters with letters and numbers.';
        } else if (message.includes('email_address_invalid')) {
          errorMessage = 'Please enter a valid email address.';
        } else if (message.includes('captcha') || message.includes('CAPTCHA') || message.includes('bot protection')) {
          errorMessage = 'Please complete the security verification and try again.';
        } else if (message.length > 0) {
          errorMessage = message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLoaded || !signUp) return;
    
    if (!verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('Attempting to verify email with code:', verificationCode);
      
      // Attempt email verification
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      console.log('Verification result:', result);
      console.log('Status:', result.status);

      if (result.status === 'complete') {
        // Verification successful - sign in and redirect
        await setActive({ session: result.createdSessionId });
        navigate('/shop-wizard');
      } else if (result.status === 'missing_requirements') {
        // Check what fields are missing and try to complete them
        console.log('Missing requirements after verification:', result.missingFields);
        
        // Try to update with the full name if we have it
        if (fullName.trim()) {
          try {
            const nameParts = fullName.trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            
            const updateResult = await signUp.update({
              firstName: firstName,
              lastName: lastName,
            });
            
            console.log('Update result:', updateResult);
            
            if (updateResult.status === 'complete') {
              await setActive({ session: updateResult.createdSessionId });
              navigate('/shop-wizard');
              return;
            }
          } catch (updateError) {
            console.log('Update error:', updateError);
          }
        }
        
        // If we can't complete the signup, redirect to login
        setError('Email verified successfully! Your account has been created. Please sign in with your credentials.');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        // Handle other statuses
        console.log('Unexpected verification status:', result.status);
        setError('Email verification completed. Please sign in with your email and password.');
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      
      let errorMessage = 'Invalid verification code. Please try again.';
      
      if (err.errors && err.errors.length > 0) {
        const firstError = err.errors[0];
        const message = firstError.message || firstError.longMessage || '';
        
        if (message.includes('invalid') || message.includes('incorrect')) {
          errorMessage = 'Invalid verification code. Please check your email and try again.';
        } else if (message.includes('expired')) {
          errorMessage = 'Verification code has expired. Please request a new code.';
        } else if (message.includes('already verified') || message.includes('already exists')) {
          errorMessage = 'Account already exists. Please sign in with your credentials.';
          setTimeout(() => navigate('/login'), 2000);
        } else if (message.length > 0) {
          errorMessage = message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!isLoaded || !signUp) return;
    
    setIsLoading(true);
    setError('');

    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setError('');
      // Show success message temporarily
      setError('New verification code sent to your email!');
      setTimeout(() => setError(''), 3000);
    } catch (err: any) {
      console.error('Resend error:', err);
      setError('Failed to resend verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!isLoaded || !signUp) return;
    
    try {
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/shop-wizard',
        redirectUrlComplete: '/shop-wizard',
      });
    } catch (err: any) {
      console.error('Google signup error:', err);
      setError('Failed to sign up with Google. Please try again.');
    }
  };

  const handleAppleSignUp = async () => {
    if (!isLoaded || !signUp) return;
    
    try {
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_apple',
        redirectUrl: '/shop-wizard',
        redirectUrlComplete: '/shop-wizard',
      });
    } catch (err: any) {
      console.error('Apple signup error:', err);
      setError('Failed to sign up with Apple. Please try again.');
    }
  };

  // Email verification step
  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navigation />
        
        <div className="relative overflow-hidden flex-1">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 opacity-80"></div>
            <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full opacity-10 -translate-x-48 -translate-y-48"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full opacity-10 translate-x-48 translate-y-48"></div>
          </div>

          <div className="relative z-10 min-h-full flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-md">
              <div className="p-8">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-4 py-2 rounded-full text-xs font-medium mb-4">
                    Email Verification
                  </div>
                  <h1 className="text-2xl font-black text-gray-900 mb-4">Enter Verification Code</h1>
                  <p className="text-gray-600 text-sm mb-6">
                    We've sent a 6-digit verification code to <strong>{email}</strong>. 
                    Please enter the code below to complete your registration.
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className={`mb-6 p-3 border rounded-lg text-sm ${
                    error.includes('sent') 
                      ? 'bg-green-50 border-green-200 text-green-600' 
                      : 'bg-red-50 border-red-200 text-red-600'
                  }`}>
                    {error}
                  </div>
                )}

                {/* Verification Form */}
                <form onSubmit={handleVerifyCode} className="space-y-5">
                  <div>
                    <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-2">
                      Verification Code
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        id="verificationCode"
                        type="text"
                        value={verificationCode}
                        onChange={(e) => { setVerificationCode(e.target.value); clearError(); }}
                        className="block w-full px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-xl text-center tracking-[0.75em] font-mono bg-gray-50"
                        placeholder=""
                        maxLength={6}
                        autoComplete="one-time-code"
                        style={{ 
                          textAlign: 'center',
                          letterSpacing: '0.75em',
                          paddingLeft: '0.375em'
                        }}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !isLoaded}
                    className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white py-3 px-4 rounded-full font-medium transition-all duration-300 flex items-center justify-center text-sm"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify & Complete Registration
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
                
                <div className="mt-6 text-center space-y-4">
                  <p className="text-xs text-gray-500">
                    Didn't receive the code? Check your spam folder.
                  </p>
                  
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isLoading}
                    className="text-gray-900 hover:text-gray-700 font-medium text-sm disabled:text-gray-400"
                  >
                    Resend verification code
                  </button>
                  
                  <div className="pt-2 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => { setStep('register'); setVerificationCode(''); setError(''); }}
                      className="text-gray-600 hover:text-gray-800 text-sm"
                    >
                      ← Back to registration
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />

      <div className="relative overflow-hidden flex-1">
        {/* Background Pattern */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 opacity-80"></div>
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full opacity-10 -translate-x-48 -translate-y-48"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full opacity-10 translate-x-48 translate-y-48"></div>
        </div>

        <div className="relative z-10 min-h-full flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-4 py-2 rounded-full text-xs font-medium mb-4">
                  CeyPOS Register
                </div>
                <h1 className="text-2xl font-black text-gray-900 mb-2">Get Started CeyPOS!</h1>
                <p className="text-gray-600 text-sm">Create your account to get started</p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Register Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Full Name Field */}
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => { setFullName(e.target.value); clearError(); }}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm"
                      placeholder="John Smith"
                      autoComplete="name"
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); clearError(); }}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm"
                      placeholder="example@gmail.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); clearError(); }}
                      className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm"
                      placeholder="min 8 character"
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Privacy Policy Checkbox */}
                <div className="flex items-center">
                  <input
                    id="privacy-policy"
                    type="checkbox"
                    checked={acceptPolicy}
                    onChange={(e) => setAcceptPolicy(e.target.checked)}
                    className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
                  />
                  <label htmlFor="privacy-policy" className="ml-2 block text-sm text-gray-700">
                    I accept the{' '}
                    <a href="#" className="text-gray-900 hover:text-gray-700 font-medium">
                      Privacy Policy
                    </a>
                  </label>
                </div>

                {/* Create Account Button */}
                <button
                  type="submit"
                  disabled={isLoading || !isLoaded}
                  className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white py-3 px-4 rounded-full font-medium transition-all duration-300 flex items-center justify-center text-sm"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Account...
                    </>
                  ) : (
                    'Create an Account'
                  )}
                </button>
              </form>

              {/* CAPTCHA Widget - Required for custom flows */}
              <div className="my-4 flex justify-center">
                <div id="clerk-captcha"></div>
              </div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-gray-50 text-gray-500">or</span>
                </div>
              </div>

              {/* Social Register Buttons */}
              <div className="mb-6 space-y-3">
                <button 
                  type="button"
                  onClick={handleGoogleSignUp}
                  disabled={!isLoaded || isLoading}
                  className="w-full flex items-center justify-center px-4 py-3 bg-white border border-gray-300 rounded-full hover:bg-gray-50 disabled:bg-gray-100 transition-colors text-sm"
                >
                  <svg className="w-4 h-4 mr-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>

                <button 
                  type="button"
                  onClick={handleAppleSignUp}
                  disabled={!isLoaded || isLoading}
                  className="w-full flex items-center justify-center px-4 py-3 bg-black border border-black rounded-full hover:bg-gray-800 disabled:bg-gray-400 transition-colors text-sm text-white"
                >
                  <svg className="w-4 h-4 mr-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  Continue with Apple
                </button>
              </div>

              {/* Sign In Link */}
              <p className="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <a href="/login" className="text-gray-900 hover:text-gray-700 font-medium">
                  Sign In
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Register;