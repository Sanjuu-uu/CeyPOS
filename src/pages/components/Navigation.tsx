import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { buildRegisterHref, persistAccountIntent } from "../../lib/authFlow";
import { APP_ROUTES } from "../../lib/routes";

const Navigation: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const startMenuRef = useRef<HTMLDivElement>(null);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const handleLoginClick = () => {
    window.location.href = APP_ROUTES.login;
    closeMobileMenu();
  };

  const goToRegister = (intent: "owner" | "employee") => {
    persistAccountIntent(intent);
    window.location.href = buildRegisterHref(intent);
    closeMobileMenu();
    setIsStartMenuOpen(false);
  };

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (
        startMenuRef.current &&
        !startMenuRef.current.contains(e.target as Node)
      ) {
        setIsStartMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const StartDropdown = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`relative ${mobile ? "w-full" : ""}`} ref={mobile ? undefined : startMenuRef}>
      <button
        type="button"
        onClick={() => setIsStartMenuOpen((open) => !open)}
        className={
          mobile
            ? "flex w-full items-center justify-center gap-2 bg-[#D8FA50] hover:bg-[#C5F542] text-gray-900 font-semibold text-sm px-5 py-3 rounded-full transition-all duration-200 shadow-sm"
            : "inline-flex items-center gap-1.5 bg-[#D8FA50] hover:bg-[#C5F542] text-gray-900 font-semibold text-sm px-5 py-1.5 rounded-full transition-all duration-200 shadow-sm"
        }
      >
        Let&apos;s Start
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isStartMenuOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isStartMenuOpen && (
        <div
          className={`absolute ${mobile ? "left-0 right-0 mt-2" : "right-0 mt-2 w-64"} rounded-xl border border-gray-200 bg-white py-2 shadow-lg z-[120]`}
        >
          <button
            type="button"
            onClick={() => goToRegister("owner")}
            className="block w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
          >
            <span className="block text-sm font-semibold text-gray-900">
              Sign up as Owner / Manager
            </span>
            <span className="block text-xs text-gray-500 mt-0.5">
              Create and manage your shop
            </span>
          </button>
          <button
            type="button"
            onClick={() => goToRegister("employee")}
            className="block w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-t border-gray-100"
          >
            <span className="block text-sm font-semibold text-gray-900">
              Sign up as Employee
            </span>
            <span className="block text-xs text-gray-500 mt-0.5">
              Join an existing shop terminal
            </span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <a href={APP_ROUTES.home} className="flex items-center">
                <span className="text-xl font-bold text-slate-900">CeyPOS</span>
              </a>
            </div>

            <nav className="hidden md:flex items-center space-x-8">
              <a href={APP_ROUTES.about} className="text-gray-700 hover:text-gray-900 font-medium text-sm transition-colors duration-200">
                About
              </a>
              <a href={APP_ROUTES.features} className="text-gray-700 hover:text-gray-900 font-medium text-sm transition-colors duration-200">
                Features
              </a>
              <a href={APP_ROUTES.pricing} className="text-gray-700 hover:text-gray-900 font-medium text-sm transition-colors duration-200">
                Pricing
              </a>
              <a href={APP_ROUTES.support} className="text-gray-700 hover:text-gray-900 font-medium text-sm transition-colors duration-200">
                Support
              </a>
            </nav>

            <div className="flex items-center space-x-3">
              <div className="hidden md:flex items-center space-x-3">
                <button
                  onClick={handleLoginClick}
                  className="text-gray-700 hover:text-gray-900 font-medium text-sm px-4 py-1.5 rounded-full border border-gray-200 hover:border-gray-300 transition-all duration-200 cursor-pointer"
                >
                  Login
                </button>
                <StartDropdown />
              </div>

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden flex flex-col justify-center items-center w-6 h-6 space-y-1 relative z-60"
              >
                <div className={`w-5 h-0.5 bg-gray-600 transition-all duration-300 ${isMobileMenuOpen ? "rotate-45 translate-y-1.5" : ""}`}></div>
                <div className={`w-5 h-0.5 bg-gray-600 transition-all duration-300 ${isMobileMenuOpen ? "opacity-0" : ""}`}></div>
                <div className={`w-5 h-0.5 bg-gray-600 transition-all duration-300 ${isMobileMenuOpen ? "-rotate-45 -translate-y-1.5" : ""}`}></div>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className={`fixed inset-0 z-[100] md:hidden transition-all duration-300 ${isMobileMenuOpen ? "visible opacity-100" : "invisible opacity-0"}`}>
        <div
          className={`absolute inset-0 bg-black transition-opacity duration-300 ${isMobileMenuOpen ? "bg-opacity-50" : "bg-opacity-0"}`}
          onClick={closeMobileMenu}
        ></div>
        <div className={`absolute top-0 left-0 right-0 bg-white shadow-lg transform transition-transform duration-300 ${isMobileMenuOpen ? "translate-y-0" : "-translate-y-full"}`}>
          <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center h-16">
            <span className="text-xl font-bold text-slate-900">CeyPOS</span>
            <button
              onClick={closeMobileMenu}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div className="px-6 py-6">
            <div className="space-y-6">
              <a onClick={closeMobileMenu} href={APP_ROUTES.about} className="block text-gray-900 hover:text-gray-600 font-medium text-lg transition-colors duration-200">About</a>
              <a onClick={closeMobileMenu} href={APP_ROUTES.features} className="block text-gray-900 hover:text-gray-600 font-medium text-lg transition-colors duration-200">Features</a>
              <a onClick={closeMobileMenu} href={APP_ROUTES.pricing} className="block text-gray-900 hover:text-gray-600 font-medium text-lg transition-colors duration-200">Pricing</a>
              <a onClick={closeMobileMenu} href={APP_ROUTES.support} className="block text-gray-900 hover:text-gray-600 font-medium text-lg transition-colors duration-200">Support</a>
            </div>
            <div className="mt-8 pt-6 border-t border-gray-100 space-y-4">
              <button
                onClick={handleLoginClick}
                className="block w-full text-center text-gray-700 hover:text-gray-900 font-medium text-sm px-4 py-3 rounded-full border border-gray-200 hover:border-gray-300 transition-all duration-200"
              >
                Login
              </button>
              <StartDropdown mobile />
            </div>
          </div>
        </div>
      </div>
      {isMobileMenuOpen && (
        <style>{`body { overflow: hidden; }`}</style>
      )}
    </>
  );
};

export default Navigation;
