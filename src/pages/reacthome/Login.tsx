import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import Navigation from './components/Navigation';
import Footer from './components/Footer'; // Import the global footer

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = () => {
    // Handle login logic here
    console.log('Login attempt:', { email, password, rememberMe });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <div className="relative overflow-hidden flex-1">
        {/* Background Pattern - Black shade */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 opacity-80"></div>
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full opacity-10 -translate-x-48 -translate-y-48"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full opacity-10 translate-x-48 translate-y-48"></div>
        </div>

        <div className="relative z-10 min-h-full flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Login Form - Remove background box */}
            <div className="w-full max-w-md mx-auto lg:mx-0">
              <div className="p-8">
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-4 py-2 rounded-full text-xs font-medium mb-4">
                    CeyPOS Login
                  </div>
                  <h1 className="text-2xl font-black text-gray-900 mb-2">Welcome to CeyPOS!</h1>
                  <p className="text-gray-600 text-sm">Sign in to access your dashboard</p>
                </div>

                {/* Social Login Buttons - Make oval shaped with white background */}
                <div className="space-y-3 mb-6">
                  <button className="w-full flex items-center justify-center px-4 py-3 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors text-sm">
                    <svg className="w-4 h-4 mr-3" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </button>
                  
                  <button className="w-full flex items-center justify-center px-4 py-3 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors text-sm">
                    <svg className="w-4 h-4 mr-3" fill="#1877F2" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Continue with Facebook
                  </button>
                </div>

                {/* Divider - Fix the "or" positioning */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-gray-50 text-gray-500">or</span>
                  </div>
                </div>

                {/* Login Form */}
                <div className="space-y-5">
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
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm"
                        placeholder="example@gmail.com"
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
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm"
                        placeholder="min 8 character"
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

                  {/* Remember Me and Forgot Password */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        id="remember-me"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
                      />
                      <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                        Remember me
                      </label>
                    </div>
                    <a href="#" className="text-sm text-gray-900 hover:text-gray-700 font-medium">
                      Forgot password?
                    </a>
                  </div>

                  {/* Submit Button - Black oval shape */}
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="w-full bg-black hover:bg-gray-800 text-white py-3 px-4 rounded-full font-medium transition-all duration-300 flex items-center justify-center text-sm"
                  >
                    Submit
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </button>
                </div>

                {/* Sign Up Link */}
                <p className="mt-6 text-center text-sm text-gray-600">
                  Don't have an account?{' '}
                  <a href="/register" className="text-gray-900 hover:text-gray-700 font-medium">
                    Register
                  </a>
                </p>
              </div>
            </div>

            {/* Dashboard Preview */}
            <div className="hidden lg:block">
              {/* 
                TODO: Replace with actual dashboard image
                Image Requirements:
                - Size: 600x400px (3:2 aspect ratio)
                - Format: PNG or JPG
                - Location: src/pages/reacthome/images/dashboard-preview.png
                - Alt text: "CeyPOS Dashboard Preview"
                
                To add the image, uncomment and use this code:
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
                  <img 
                    src="/src/pages/reacthome/images/dashboard-preview.png"
                    alt="CeyPOS Dashboard Preview"
                    width="600"
                    height="400"
                    className="w-full h-auto object-cover"
                  />
                </div>
              */}
              
              {/* Temporary Stock Photo - Replace with actual dashboard */}
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
                <img 
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop&crop=center"
                  alt="Dashboard Preview - Temporary Stock Photo"
                  width="600"
                  height="400"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Global Footer */}
      <Footer />
    </div>
  );
};

export default Login;