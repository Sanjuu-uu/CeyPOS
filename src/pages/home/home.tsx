import React from 'react';
import { ArrowRight, Star, Users, Shield, TrendingUp, CreditCard, ShoppingCart, BarChart3 } from 'lucide-react';
import Navigation from '../../pages/components/Navigation';
import Footer from '../../pages/components/Footer'; // Add this import


const Home: React.FC = () => {
  return (
   <div className="min-h-screen bg-white flex flex-col lg:pt-0">
      <Navigation />
      <main className="flex-1">
        
        {/* === START: Hero Section (remains the same) === */}
         <section className="relative min-h-screen overflow-hidden flex items-center justify-center"> 
        <div className="absolute inset-0 pointer-events-none z-0">
            <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-100">
              <source src={bgVideo} type="video/mp4" /> 
              Your browser does not support the video tag.
            </video>
            <div className="absolute inset-0 bg-black/40"></div> 
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
        </section>
        {/* === END: Hero Section === */}
        
        {/* ------------------------------------------------------------- */}

        {/* === START: Stats Bar / Trust Bar Section (UPDATED SIZE) === */}
        <section className="bg-white py-12 lg:py-16 border-b border-gray-100">
          <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center mb-12">
              {stats.map((stat) => (
                <div key={stat.label} className="py-2">
                  <p className="text-sm sm:text-base font-semibold uppercase text-slate-500 mb-1 tracking-wider"> {/* 🔥 UPDATED: text-sm sm:text-base */}
                    {stat.label}
                  </p>
                  <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900"> {/* 🔥 UPDATED: text-3xl sm:text-4xl */}
                    {stat.value}
                  </h3>
                </div>
              ))}
            </div>

            {/* Separator Line and Icon (remains the same) */}
            <div className="flex items-center justify-center max-w-4xl mx-auto">
              <div className="flex-grow border-t border-gray-200"></div>
              <div className="mx-8 flex-shrink-0">
                <div className="w-6 h-6 flex items-center justify-center text-[#D8FA50]">
                  <svg className="w-5 h-5 transform rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4M12 20V18M18 12H20M4 12H6M17.65 6.35l-1.42 1.42M6.34 17.66l-1.41 1.41M17.66 17.66l-1.42-1.42M6.35 6.35l-1.41-1.41"></path>
                  </svg>
                </div>
              </div>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>
            
          </div>
        </section>
        {/* === END: Stats Bar / Trust Bar Section === */}
        
        {/* ------------------------------------------------------------- */}

        {/* === START: Second Section: Our Key Features (Now Third Section) === */}
        <section ref={secondSectionRef} className="py-24 lg:py-32 bg-gray-50"> 
          <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
            
            <header className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
                Designed to Power Your Retail Growth
              </h2>
              <p className="text-lg text-slate-600">
                CeyPOS is built from the ground up to handle everything from a single pop-up shop to a multi-branch retail chain, effortlessly.
              </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
              {features.map((feature, index) => (
                <FeatureBlock 
                  key={index}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  isReversed={index % 2 !== 0}
                />
              ))}
            </div>

          </div>
        </section>
        {/* === END: Second Section === */}

        

      </main>

      <Footer />
    </div>
  );
};

export default Home;