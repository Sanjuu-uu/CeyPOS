import React from 'react';
import { Instagram, Twitter, Linkedin, Facebook } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="relative bg-gray-900 text-white mt-auto overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 pointer-events-none">
        {/* 
          TODO: Replace with actual footer background image
          Image Requirements:
          - Size: 1474x600px or similar wide format
          - Format: PNG or JPG
          - Location: src/pages/reacthome/images/footer-background.png
          - Style: Subtle pattern or gradient that doesn't interfere with text
          
          To add the image, uncomment and use this code:
          <img 
            src="/src/pages/reacthome/images/footer-background.png"
            alt="Footer Background"
            className="w-full h-full object-cover opacity-10"
          />
        */}
        
        {/* Temporary Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-black opacity-90"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-full -translate-x-48 -translate-y-48"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full translate-x-48 translate-y-48"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <span className="text-2xl font-bold text-white">CeyPOS</span>
            </div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Start your 7-day free trial</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Experience the power of modern point of sale technology. Streamline your business operations with CeyPOS.
              </p>
            </div>
            
            {/* Social Media Links */}
            <div className="flex space-x-4">
              <a 
                href="https://www.instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors duration-200"
              >
                <Instagram size={20} className="text-gray-300 hover:text-white" />
              </a>
              <a 
                href="https://www.twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors duration-200"
              >
                <Twitter size={20} className="text-gray-300 hover:text-white" />
              </a>
              <a 
                href="https://www.linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors duration-200"
              >
                <Linkedin size={20} className="text-gray-300 hover:text-white" />
              </a>
              <a 
                href="https://www.facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors duration-200"
              >
                <Facebook size={20} className="text-gray-300 hover:text-white" />
              </a>
            </div>
          </div>

          {/* Pages Column 1 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Pages</h4>
            <ul className="space-y-3">
              <li className="flex items-center">
                <a href="/product" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">
                  Product
                </a>
                <span className="ml-2 bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full flex items-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-1"></div>
                  New
                </span>
              </li>
              <li>
                <a href="/about" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">
                  About
                </a>
              </li>
              <li>
                <a href="/blog" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">
                  Blog
                </a>
              </li>
              <li>
                <a href="/pricing" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">
                  Pricing
                </a>
              </li>
              <li>
                <a href="/contact" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Pages Column 2 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Pages</h4>
            <ul className="space-y-3">
              <li>
                <a href="/login" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">
                  Login
                </a>
              </li>
              <li>
                <a href="/register" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">
                  Register
                </a>
              </li>
              <li>
                <a href="/getting-started" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">
                  Get Started
                </a>
              </li>
              <li className="flex items-center">
                <a href="/changelog" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">
                  Changelog
                </a>
                <span className="ml-2 bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full flex items-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-1"></div>
                  New
                </span>
              </li>
              <li>
                <a href="/license" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">
                  License
                </a>
              </li>
              <li>
                <a href="/style-guide" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">
                  Style Guide
                </a>
              </li>
            </ul>
          </div>

          {/* Company/Support Column */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Company</h4>
            <ul className="space-y-3">
              <li>
                <a href="/features" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">
                  Features
                </a>
              </li>
              <li>
                <a href="/support" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">
                  Support
                </a>
              </li>
              <li>
                <a href="/documentation" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">
                  Documentation
                </a>
              </li>
              <li>
                <a href="/api" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">
                  API
                </a>
              </li>
              <li>
                <a href="/careers" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">
                  Careers
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">
              ©2025 CeyPOS by{' '}
              <a 
                href="https://www.ceynode.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-green-400 hover:text-green-300 font-medium transition-colors duration-200"
              >
                Ceynode
              </a>
              {' '}- Powered by{' '}
              <a 
                href="https://webflow.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors duration-200"
              >
                Webflow
              </a>
            </p>
            <div className="flex space-x-6">
              <a href="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors duration-200">
                Privacy Policy
              </a>
              <a href="/terms" className="text-gray-400 hover:text-white text-sm transition-colors duration-200">
                Terms of Service
              </a>
              <a href="/cookies" className="text-gray-400 hover:text-white text-sm transition-colors duration-200">
                Cookies Settings
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;