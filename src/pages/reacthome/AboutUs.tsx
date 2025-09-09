
import { Users, Target, Zap, Shield, Cloud, BarChart3, CreditCard, Smartphone, TrendingUp, Globe, Award } from 'lucide-react';
import Navigation from './components/Navigation';
import Footer from './components/Footer';

// Main About Us Component
const AboutUs = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Add CSS for flip cards and tiles */}
      <style >{`
        /* Original flip card styles */
        .flip-card {
          perspective: 1000px;
        }
        
        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          text-align: center;
          transition: transform 0.8s;
          transform-style: preserve-3d;
        }
        
        .flip-card:hover .flip-card-inner {
          transform: rotateY(180deg);
        }
        
        .flip-card-front, .flip-card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
        }
        
        .flip-card-back {
          transform: rotateY(180deg);
        }

        /* New tile flip card styles */
        .flip-card-tile {
          perspective: 1000px;
          height: 240px;
          min-width: 360px;
        }
        
        .flip-card-tile-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.6s ease-in-out;
          transform-style: preserve-3d;
        }
        
        .flip-card-tile:hover .flip-card-tile-inner {
          transform: rotateY(180deg);
        }
        
        .flip-card-tile:hover {
          transform: translateY(-4px);
        }
        
        .tile-face {
          position: absolute;
          width: 100%;
          height: 100%;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          background-color: #171A1F;
          border: 1px solid #242A31;
          border-radius: 20px;
          padding: 32px 24px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.05) inset;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          transition: box-shadow 0.3s ease;
        }
        
        .flip-card-tile-back {
          transform: rotateY(180deg);
        }
        
        .flip-card-tile:hover .tile-face {
          box-shadow: 0 12px 32px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.05) inset;
        }

        @media (max-width: 1024px) {
          .flip-card-tile {
            min-width: auto;
            height: 220px;
          }
        }
      `}</style>

      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <div className="relative overflow-hidden flex-1">
        {/* Background Pattern with Curved Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-gray-25 to-gray-50 opacity-90"></div>
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-gray-200/30 to-gray-300/20 rounded-full opacity-40 -translate-x-64 -translate-y-64"></div>
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-tl from-gray-300/20 to-gray-400/10 rounded-full opacity-30 translate-x-64 translate-y-64"></div>
          {/* Curved corner wave */}
          <div className="absolute top-0 right-0 w-96 h-96">
            <div className="absolute inset-0 bg-gradient-to-bl from-gray-200/20 via-transparent to-transparent rounded-bl-full opacity-50"></div>
          </div>
        </div>

        <div className="relative z-10">
          {/* Hero Section with Side Stats */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              {/* Main Content - Left Side */}
              <div className="lg:col-span-7 lg:pl-4">
                <div className="inline-flex items-center bg-gray-50 text-gray-500 px-3 py-1 rounded-full text-xs font-medium mb-3 border border-gray-200">
                  CEYPOS ABOUT US
                </div>
                
                <h1 className="text-5xl lg:text-6xl xl:text-7xl font-black text-gray-900 mb-8 leading-[0.85] tracking-[-0.02em]">
                  We're On a Mission<br />
                  to Power Retailers
                </h1>
                
                <p className="text-gray-500 text-base mb-10 max-w-lg leading-6 font-light">
                  We democratize retail technology for small to medium-sized businesses. 
                  By eliminating traditional barriers, CEYPOS enables merchants to establish 
                  their digital storefront with minimal technical expertise.
                </p>

                {/* Founder Quote - Tightly Grouped */}
                <div className="flex items-start space-x-4 max-w-2xl">
                  {/* Profile Avatar - Rounded Square Card */}
                  <div className="w-14 h-14 bg-white rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg border border-gray-100 p-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-600 text-sm mb-3 leading-5 font-normal">
                      "Traditional POS systems create barriers instead of opportunities. We built CEYPOS to change that—making enterprise-grade retail technology accessible to every business owner, regardless of their technical background or budget constraints."
                    </p>
                    <div className="space-y-0.5">
                      <div className="text-gray-900 font-semibold text-sm">Alex Johnson</div>
                      <div className="text-gray-400 text-sm font-light">Founder, <span className="font-semibold text-gray-900">CEYPOS</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Cards - Right Side with Precise Spacing */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 text-center shadow-lg border border-gray-100/50 hover:shadow-xl transition-shadow duration-300">
                  <div className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">USED BY</div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">11,000+</div>
                  <div className="text-sm text-gray-500 font-medium">Creators</div>
                </div>
                
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 text-center shadow-lg border border-gray-100/50 hover:shadow-xl transition-shadow duration-300">
                  <div className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">VALUE</div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">49M</div>
                  <div className="text-sm text-gray-500 font-medium">Revenue per Year</div>
                </div>
                
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 text-center shadow-lg border border-gray-100/50 hover:shadow-xl transition-shadow duration-300">
                  <div className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">TO SUPPORT</div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">8.5m</div>
                  <div className="text-sm text-gray-500 font-medium">End Users</div>
                </div>
              </div>
            </div>
          </section>

          {/* Foundation Section - Floating Black Board */}
          <section className="bg-white py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              
              {/* Single Floating Board */}
              <div className="relative mx-auto" style={{
                width: '92%',
                maxWidth: '1150px',
                minHeight: '440px',
                backgroundColor: '#111315',
                borderRadius: '26px',
                border: '1px solid #1E2227',
                boxShadow: '0 12px 40px rgba(0,0,0,0.55), 0 2px 0 rgba(255,255,255,0.04) inset, 0 1px 0 rgba(255,255,255,0.06) inset',
                backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.08) 1px, transparent 0)`,
                backgroundSize: '18px 18px',
                backgroundPosition: '20px 20px'
              }}>
                
                {/* Board Content */}
                <div className="p-12 sm:p-14">
                  
                  {/* Header */}
                  <div className="text-center mb-12">
                    <h2 className="text-3xl font-semibold text-gray-100 mb-6">
                      Our Foundation
                    </h2>
                    <p className="text-gray-400 text-lg leading-relaxed max-w-2xl mx-auto">
                      Built on clear mission and vision that drives everything we do
                    </p>
                  </div>

                  {/* Mission & Vision Tiles Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
                    
                    {/* Mission Tile */}
                    <div className="flip-card-tile">
                      <div className="flip-card-tile-inner">
                        {/* Front Face */}
                        <div className="flip-card-tile-front tile-face">
                          <div className="inline-flex items-center bg-gray-700 text-gray-200 px-3 py-1 rounded-full text-xs font-medium tracking-wider mb-6">
                            OUR MISSION
                          </div>
                          <h3 className="text-xl font-bold text-gray-50 leading-snug text-center">
                            "Empower retailers with seamless, affordable technology."
                          </h3>
                        </div>

                        {/* Back Face */}
                        <div className="flip-card-tile-back tile-face">
                          <div className="flex items-center justify-center h-full">
                            <p className="text-gray-300 text-base leading-7 text-center">
                              "CEYPOS exists to remove technical and cost barriers in retail. We deliver simple, scalable tools that help SMBs run and grow—without complexity."
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Vision Tile */}
                    <div className="flip-card-tile">
                      <div className="flip-card-tile-inner">
                        {/* Front Face */}
                        <div className="flip-card-tile-front tile-face">
                          <div className="inline-flex items-center bg-gray-700 text-gray-200 px-3 py-1 rounded-full text-xs font-medium tracking-wider mb-6">
                            OUR VISION
                          </div>
                          <h3 className="text-xl font-bold text-gray-50 leading-snug text-center">
                            "Redefine retail through innovation and inclusivity."
                          </h3>
                        </div>

                        {/* Back Face */}
                        <div className="flip-card-tile-back tile-face">
                          <div className="flex items-center justify-center h-full">
                            <p className="text-gray-300 text-base leading-7 text-center">
                              "We see a future where every merchant—regardless of background—can access enterprise-grade retail tech. CEYPOS makes digital transformation effortless."
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Mission & Vision Section */}
          <section className="bg-white py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <p className="text-gray-600 mb-4">OUR PURPOSE</p>
                <h2 className="text-3xl font-bold text-gray-900 mb-8">
                  We're enabling<br />
                  everyone to create<br />
                  and innovate.
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                {/* Mission Card */}
                <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                  <div className="h-40 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl mb-6 flex items-center justify-center">
                    <Target className="w-16 h-16 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Our Mission</h3>
                  <p className="text-gray-600">
                    To democratize retail technology by providing cloud-based POS solutions that eliminate 
                    traditional barriers and empower small to medium-sized businesses to thrive in the digital economy.
                  </p>
                </div>

                {/* Vision Card */}
                <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                  <div className="h-40 bg-gradient-to-br from-green-100 to-green-200 rounded-xl mb-6 flex items-center justify-center">
                    <Globe className="w-16 h-16 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Our Vision</h3>
                  <p className="text-gray-600">
                    A world where every retailer has access to enterprise-grade technology, regardless of size or 
                    technical expertise, fostering innovation and economic growth in communities worldwide.
                  </p>
                </div>
              </div>

              {/* Core Values */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-6 h-6 text-purple-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Innovation</h4>
                  <p className="text-sm text-gray-600">Leveraging AI and cloud technology to create breakthrough solutions.</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-6 h-6 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Security</h4>
                  <p className="text-sm text-gray-600">Enterprise-grade security protecting your business and customer data.</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Accessibility</h4>
                  <p className="text-sm text-gray-600">Making advanced technology accessible to businesses of all sizes.</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-6 h-6 text-orange-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Growth</h4>
                  <p className="text-sm text-gray-600">Scalable solutions that grow with your business success.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Key Features Section */}
          <section className="py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <p className="text-gray-600 mb-4">TRUSTED PARTNERS</p>
                <h2 className="text-3xl font-bold text-gray-900 mb-8">
                  These are some of our technology<br />
                  and business partners
                </h2>
              </div>

              {/* Partner Logos */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-16">
                <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-center justify-center h-20">
                  <span className="text-gray-600 font-semibold">Google Cloud</span>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-center justify-center h-20">
                  <span className="text-gray-600 font-semibold">Stripe</span>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-center justify-center h-20">
                  <span className="text-gray-600 font-semibold">AWS</span>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-center justify-center h-20">
                  <span className="text-gray-600 font-semibold">MongoDB</span>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-center justify-center h-20">
                  <span className="text-gray-600 font-semibold">React</span>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-center justify-center h-20">
                  <span className="text-gray-600 font-semibold">Node.js</span>
                </div>
              </div>

              {/* Feature Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
                  <div className="h-32 bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                    <Cloud className="w-16 h-16 text-purple-600" />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Cloud-First Architecture</h3>
                    <p className="text-gray-600">
                      Zero hardware requirements. Access your POS system from any device with our 
                      secure cloud-based platform that scales automatically with your business.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
                  <div className="h-32 bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center">
                    <BarChart3 className="w-16 h-16 text-pink-600" />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">AI-Powered Analytics</h3>
                    <p className="text-gray-600">
                      Get natural language insights powered by Google's Gemini AI. Ask questions 
                      about your business data and receive intelligent recommendations.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
                  <div className="h-32 bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                    <CreditCard className="w-16 h-16 text-green-600" />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Secure Payments</h3>
                    <p className="text-gray-600">
                      Flexible payment processing through Stripe integration with support for 
                      cards, digital wallets, and contactless payments. PCI compliant security.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Business Benefits */}
          <section className="bg-white py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-6">
                    Transform your business<br />
                    operations.
                  </h2>
                  <p className="text-gray-600 mb-8">
                    CEYPOS eliminates traditional barriers to retail technology adoption. Our cloud-native 
                    solution requires no expensive hardware, complex setup, or technical expertise. 
                    Get your store online and start processing transactions in under 10 minutes.
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      <span className="text-gray-700">Instant setup in under 10 minutes</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      <span className="text-gray-700">No hardware or software installation required</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      <span className="text-gray-700">AI-powered insights and recommendations</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-6">
                    Experience connectivity.
                  </h2>
                  <p className="text-gray-600 mb-8">
                    Connect with customers through automated digital receipts, real-time inventory 
                    tracking, and integrated payment processing. Our platform grows with your business, 
                    supporting everything from single stores to multi-location enterprises.
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      <span className="text-gray-700">Automated email and SMS receipts</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      <span className="text-gray-700">Real-time inventory management</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      <span className="text-gray-700">Scalable multi-location support</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-200">
                <div className="inline-flex items-center bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-4 py-2 rounded-full text-xs font-medium mb-6">
                  LET'S TRY!
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  Start your 14-day free<br />
                  trial
                </h2>
                <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                  Give CEYPOS a try and see for yourself if it's a good fit for your retail business needs. 
                  No credit card required, cancel anytime.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                  <div className="flex items-center bg-gray-50 rounded-full px-6 py-3 min-w-0 flex-1 max-w-md">
                    <input
                      type="email"
                      placeholder="Enter your email"
                      className="bg-transparent border-none outline-none flex-1 text-gray-900 placeholder-gray-500"
                    />
                  </div>
                  <button className="bg-black hover:bg-gray-800 text-white px-8 py-3 rounded-full font-medium transition-colors whitespace-nowrap">
                    Get Started
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>Free 14-day trial</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    <span>No credit card required</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span>Cancel anytime</span>
                  </div>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
                    <h3 className="font-semibold text-gray-900 mb-2">Starter Plan</h3>
                    <p className="text-gray-600 text-sm mb-4">Perfect for small businesses just getting started.</p>
                    <div className="text-2xl font-bold text-gray-900 mb-4">Free</div>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>✓ Up to 100 transactions/month</li>
                      <li>✓ Basic analytics</li>
                      <li>✓ Email receipts</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
                    <h3 className="font-semibold text-gray-900 mb-2">Professional Plan</h3>
                    <p className="text-gray-600 text-sm mb-4">Advanced features for growing businesses.</p>
                    <div className="text-2xl font-bold text-gray-900 mb-4">$29/mo</div>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>✓ Unlimited transactions</li>
                      <li>✓ AI-powered analytics</li>
                      <li>✓ Multi-location support</li>
                      <li>✓ SMS receipts</li>
                      <li>✓ Priority support</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Final decorative section with pattern */}
          <section className="py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <div className="h-24 flex items-center justify-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-600 rounded-xl transform rotate-12 opacity-80">
                </div>
              </div>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Join hundreds of retailers who have transformed their business operations with CEYPOS. 
                Our cloud-based solution eliminates barriers and empowers growth through innovative technology.
              </p>

              {/* Feature grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Smartphone className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-sm text-gray-600">
                    Mobile-first design works perfectly on tablets, phones, and desktop computers.
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Cloud className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-600">
                    Cloud infrastructure ensures 99.9% uptime and automatic backups of your data.
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-6 h-6 text-purple-600" />
                  </div>
                  <p className="text-sm text-gray-600">
                    Real-time analytics help you make informed decisions about inventory and pricing.
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Award className="w-6 h-6 text-orange-600" />
                  </div>
                  <p className="text-sm text-gray-600">
                    Enterprise-grade security with PCI compliance and end-to-end encryption.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Global Footer */}
      <Footer />
    </div>
  );
};

export default AboutUs;