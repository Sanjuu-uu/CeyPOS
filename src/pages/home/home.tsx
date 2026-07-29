import React, { useRef } from "react";
// Import the video file from the same directory
import bgVideo from "./bg.mp4";
import Navigation from "../../pages/components/Navigation";
import Footer from "../../pages/components/Footer";

// Define the feature data (remains the same)
const features = [
  {
    icon: '🚀',
    title: 'Hybrid Offline + Online POS',
    description: 'Works seamlessly even without internet and syncs automatically when back online.',
  },
  {
    icon: '📦',
    title: 'Smart Inventory Management',
    description: 'Track stock in real-time, get low-stock alerts, and manage suppliers easily.',
  },
  {
    icon: '📱',
    title: 'Multi-Device Access',
    description: 'Use on desktop, tablet, or mobile — one account, all synced.',
  },
  {
    icon: '💳',
    title: 'Integrated Payments',
    description: 'Accept cash, card, QR, and local payment gateways (PayHere, etc.).',
  },
  {
    icon: '💬',
    title: 'Customer Engagement Tools',
    description: 'Loyalty programs, FlashPromo SMS/WhatsApp/Email marketing.',
  },
  {
    icon: '📈',
    title: 'Advanced Reports & Insights',
    description: 'Sales analytics, staff performance, and profit breakdowns in one workspace.',
  },
];

// Define the stats data (remains the same)
const stats = [
  { label: 'CLIENT RETENTION', value: '+98%' },
  { label: 'LOCATIONS POWERED', value: '+3.5K' },
  { label: 'MONTHLY TRANSACTIONS', value: '+1.2M' },
  { label: 'TOTAL SALES VOLUME', value: '458M LKR' },
];

const FeatureBlock: React.FC<{ icon: string; title: string; description: string; isReversed?: boolean }> = ({ icon, title, description, isReversed = false }) => (
  <div className={`flex flex-col md:flex-row items-center gap-8 ${isReversed ? 'md:flex-row-reverse' : ''} p-8 bg-white rounded-xl shadow-lg border border-gray-100`}>
    <div className="flex-shrink-0 w-20 h-20 md:w-24 md:h-24 flex items-center justify-center rounded-full bg-[#D8FA50]/15">
      <span className="text-4xl md:text-5xl text-slate-800">{icon}</span>
    </div>
    <div className="text-center md:text-left flex-grow">
      <h3 className="text-2xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-base text-slate-600">{description}</p>
    </div>
  </div>
);


const Home: React.FC = () => {
  const secondSectionRef = useRef<HTMLDivElement>(null);
  
  const scrollToSecondSection = () => {
    if (secondSectionRef.current) {
      secondSectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleStartClick = () => {
    window.location.href = '/register';
  };

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
          <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-8 text-center pt-20"> 
           <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight tracking-tight mb-4 text-shadow-lg">
              Sell Faster, Grow with CeyPOS
            </h1>
            <p className="text-lg md:text-xl text-white max-w-3xl mx-auto mb-8 text-shadow-md">
              The modern Point-of-Sale solution designed for Sri Lanka—simple, reliable, and smart.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleStartClick} 
                className="inline-flex items-center px-10 py-3 bg-[#D8FA50] hover:bg-[#C5F542] text-slate-900 text-lg font-semibold rounded-full transition-all duration-300 ease-in-out transform hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-[#D8FA50]/50 shadow-xl"
              >
                Let's Start
              </button>
              <button
                onClick={scrollToSecondSection} 
                className="inline-flex items-center px-10 py-3 bg-transparent border-2 border-white hover:bg-white/10 text-white text-lg font-semibold rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                Explore Features & Solutions
              </button>
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