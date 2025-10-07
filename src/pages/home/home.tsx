import React, { useRef } from "react";
// Import the video file from the same directory
import bgVideo from "./bg.mp4"; 
import Navigation from "../../pages/components/Navigation";
import Footer from "../../pages/components/Footer";

// Define the feature data for easy mapping
const features = [
  {
    icon: 'CloudOff', // Placeholder for Hybrid Offline + Online POS
    title: 'Hybrid Offline + Online POS',
    description: 'Works seamlessly even without internet and syncs automatically when back online.',
  },
  {
    icon: 'Box', // Placeholder for Smart Inventory Management
    title: 'Smart Inventory Management',
    description: 'Track stock in real-time, get low-stock alerts, and manage suppliers easily.',
  },
  {
    icon: 'Smartphone', // Placeholder for Multi-Device Access
    title: 'Multi-Device Access',
    description: 'Use on desktop, tablet, or mobile — one account, all synced.',
  },
  {
    icon: 'CreditCard', // Placeholder for Integrated Payments
    title: 'Integrated Payments',
    description: 'Accept cash, card, QR, and local payment gateways (PayHere, etc.).',
  },
  {
    icon: 'Users', // Placeholder for Customer Engagement Tools
    title: 'Customer Engagement Tools',
    description: 'Loyalty programs, FlashPromo SMS/WhatsApp/Email marketing.',
  },
  {
    icon: 'BarChart', // Placeholder for Advanced Reports & Insights
    title: 'Advanced Reports & Insights',
    description: 'Sales analytics, staff performance, and profit breakdowns in one dashboard.',
  },
];


const Home: React.FC = () => {
  const secondSectionRef = useRef<HTMLDivElement>(null);

  const scrollToSecondSection = () => {
    if (secondSectionRef.current) {
      secondSectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Helper component for the feature card
  const FeatureCard: React.FC<{ icon: string; title: string; description: string }> = ({ icon, title, description }) => (
    <div 
      className="p-8 bg-white border border-gray-200 rounded-xl shadow-sm transition-all duration-300 hover:shadow-xl hover:scale-[1.01] flex flex-col"
    >
      {/* Icon/Illustration (Placeholder) - Styled with your accent color */}
      <div className="flex items-center justify-center w-12 h-12 mb-5 rounded-lg bg-[#C8F932]/20">
        {/* Placeholder for the actual icon component */}
        <span className="text-xl text-[#C8F932] font-semibold">{icon.charAt(0)}</span>
      </div>

      {/* Feature Title */}
      <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>

      {/* Description */}
      <p className="text-base text-slate-600">{description}</p>
    </div>
  );


  return (
    <div className="min-h-screen bg-white flex flex-col pt-20 lg:pt-0">
      {/* Global Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="flex-1">
        
        {/* === START: Hero Section (Remains the same) === */}
        <section className="relative min-h-[calc(100vh-80px)] overflow-hidden flex items-center justify-center"> 
          
          <div className="absolute inset-0 pointer-events-none z-0">
            <video
              autoPlay
              loop 
              muted 
              playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-100" 
            >
              <source src={bgVideo} type="video/mp4" /> 
              Your browser does not support the video tag.
            </video>
            <div className="absolute inset-0 bg-black/40"></div> 
          </div>

          <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-8 text-center">
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight tracking-tight mb-4 text-shadow-lg">
              Sell Faster, Grow with CeyPOS
            </h1>
            
            <p className="text-lg md:text-xl text-white max-w-3xl mx-auto mb-8 text-shadow-md">
              The modern Point-of-Sale solution designed for Sri Lanka—simple, reliable, and smart.
            </p>

            <button
              onClick={scrollToSecondSection} 
              className="inline-flex items-center px-10 py-3 bg-[#C8F932] hover:bg-[#b5e02c] text-slate-900 text-lg font-semibold rounded-lg transition-all duration-300 ease-in-out transform hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-[#C8F932]/50 shadow-xl"
            >
              Explore Features & Solutions
              <svg className="ml-3 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>

          </div>
        </section>
        {/* === END: Hero Section === */}
        
        {/* ------------------------------------------------------------- */}

        {/* === START: Second Section: Our Key Features === */}
        <section ref={secondSectionRef} className="py-24 lg:py-32 bg-gray-50"> 
          <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
            
            {/* Section Header */}
            <header className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
                Designed to Power Your Retail Growth
              </h2>
              <p className="text-lg text-slate-600">
                CeyPOS is built from the ground up to handle everything from a single pop-up shop to a multi-branch retail chain, effortlessly.
              </p>
            </header>

            {/* Features Grid (2 rows x 3 columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <FeatureCard 
                  key={index}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                />
              ))}
            </div>

          </div>
        </section>
        {/* === END: Second Section === */}

      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
};

export default Home;