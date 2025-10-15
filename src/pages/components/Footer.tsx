import React from 'react';
import { Link } from 'react-router-dom'; // Assuming you use react-router-dom for navigation

const Footer: React.FC = () => {
  return (
    <footer className="relative bg-gray-50 pt-20 pb-12 overflow-hidden">
      {/* Subtle wave design - achieved with a radial gradient or SVG if more complex */}
      <div 
        className="absolute bottom-0 left-0 right-0 w-full h-48 bg-white"
        style={{
          clipPath: 'ellipse(70% 30% at 50% 100%)', // Example for a subtle bottom curve
        }}
      ></div>

      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 relative z-10">
        {/* Top section: Logo/CTA, Social, and Nav Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 pb-16 border-b border-gray-200">
          
          {/* Column 1: CeyPOS Branding & CTA */}
          <div className="space-y-6">
            <Link to="/" className="text-2xl font-bold text-slate-900">
              CeyPOS
            </Link>
            <h3 className="text-xl font-bold text-slate-900">Ready to Grow with CeyPOS?</h3>
            <p className="text-slate-600 text-sm">
              Streamline your sales, manage inventory, and connect with customers. Start your journey today!
            </p>
            {/* Social Media Icons - 🔥 UPDATED */}
            <div className="flex space-x-4 pt-2">
              {/* X (Twitter) */}
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-200 text-slate-700 hover:bg-gray-300 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.901 1.153h3.68v2.427h-2.145l.937 2.046c.94 2.067 1.408 4.298 1.408 6.702 0 6.635-4.52 11.758-12.787 11.758C6.113 24 1.838 19.344 1.838 12.001c0-4.636 2.385-8.528 5.76-10.702l2.378 1.956c-2.43 1.572-4.102 4.092-4.102 7.009 0 4.14 2.502 7.087 6.417 7.087 3.55 0 6.002-2.947 6.002-7.087 0-2.404-.468-4.635-1.408-6.702l.937-2.046h-2.145V1.153z"/>
                </svg>
              </a>
              {/* Instagram */}
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-200 text-slate-700 hover:bg-gray-300 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 0C8.74 0 8.333.014 7.042.062 5.952.1 5.245.158 4.78.337c-.636.23-1.168.665-1.603 1.1-.435.435-.87 1.018-1.1 1.603-.179.46-.237 1.168-.275 2.257-.048 1.29-.062 1.704-.062 5.066s.014 3.776.062 5.066c.038 1.089.096 1.797.275 2.257.235.636.669 1.168 1.1 1.603.435.435 1.018.87 1.603 1.1.46.179 1.168.237 2.257.275 1.29.048 1.704.062 5.066.062s3.776-.014 5.066-.062c1.089-.038 1.797-.096 2.257-.275.636-.23 1.168-.665 1.603-1.1.435-.435.87-1.018 1.1-1.603.179-.46.237-1.168.275-2.257.048-1.29.062-1.704.062-5.066s-.014-3.776-.062-5.066c-.038-1.089-.096-1.797-.275-2.257-.23-0.636-.665-1.168-1.1-1.603-.435-0.435-1.018-0.87-1.603-1.1-.46-0.179-1.168-0.237-2.257-0.275-1.29-0.048-1.704-0.062-5.066-0.062zm0 1.602c3.216 0 3.585.016 4.85.064 1.059.037 1.74.095 2.128.243.344.13.593.308.83.545.237.237.416.486.545.83.148.388.206 1.069.243 2.128.048 1.265.064 1.634.064 4.85s-.016 3.585-.064 4.85c-.037 1.059-.095 1.74-.243 2.128-.13.344-.308.593-.545.83-.237.237-.486.416-.83.545-.388.148-1.069.206-2.128.243-1.265.048-1.634.064-4.85.064s-3.585-.016-4.85-.064c-1.059-.037-1.74-.095-2.128-.243-.344-.13-.593-.308-.83-.545-.237-.237-.416-.486-.545-.83-.148-.388-.206-1.069-.243-2.128-.048-1.265-.064-1.634-.064-4.85s.016-3.585.064-4.85c.037-1.059.095-1.74.243-2.128.13-.344.308-.593.545-.83.237-.237.486-.416.83-.545.388-.148 1.069-.206 2.128-.243 1.265-.048 1.634-.064 4.85-.064zm0 2.456a6.456 6.456 0 100 12.912 6.456 6.456 0 000-12.912zM12 7a5 5 0 110 10 5 5 0 010-10zm6.182-1.706a1.458 1.458 0 100 2.916 1.458 1.458 0 000-2.916z" clipRule="evenodd"/>
                </svg>
              </a>
              {/* Facebook */}
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-200 text-slate-700 hover:bg-gray-300 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.776-3.89 1.094 0 2.24.195 2.24.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33V22C18.343 21.128 22 16.991 22 12z" clipRule="evenodd"/>
                </svg>
              </a>
              {/* LinkedIn */}
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-200 text-slate-700 hover:bg-gray-300 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.5 2H3.5A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5V3.5A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zm-1.5-10a1.5 1.5 0 111.5-1.5 1.5 1.5 0 01-1.5 1.5zM19 19h-3v-4.5c0-1.12.01-2.04-1.24-2.04C13.29 12.46 13 13.56 13 15v4h-3v-9h3v1.39c.47-.9 1.77-1.89 3.06-1.89 3.67 0 4.44 2.45 4.44 5.69V19z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2: Product/Features (remains the same) */}
          <div>
            <h4 className="text-lg font-semibold text-slate-900 mb-5">Product</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/features" className="text-slate-600 hover:text-slate-900 transition-colors">Features</Link></li>
              <li><a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">Integrations</a></li> {/* Example link */}
              <li><a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">Updates <span className="text-[#D8FA50] ml-1 font-bold">New</span></a></li>
              <li><Link to="/pricing" className="text-slate-600 hover:text-slate-900 transition-colors">Pricing</Link></li>
              <li><Link to="/support" className="text-slate-600 hover:text-slate-900 transition-colors">Support</Link></li>
            </ul>
          </div>

          {/* Column 3: Company (remains the same) */}
          <div>
            <h4 className="text-lg font-semibold text-slate-900 mb-5">Company</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/about" className="text-slate-600 hover:text-slate-900 transition-colors">About Us</Link></li>
              <li><a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">Careers</a></li>
              <li><a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">Blog</a></li>
              <li><a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Column 4: Legal & Resources (remains the same) */}
          <div>
            <h4 className="text-lg font-semibold text-slate-900 mb-5">Resources</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/login" className="text-slate-600 hover:text-slate-900 transition-colors">Login</Link></li>
              <li><Link to="/register" className="text-slate-600 hover:text-slate-900 transition-colors">Register</Link></li>
              <li><a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">API <span className="text-[#D8FA50] ml-1 font-bold">New</span></a></li>
              <li><a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">Documentation</a></li>
              <li><a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">Status</a></li>
            </ul>
          </div>

        </div> {/* End of grid */}

        {/* Bottom section: Copyright and Legal Links - 🔥 UPDATED */}
        <div className="flex flex-col md:flex-row justify-between items-center pt-8 text-sm">
          <p className="text-slate-600 mb-4 md:mb-0">
            ©️ {new Date().getFullYear()} CeyPOS. All rights reserved. <br className="md:hidden"/> Built by <a href="https://www.ceynode.com" target="_blank" rel="noopener noreferrer" className="text-slate-700 hover:text-slate-900 transition-colors font-semibold">Ceynode</a>.
          </p>
          <div className="flex flex-wrap justify-center space-x-6">
            <a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">Privacy Policy</a>
            <a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">Terms of Service</a>
            <a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">Cookie Settings</a>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;