import React from "react";
import Navigation from "../../pages/components/Navigation";
import Footer from "../../pages/components/Footer";

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col pt-20 lg:pt-0">
      {/* Global Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="flex-1">
        {/* === START: Hero Section (CeyPOS content + clean background) === */}
        <section className="bg-gray-50 relative pt-32 lg:pt-36 pb-24 lg:pb-28 overflow-hidden">

          {/* Background Pattern - Black shade */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 opacity-80"></div>
            <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full opacity-20 -translate-x-48 -translate-y-48"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full opacity-20 translate-x-48 translate-y-48"></div>
            <div className="absolute top-1/3 right-0 w-80 h-80 bg-gradient-to-bl from-gray-200 to-gray-300 rounded-full opacity-15 translate-x-32 -translate-y-16"></div>
            <div className="absolute bottom-1/4 left-0 w-72 h-72 bg-gradient-to-tr from-gray-300 to-gray-400 rounded-full opacity-15 -translate-x-36 translate-y-12"></div>
            <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-gradient-to-br from-gray-250 to-gray-350 rounded-full opacity-12 -translate-x-32 -translate-y-32"></div>
            <div className="absolute bottom-1/3 right-1/4 w-56 h-56 bg-gradient-to-tl from-gray-350 to-gray-450 rounded-full opacity-12 translate-x-28 translate-y-28"></div>
            {/* Long curved element - top right */}
            <div className="absolute -top-12 -right-24 w-[800px] h-[200px] bg-gradient-to-l from-gray-200 to-transparent rounded-full opacity-15 rotate-12 transform"></div>
          </div>

          {/* Hero Content */}
          <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-8">
            {/* Two-column hero, vertically aligned */}
            <div className="grid lg:grid-cols-2 gap-20 lg:gap-24 items-center">
              {/* Left Column */}
              <div className="max-w-[560px]">
                {/* Badge */}
                <div className="inline-flex items-center px-4 py-1.5 text-sm font-medium text-slate-600 bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-full mb-8 shadow-sm">
                  Ceypos-Solutions
                </div>

                {/* Headline — CeyPOS copy, slightly smaller + tight line-height */}
                <h1 className="text-4xl md:text-5xl lg:text-[56px] xl:text-[64px] font-extrabold text-slate-900 leading-[1.06] tracking-tight max-w-[520px] mb-6">
                  Sell faster
                  <br className="hidden sm:block" />
                  Grow with CeyPOS.
                </h1>

                {/* Subheading — CeyPOS description */}
                <p className="text-base md:text-lg text-slate-600 max-w-[520px] leading-relaxed">
                  CeyPOS is the modern POS built for Sri Lanka—fast billing, real-time inventory,
                  smart reports, and built-in customer marketing. Works on any device, supports LKR,
                  Sinhala/Tamil/English, PayHere payments, and an offline mode that syncs when you're back online.
                </p>
              </div>

              {/* Right Column — email CTA sits level with headline */}
              <div className="relative self-center -mt-2">
                {/* Small decorative icon (subtle accent) */}
               <div className="absolute -top-4 left-4 text-slate-400/70" aria-hidden="true">
                  🖤
                </div>

                {/* Caption tighter above input (match target placement) */}
                <p className="text-sm text-slate-600 mb-2">
                  30 Day Free Trial No Credit Card Required:
                </p>

                {/* Email input + CTA */}
                <div className="w-full max-w-[440px]">
                  <div className="relative flex items-center bg-white rounded-full shadow-[0_10px_30px_-10px_rgba(2,6,23,0.12)] ring-1 ring-slate-200 overflow-hidden">
                    <input
                      type="email"
                      placeholder="Enter your work email"
                      className="flex-1 h-12 md:h-14 px-5 md:px-6 bg-transparent text-slate-900 placeholder-slate-400 border-0 focus:outline-none focus:ring-0"
                    />
                    <button className="shrink-0 h-10 md:h-11 px-5 md:px-6 m-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-full transition-all duration-200">
                      Get Started
                    </button>
                  </div>
                  {/* Helper text under input (optional) */}
                  <p className="mt-2 text-xs text-slate-500">
                    LKR pricing · Local tax/VAT options · Cancel anytime
                  </p>
                </div>
              </div>
            </div>

            {/* Large analytics/dashboard card BELOW the two columns */}
            <div className="mt-16 lg:mt-20">
              <div className="rounded-[32px] border border-slate-200 bg-white shadow-[0_20px_60px_-12px_rgba(2,6,23,0.12)] overflow-hidden mx-auto max-w-5xl">
                {/* Replace with an actual CeyPOS dashboard/checkout mock */}
                <img
                  src="https://placehold.co/1100x520/f8fafc/0f172a?text=CeyPOS+Analytics/Dashboard+Preview"
                  alt="CeyPOS dashboard preview"
                  className="block w-full h-auto"
                />
              </div>
            </div>
          </div>
        </section>
        {/* === END: Hero Section === */}
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
};

export default Home;