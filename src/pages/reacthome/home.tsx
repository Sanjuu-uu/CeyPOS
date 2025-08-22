import React from 'react';
import { ArrowRight, Star, Users, Shield, TrendingUp, CreditCard, ShoppingCart, BarChart3 } from 'lucide-react';
import Navigation from './components/Navigation';
import Footer from './components/Footer'; // Add this import

// Try multiple import methods for your Luvy background
import backgroundImage1 from './images/footer-20background-1.png';
import backgroundImage2 from './images/footer-20background.png';
import backgroundImage3 from './images/footer-20background-p-2000.png';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Global Navigation Component */}
      <Navigation />

      {/* Main Content */}
      <div className="flex-1">
        {/* Hero Section */}
        <div className="bg-white relative overflow-hidden">
          {/* Background Image - Luvy Style */}
          <div className="absolute inset-0 pointer-events-none bg-red-100">
            <img
              src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=800&fit=crop&crop=center"
              loading="lazy"
              className="w-full h-full object-cover opacity-50"
              alt=""
              onLoad={() => console.log('Test background image loaded successfully')}
              onError={(e) => {
                console.log('Test background image failed to load');
                console.log('Error:', e);
              }}
            />
          </div>

          {/* Hero Content */}
          <div className="relative z-10 max-w-6xl mx-auto px-6 py-20">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  POS Software
                </div>
                <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                  Revolutionary
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-blue-600"> Point of Sale</span>
                  <br />Software Solutions
                </h1>
                <p className="text-xl text-gray-600 mb-8 max-w-lg">
                  Streamline your business operations with CeyPOS - the complete point of sale solution designed for modern retailers and restaurants.
                </p>
                <div className="space-y-4 mb-8">
                  <p className="text-sm text-gray-500 font-medium">
                    30 Day Free Trial • No Credit Card Required
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex">
                      <input 
                        type="email" 
                        placeholder="Enter your email"
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <button className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-6 py-3 rounded-r-lg transition-all duration-300 font-semibold flex items-center">
                        Get Started
                        <ArrowRight className="ml-2" size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-8 shadow-2xl">
                  <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    {/* Mock Dashboard */}
                    <div className="bg-gradient-to-r from-green-500 to-blue-600 p-4">
                      <div className="flex items-center justify-between text-white">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold">C</span>
                          </div>
                          <span className="font-semibold">CeyPOS Dashboard</span>
                        </div>
                        <div className="text-sm">Welcome back! 👋</div>
                      </div>
                    </div>
                    
                    <div className="p-6 space-y-4">
                      {/* Stats Row */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">$96,342</div>
                          <div className="text-xs text-gray-500">Total Income</div>
                          <div className="flex items-center text-xs text-green-600 mt-1">
                            <TrendingUp size={12} className="mr-1" />
                            11.95%
                          </div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">$12,500</div>
                          <div className="text-xs text-gray-500">Profit</div>
                          <div className="flex items-center text-xs text-blue-600 mt-1">
                            <TrendingUp size={12} className="mr-1" />
                            8.2%
                          </div>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">12.96</div>
                          <div className="text-xs text-gray-500">Conversion</div>
                          <div className="flex items-center text-xs text-purple-600 mt-1">
                            <TrendingUp size={12} className="mr-1" />
                            5.1%
                          </div>
                        </div>
                      </div>
                      
                      {/* Chart placeholder */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-medium text-gray-700">Sales Performance</span>
                          <span className="text-sm text-gray-500">Weekly</span>
                        </div>
                        <div className="flex items-end space-x-2 h-20">
                          {[40, 70, 45, 80, 60, 90, 65].map((height, i) => (
                            <div 
                              key={i}
                              className="bg-gradient-to-t from-green-400 to-blue-500 rounded-sm flex-1"
                              style={{height: `${height}%`}}
                            ></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-gray-50 py-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-green-600 mb-2">+22k</div>
                <p className="text-gray-600 font-medium uppercase tracking-wide text-sm">Active Users</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-blue-600 mb-2">+124M</div>
                <p className="text-gray-600 font-medium uppercase tracking-wide text-sm">Transactions</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-purple-600 mb-2">99.9%</div>
                <p className="text-gray-600 font-medium uppercase tracking-wide text-sm">Uptime</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-orange-600 mb-2">45.8M</div>
                <p className="text-gray-600 font-medium uppercase tracking-wide text-sm">Revenue Processed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-white py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="inline-flex items-center bg-gradient-to-r from-green-100 to-blue-100 text-gray-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <BarChart3 size={16} className="mr-2" />
                Complete POS Solution
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-blue-600">
                  Accelerate your business growth
                </span>
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Everything you need to manage your retail or restaurant business efficiently, from inventory management to customer analytics.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300 group">
                <div className="bg-gradient-to-br from-green-100 to-green-200 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <CreditCard className="text-green-600" size={28} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Payment Processing</h3>
                <p className="text-gray-600 mb-6">
                  Accept all payment methods including cards, mobile payments, and cash with our secure processing system.
                </p>
                <a href="#" className="text-green-600 font-semibold flex items-center group-hover:text-green-700">
                  Learn More
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={16} />
                </a>
              </div>
              
              <div className="bg-white p-8 rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300 group">
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <ShoppingCart className="text-blue-600" size={28} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Inventory Management</h3>
                <p className="text-gray-600 mb-6">
                  Track stock levels, manage suppliers, and get automated alerts when items need restocking.
                </p>
                <a href="#" className="text-blue-600 font-semibold flex items-center group-hover:text-blue-700">
                  Learn More
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={16} />
                </a>
              </div>
              
              <div className="bg-white p-8 rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300 group">
                <div className="bg-gradient-to-br from-purple-100 to-purple-200 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="text-purple-600" size={28} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Analytics & Reporting</h3>
                <p className="text-gray-600 mb-6">
                  Get detailed insights into your business performance with comprehensive reports and analytics.
                </p>
                <a href="#" className="text-purple-600 font-semibold flex items-center group-hover:text-purple-700">
                  Learn More
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={16} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-gray-50 py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">
              <div>
                <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-8 shadow-xl">
                  <div className="bg-white rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-800">Sales Overview</h4>
                      <span className="text-sm text-gray-500">Today</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Revenue</span>
                        <span className="font-semibold text-green-600">$2,847</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Orders</span>
                        <span className="font-semibold text-blue-600">156</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Customers</span>
                        <span className="font-semibold text-purple-600">89</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center text-green-600 mb-4">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <span className="font-bold text-sm">1</span>
                  </div>
                  <span className="font-semibold">STREAMLINED OPERATIONS</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Experience seamless integration with CeyPOS
                </h3>
                <p className="text-gray-600 text-lg mb-6">
                  Our intuitive point of sale system integrates perfectly with your existing business processes, making it easy to manage sales, inventory, and customer data from one central platform.
                </p>
                <button className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-8 py-3 rounded-lg transition-all duration-300 font-semibold">
                  Discover Features
                </button>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">
              <div className="order-2 lg:order-1">
                <div className="flex items-center text-blue-600 mb-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span className="font-bold text-sm">2</span>
                  </div>
                  <span className="font-semibold">REAL-TIME INSIGHTS</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Unlock powerful analytics and reporting
                </h3>
                <p className="text-gray-600 text-lg mb-6">
                  Make data-driven decisions with our comprehensive analytics dashboard. Track sales trends, monitor inventory levels, and understand customer behavior in real-time.
                </p>
                <button className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-8 py-3 rounded-lg transition-all duration-300 font-semibold">
                  View Analytics
                </button>
              </div>
              <div className="order-1 lg:order-2">
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 shadow-xl">
                  <div className="bg-white rounded-xl p-6">
                    <h4 className="font-semibold text-gray-800 mb-4">Performance Metrics</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">↗ 25%</div>
                        <div className="text-xs text-gray-600">Sales Growth</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">↗ 18%</div>
                        <div className="text-xs text-gray-600">Customer Retention</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 shadow-xl">
                  <div className="bg-white rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-800">Team Performance</h4>
                      <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">Live</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">A</div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">Alex Smith</div>
                          <div className="text-xs text-gray-500">45 sales today</div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">M</div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">Maria Garcia</div>
                          <div className="text-xs text-gray-500">38 sales today</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center text-purple-600 mb-4">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                    <span className="font-bold text-sm">3</span>
                  </div>
                  <span className="font-semibold">TEAM COLLABORATION</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Boost your team's performance with CeyPOS
                </h3>
                <p className="text-gray-600 text-lg mb-6">
                  Empower your staff with tools that make their jobs easier. From quick product lookup to customer management, CeyPOS helps your team work more efficiently and provide better customer service.
                </p>
                <button className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-8 py-3 rounded-lg transition-all duration-300 font-semibold">
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-green-600 to-blue-700 py-20">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <div className="inline-flex items-center bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
              Let's Try!
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Start your 30-day free trial
            </h2>
            <p className="text-green-100 text-lg mb-8 max-w-2xl mx-auto">
              Give CeyPOS a try and see for yourself how it can transform your business operations and boost your sales performance.
            </p>
            
            <div className="max-w-md mx-auto mb-8">
              <div className="flex">
                <input 
                  type="email" 
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-white/50"
                />
                <button className="bg-white text-green-600 px-6 py-3 rounded-r-lg font-semibold hover:bg-gray-100 transition-colors">
                  Get Started
                </button>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-white text-sm">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                Free 30-day trial
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                No credit card required
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                Cancel anytime
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

export default Home;