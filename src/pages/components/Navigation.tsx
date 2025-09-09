import React, { useState } from 'react';

const Navigation: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleLoginClick = () => {
    // For now, just redirect using window.location
    window.location.href = '/login';
    closeMobileMenu();
  };

  return (
    <>
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            {/* Logo Section */}
            <div className="flex items-center">
              <a href="/" className="flex items-center">
                {/* Temporary Logo - Replace with actual CeyPOS logo */}
                <img 
                  src="https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=94&h=24&fit=crop&crop=center" 
                  alt="CeyPOS Logo" 
                  width="94" 
                  height="24"
                  className="h-6 w-auto"
                />
              </a>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="/about" className="text-gray-700 hover:text-gray-900 font-medium text-sm transition-colors duration-200">
                About
              </a>
              <a href="/features" className="text-gray-700 hover:text-gray-900 font-medium text-sm transition-colors duration-200">
                Features
              </a>
              <a href="/pricing" className="text-gray-700 hover:text-gray-900 font-medium text-sm transition-colors duration-200">
                Pricing
              </a>
              <a href="/support" className="text-gray-700 hover:text-gray-900 font-medium text-sm transition-colors duration-200">
                Support
              </a>
            </nav>

            {/* Right Side Buttons */}
            <div className="flex items-center space-x-3">
              <div className="hidden md:flex items-center space-x-3">
                {/* Login Button */}
                <button
                  onClick={handleLoginClick}
                  className="text-gray-700 hover:text-gray-900 font-medium text-sm px-4 py-1.5 rounded-full border border-gray-200 hover:border-gray-300 transition-all duration-200 cursor-pointer"
                >
                  Login
                </button>
                <a href="/contact" className="bg-[#D8FA50] hover:bg-[#C5F542] text-gray-900 font-semibold text-sm px-5 py-1.5 rounded-full transition-all duration-200 shadow-sm">
                  Let's Talk
                </a>
              </div>
              
              {/* Mobile Menu Button */}
              <button 
                onClick={toggleMobileMenu}
                className="md:hidden flex flex-col justify-center items-center w-6 h-6 space-y-1 relative z-60"
              >
                <div className={`w-5 h-0.5 bg-gray-600 transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></div>
                <div className={`w-5 h-0.5 bg-gray-600 transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`}></div>
                <div className={`w-5 h-0.5 bg-gray-600 transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></div>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div className={`fixed inset-0 z-40 md:hidden transition-all duration-300 ${isMobileMenuOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}>
        {/* Background Overlay */}
        <div 
          className={`absolute inset-0 bg-black transition-opacity duration-300 ${isMobileMenuOpen ? 'bg-opacity-50' : 'bg-opacity-0'}`}
          onClick={closeMobileMenu}
        ></div>
        
        {/* Mobile Menu Content */}
        <div className={`absolute top-0 left-0 right-0 bg-white shadow-lg transform transition-transform duration-300 ${isMobileMenuOpen ? 'translate-y-0' : '-translate-y-full'}`}>
          {/* Mobile Menu Header */}
          <div className="border-b border-gray-100 px-6 py-4">
            <div className="flex justify-between items-center">
              <img 
                src="https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=94&h=24&fit=crop&crop=center" 
                alt="CeyPOS Logo" 
                width="94" 
                height="24"
                className="h-6 w-auto"
              />
              <button 
                onClick={closeMobileMenu}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Navigation Links */}
          <div className="px-6 py-6">
            <div className="space-y-6">
              <a 
                href="/about" 
                onClick={closeMobileMenu}
                className="block text-gray-900 hover:text-gray-600 font-medium text-lg transition-colors duration-200"
              >
                About
              </a>
              <a 
                href="/features" 
                onClick={closeMobileMenu}
                className="block text-gray-900 hover:text-gray-600 font-medium text-lg transition-colors duration-200"
              >
                Features
              </a>
              <a 
                href="/pricing" 
                onClick={closeMobileMenu}
                className="block text-gray-900 hover:text-gray-600 font-medium text-lg transition-colors duration-200"
              >
                Pricing
              </a>
              <a 
                href="/support" 
                onClick={closeMobileMenu}
                className="block text-gray-900 hover:text-gray-600 font-medium text-lg transition-colors duration-200"
              >
                Support
              </a>
            </div>

            {/* Mobile Menu Buttons */}
            <div className="mt-8 pt-6 border-t border-gray-100 space-y-4">
              {/* Mobile Login Button */}
              <button 
                onClick={handleLoginClick}
                className="block w-full text-center text-gray-700 hover:text-gray-900 font-medium text-sm px-4 py-3 rounded-full border border-gray-200 hover:border-gray-300 transition-all duration-200"
              >
                Login
              </button>
              <a 
                href="/contact" 
                onClick={closeMobileMenu}
                className="block w-full text-center bg-[#D8FA50] hover:bg-[#C5F542] text-gray-900 font-semibold text-sm px-5 py-3 rounded-full transition-all duration-200 shadow-sm"
              >
                Let's Talk
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Prevent body scroll when mobile menu is open */}
      {isMobileMenuOpen && (
        <style>{`
          body {
            overflow: hidden;
          }
        `}</style>
      )}
    </>
  );
};

export default Navigation;