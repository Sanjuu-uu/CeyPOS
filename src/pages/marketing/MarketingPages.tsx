import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Check,
  Cloud,
  CreditCard,
  Headphones,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Users,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { buildRegisterHref, persistAccountIntent } from "../../lib/authFlow";
import { APP_ROUTES } from "../../lib/routes";
import { setupMarketingMotion } from "./marketingMotion.js";
import "./marketing.css";

import bgVideo from "../home/bg.mp4";
import heroBg from "../../assets/webflow/main-20background.png";
import dashboard from "../../assets/webflow/dashboard-p-1080.png";
import heroPattern from "../../assets/webflow/hero-20background-p-1600.png";
import productHero from "../../assets/webflow/product-20hero-20image-p-1080.png";
import featureImage from "../../assets/webflow/feature-20image-p-800.png";
import benefitsImage from "../../assets/webflow/benefits-20image-2001-p-800.png";
import benefitImage2 from "../../assets/webflow/benefit-20image-2002-p-800.png";
import benefitImage3 from "../../assets/webflow/benefit-20image-2003-p-800.png";
import tabImage from "../../assets/webflow/tab-20image-p-1080.png";
import tabBackground from "../../assets/webflow/tab-20background-p-1600.png";
import sectionPattern from "../../assets/webflow/section-20dark-20pattern-p-1080.png";
import ctaLeft from "../../assets/webflow/cta-20left.png";
import ctaRight from "../../assets/webflow/cta-20right.png";
import contactPattern from "../../assets/webflow/contact-20card-20pattern.png";
import dividerImage from "../../assets/webflow/divider-20image.png";
import mainAvatar from "../../assets/webflow/main-20avatar.png";
import avatar1 from "../../assets/webflow/avatar-2001.png";
import avatar2 from "../../assets/webflow/avatar-2002.png";
import author1 from "../../assets/webflow/author-2001.png";
import author2 from "../../assets/webflow/author-2002.png";
import partner1 from "../../assets/webflow/partner-20image-2001.png";
import partner2 from "../../assets/webflow/partner-20image-2002.png";
import partner3 from "../../assets/webflow/partner-20image-2003.png";
import blog1 from "../../assets/webflow/blog-2001-p-800.png";
import blog2 from "../../assets/webflow/blog-2002-p-800.png";
import blog3 from "../../assets/webflow/blog-2003-p-800.png";

type Feature = {
  icon: React.ReactNode;
  title: string;
  body: string;
};

const startOwner = () => {
  persistAccountIntent("owner");
  window.location.href = buildRegisterHref("owner");
};

const features: Feature[] = [
  {
    icon: <ScanLine size={20} />,
    title: "Fast POS checkout",
    body: "Barcode scanning, keyboard shortcuts, receipt printing, customer lookup, and staff attribution in one clean terminal flow.",
  },
  {
    icon: <Package size={20} />,
    title: "Live inventory control",
    body: "Track stock, suppliers, purchase orders, adjustments, returns, low-stock thresholds, and real-time terminal reservations.",
  },
  {
    icon: <Smartphone size={20} />,
    title: "Mobile sessions",
    body: "Use phone-based checkout and barcode sessions for flexible shop-floor selling without losing terminal control.",
  },
  {
    icon: <Users size={20} />,
    title: "Team terminals",
    body: "Owner, manager, and cashier roles with paired register terminals and scoped access for safer multi-staff operations.",
  },
  {
    icon: <BarChart3 size={20} />,
    title: "Business analytics",
    body: "Sales, customer, inventory, and staff insights designed for everyday retail decisions rather than spreadsheet digging.",
  },
  {
    icon: <ShieldCheck size={20} />,
    title: "Tenant-safe by design",
    body: "Shop-scoped authentication, receipt token hardening, and role-aware APIs keep each merchant’s data isolated.",
  },
];

const faqs = [
  ["Can CeyPOS run in a real shop?", "Yes. It is built around terminal checkout, inventory sync, receipts, team accounts, and owner setup flows."],
  ["Does it support multiple terminals?", "Yes. Register terminals share stock/reservation updates in real time so cashiers can work without clashes."],
  ["Can employees sign up separately?", "Yes. Employees join existing shops through the team onboarding and terminal pairing flow."],
  ["Can I replace the website screenshots later?", "Yes. The marketing pages use assets from `src/assets/webflow`, so you can replace images without rewriting layout."],
];

const plans = [
  {
    name: "Starter",
    price: "Free",
    cta: "Start Free",
    body: "For testing a single shop workflow.",
    features: ["Owner setup", "Core POS", "Inventory basics", "Digital receipts"],
  },
  {
    name: "Plus",
    price: "$24",
    cta: "Get Started",
    body: "For growing shops with staff and registers.",
    featured: true,
    features: ["Team accounts", "Register terminals", "Mobile sessions", "Reports & payments"],
  },
  {
    name: "Pro",
    price: "$64",
    cta: "Talk to Us",
    body: "For multi-branch operations and advanced analytics.",
    features: ["Advanced analytics", "AI insights", "Priority support", "Custom workflows"],
  },
];

const journeySteps = [
  {
    step: "01",
    title: "Create your shop",
    body: "Owners start with the shop wizard, business profile, currency, tax defaults, and first terminal path.",
  },
  {
    step: "02",
    title: "Load inventory",
    body: "Import products, barcode labels, categories, suppliers, reorder thresholds, and opening stock counts.",
  },
  {
    step: "03",
    title: "Invite the team",
    body: "Managers and cashiers join with scoped access, paired terminals, and safe employee onboarding.",
  },
  {
    step: "04",
    title: "Sell with confidence",
    body: "Checkout, receipts, stock reservations, and analytics stay synchronized across every active register.",
  },
];

const modules = [
  ["POS Terminal", "Fast item search, barcode scan, cart actions, discounts, returns, and split payment-ready flows."],
  ["Inventory Hub", "Stock movements, purchase batches, low-stock states, import/export, and terminal-safe reservations."],
  ["Team & Roles", "Owner, manager, cashier, and terminal scopes keep sensitive shop actions separated."],
  ["Receipts", "Public receipt lookup, email and SMS delivery, hardened receipt tokens, and printer-friendly layouts."],
  ["Customers", "Attach customers to transactions, inspect buying history, and prepare loyalty workflows."],
  ["Analytics", "See sales, inventory pressure, revenue movement, staff activity, and operational signals quickly."],
];

const trustQuotes = [
  ["The counter flow feels fast enough for rush hour.", "Cashier workflow"],
  ["Inventory updates stopped fighting between terminals.", "Realtime sync"],
  ["The owner dashboard gives us the full picture without spreadsheets.", "Business visibility"],
];

const comparisonRows = [
  ["Single-tenant demo POS", "Manual checks", "CeyPOS market-ready path"],
  ["Shop identity", "Stored loosely in local state", "Canonical shop context with server verification"],
  ["Checkout stock", "Terminal clashes are common", "Reservation-aware realtime updates"],
  ["Employees", "Shared owner login", "Separate onboarding, roles, and terminal pairing"],
  ["Receipts", "Local print only", "Tokenized public receipts with email/SMS paths"],
  ["Growth", "Hard to audit", "Analytics, support, pricing, and launch pages"],
];

function MarketingNav() {
  return (
    <nav className="wf-nav">
      <div className="wf-shell wf-nav-inner">
        <Link to={APP_ROUTES.home} className="wf-logo">
          <span className="wf-logo-mark">C</span>
          CeyPOS
        </Link>
        <div className="wf-nav-links">
          <Link className="wf-nav-link" to={APP_ROUTES.about}>About</Link>
          <Link className="wf-nav-link" to={APP_ROUTES.features}>Product</Link>
          <Link className="wf-nav-link" to={APP_ROUTES.pricing}>Pricing</Link>
          <Link className="wf-nav-link" to={APP_ROUTES.contact}>Contact</Link>
        </div>
        <div className="wf-nav-actions">
          <Link className="wf-btn wf-btn-outline" to={APP_ROUTES.login}>Login</Link>
          <button type="button" onClick={startOwner} className="wf-btn wf-btn-primary">
            Get Started <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </nav>
  );
}

function MarketingFooter() {
  return (
    <footer className="wf-footer">
      <div className="wf-shell">
        <div className="wf-footer-grid">
          <div>
            <Link to={APP_ROUTES.home} className="wf-logo">
              <span className="wf-logo-mark">C</span>
              CeyPOS
            </Link>
            <p className="wf-lede" style={{ marginTop: 18 }}>
              A market-ready POS foundation for Sri Lankan retailers: checkout, inventory, teams, terminals, and receipts.
            </p>
          </div>
          <div className="wf-footer-links">
            <div>
              <h4 className="wf-font text-base font-semibold">Product</h4>
              <div className="mt-4 grid gap-3 text-sm">
                <Link to={APP_ROUTES.features}>Features</Link>
                <Link to={APP_ROUTES.pricing}>Pricing</Link>
                <Link to={APP_ROUTES.support}>Support</Link>
              </div>
            </div>
            <div>
              <h4 className="wf-font text-base font-semibold">Company</h4>
              <div className="mt-4 grid gap-3 text-sm">
                <Link to={APP_ROUTES.about}>About</Link>
                <Link to={APP_ROUTES.contact}>Contact</Link>
                <a href="#insights">Insights</a>
              </div>
            </div>
            <div>
              <h4 className="wf-font text-base font-semibold">Pages</h4>
              <div className="mt-4 grid gap-3 text-sm">
                <Link to={APP_ROUTES.login}>Login</Link>
                <Link to={APP_ROUTES.register}>Register</Link>
                <button type="button" onClick={startOwner} className="text-left">Get Started</button>
              </div>
            </div>
          </div>
        </div>
        <div className="relative z-[1] flex flex-col gap-3 pt-7 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} CeyPOS. Built by Ceynode.</p>
          <div className="flex gap-5">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  useEffect(() => setupMarketingMotion(), []);

  return (
    <div className="wf-marketing wf-ancestor min-h-screen">
      <div className="wf-page-background" aria-hidden="true">
        <div className="wf-page-background-image" />
      </div>
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}

function Hero({
  eyebrow = "CEYPOS SAAS TEMPLATE",
  title,
  body,
  image = dashboard,
  art = "dashboard",
}: {
  eyebrow?: string;
  title: string;
  body: string;
  image?: string;
  art?: "dashboard" | "product";
}) {
  return (
    <section className="wf-hero">
      <div className="wf-shell wf-hero-grid">
        <div className="wf-reveal">
          <span className="wf-badge">{eyebrow}</span>
          <h1 className="wf-title-xl">{title}</h1>
          <p className="wf-lede">{body}</p>
          <div className="wf-hero-actions">
            <button type="button" onClick={startOwner} className="wf-btn wf-btn-dark">
              30 Day Free Trial <ArrowRight size={16} />
            </button>
            <Link to={APP_ROUTES.features} className="wf-btn wf-btn-outline">
              Explore Product
            </Link>
          </div>
        </div>
        <div className="wf-hero-art wf-reveal wf-reveal-delay-1">
          <img className="wf-hero-bg" src={art === "product" ? heroPattern : heroBg} alt="" />
          <div className="wf-float-card wf-float">
            <div className="text-xs uppercase tracking-[0.18em] text-gray-300">Live shops</div>
            <div className="wf-font mt-2 text-3xl font-semibold text-white">3.5k+</div>
          </div>
          <div className="wf-dashboard-card">
            <img src={image} alt="CeyPOS interface preview" />
          </div>
        </div>
      </div>
    </section>
  );
}

function VideoSectionHeader() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  const toggleVideo = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      await video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="wf-iron-video" data-wf-motion="hero-stage" data-wf-parallax="22" data-wf-scale="0.02">
      <video ref={videoRef} src={bgVideo} autoPlay muted loop playsInline preload="metadata" />
      <div className="wf-iron-video-shade" />
      <div className="wf-iron-video-card top">
        <span>This month</span>
        <strong>04</strong>
        <small>New terminals</small>
      </div>
      <div className="wf-iron-video-card left">
        <strong>340k</strong>
        <small>Items synced</small>
      </div>
      <div className="wf-iron-video-card right">
        <strong>99.1%</strong>
        <small>Checkout uptime</small>
      </div>
      <button type="button" className="wf-video-control" onClick={toggleVideo} aria-label={isPlaying ? "Pause video" : "Play video"}>
        <span>{isPlaying ? "Pause video" : "Play video"}</span>
      </button>
    </div>
  );
}

function VideoHero() {
  return (
    <section className="wf-luvy-hero wf-ancestor-home-hero">
      <div className="wf-shell">
        <div className="wf-luvy-heading-grid wf-ancestor-hero-layout">
          <div data-wf-motion="hero-copy">
            <span className="wf-badge">CEYPOS SAAS TEMPLATE</span>
            <h1 className="wf-title-xl">Our cutting-edge retail POS solutions</h1>
            <p className="wf-lede">
              A market-ready point-of-sale workspace for checkout, stock, staff, terminals, receipts, and analytics, rebuilt with spacious motion and polished product storytelling.
            </p>
          </div>

          <div className="wf-luvy-trial" data-wf-motion="fade-up">
            <p>30 Day Free Trial No Credit Card Required:</p>
            <form
              className="wf-trial-form"
              onSubmit={(event) => {
                event.preventDefault();
                startOwner();
              }}
            >
              <input placeholder="Enter your email" type="email" aria-label="Email address" />
              <button type="submit">Get Started</button>
            </form>
            <div className="wf-ancestor-hero-note" data-wf-motion="card">
              <p>
                "A POS should feel calm at the counter, strict at the API, and clear enough for owners to trust every sale."
              </p>
              <div>
                <img src={mainAvatar} alt="" />
                <span>
                  <strong>CeyPOS launch desk</strong>
                  <small>Retail operating system</small>
                </span>
              </div>
            </div>
          </div>
        </div>

        <VideoSectionHeader />

        <div className="wf-luvy-dashboard-holder" data-wf-motion="hero-stage" data-wf-parallax="34" data-wf-scale="0.025">
          <div className="wf-ancestor-float-panel v1" data-wf-parallax="-24" data-ancestor-float>
            <span>Live terminals</span>
            <strong>24</strong>
          </div>
          <div className="wf-ancestor-float-panel v2" data-wf-parallax="18" data-ancestor-float>
            <span>Stock sync</span>
            <strong>0.2s</strong>
          </div>
          <div className="wf-luvy-dashboard-outline">
            <div className="wf-luvy-dashboard-wrap">
              <div className="wf-luvy-dashboard-media">
                <img src={dashboard} alt="CeyPOS dashboard preview" />
              </div>
            </div>
          </div>
        </div>

        <div className="wf-luvy-stat-row" data-wf-motion="hero-stats">
          {[
            ["CLIENT RETENTION", "98%"],
            ["MONTHLY TRANSACTIONS", "1.2M"],
            ["LOCATIONS POWERED", "3.5k"],
            ["SALES VOLUME LKR", "458M"],
          ].map(([label, value]) => (
            <div className="wf-luvy-stat" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div className="wf-luvy-divider" data-wf-line aria-hidden="true">
          <div><span /><i /><i /><i /></div>
          <img src={dividerImage} alt="" />
          <div><i /><i /><i /><span /></div>
        </div>
      </div>
      <img className="wf-luvy-hero-bg" src={heroPattern} alt="" aria-hidden="true" />
    </section>
  );
  /*
  return (
    <section className="wf-video-hero">
      <div className="wf-video-hero-bg" aria-hidden="true">
        <video src={bgVideo} autoPlay muted loop playsInline preload="metadata" />
        <div className="wf-video-hero-glow wf-glow-one" data-wf-parallax="22" />
        <div className="wf-video-hero-glow wf-glow-two" data-wf-parallax="-18" />
      </div>
      <div className="wf-shell wf-video-hero-inner">
        <div className="wf-video-copy" data-wf-motion="hero-copy">
          <span className="wf-badge">CEYPOS RETAIL OPERATING SYSTEM</span>
          <h1 className="wf-title-xl">Your whole shop, moving in real time.</h1>
          <p className="wf-lede">
            Checkout, inventory, terminals, staff, receipts, analytics, and customer flow —
            wrapped in one fast POS workspace built for real counters.
          </p>
          <div className="wf-hero-actions">
            <button type="button" onClick={startOwner} className="wf-btn wf-btn-dark">
              Start Free Trial <ArrowRight size={16} />
            </button>
            <Link to={APP_ROUTES.features} className="wf-btn wf-btn-outline">
              Watch Product Flow
            </Link>
          </div>
        </div>

        <div
          className="wf-video-stage"
          data-wf-motion="hero-stage"
          data-wf-parallax="36"
          data-wf-scale="0.035"
          data-wf-tilt="2.8"
        >
          <div className="wf-dashboard-outline">
            <div className="wf-dashboard-wrapper">
              <img src={dashboard} alt="CeyPOS dashboard preview" />
            </div>
          </div>
          <div className="wf-metric-pill wf-metric-top" data-wf-parallax="-28">
            <span>Live terminals</span>
            <strong>24</strong>
          </div>
          <div className="wf-metric-pill wf-metric-bottom" data-wf-parallax="26">
            <span>Checkout sync</span>
            <strong>0.2s</strong>
          </div>
        </div>

        <div className="wf-hero-stats" data-wf-motion="hero-stats">
          {[
            ["98%", "Stock accuracy"],
            ["1.2M", "Monthly transactions"],
            ["3.5k", "Locations ready"],
            ["458M", "Sales volume LKR"],
          ].map(([value, label]) => (
            <div className="wf-hero-stat" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div className="wf-divider-motion" data-wf-line aria-hidden="true">
          <span />
          <i />
          <i />
          <i />
          <span />
        </div>
      </div>
    </section>
  );
  */
}

function Stats() {
  return (
    <section className="wf-section-tight">
      <div className="wf-shell wf-stat-grid wf-reveal" data-wf-motion="stagger">
        {[
          ["98%", "Client retention"],
          ["1.2M", "Monthly transactions"],
          ["3.5k", "Locations powered"],
          ["458M", "Sales volume LKR"],
        ].map(([value, label]) => (
          <div className="wf-stat" key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeatureCards({ items = features }: { items?: Feature[] }) {
  return (
    <div className="wf-card-grid">
      {items.map((feature, index) => (
        <article
          className={`wf-card wf-reveal wf-reveal-delay-${Math.min(index, 2)}`}
          data-wf-motion="card"
          data-wf-tilt="1.2"
          key={feature.title}
        >
          <div className="wf-card-inner">
            <div className="wf-icon">{feature.icon}</div>
            <h3>{feature.title}</h3>
            <p>{feature.body}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function ProductDarkBlock() {
  return (
    <section className="wf-section">
      <div className="wf-dark-block wf-luvy-dark" data-wf-motion="dark-block">
        <img className="wf-dark-pattern" data-wf-parallax="-24" src={sectionPattern} alt="" />
        <div className="relative z-[1] mx-auto max-w-[620px] text-center" data-wf-motion="fade-up">
          <span className="wf-badge" style={{ background: "#242628", color: "#f7f8f8" }}>CEYPOS OVERVIEW</span>
          <h2 className="wf-title-lg mt-5">Expedite the speed at which business grows.</h2>
          <p className="mt-5">
            Module cards first, then a polished product frame that can later hold real CeyPOS screenshots.
          </p>
        </div>
        <div className="wf-luvy-tabs" data-wf-motion="card">
          {[
            ["CeyPOS Overview", "Checkout, stock, customers, receipts, and terminal state in one workspace."],
            ["Inventory Hub", "Imports, supplier stock, purchase batches, and low-stock movement."],
            ["Security Dashboard", "Shop-scoped access, employee roles, terminal pairing, and protected APIs."],
            ["Performance Analytics", "Daily revenue, staff activity, stock pressure, and growth signals."],
          ].map(([title, body]) => (
            <article className="wf-luvy-tab-card" key={title}>
              <div>
                <h3>{title}</h3>
                <span><ArrowRight size={16} /></span>
              </div>
              <p>{body}</p>
            </article>
          ))}
        </div>
        <div className="wf-tab-art wf-reveal wf-reveal-delay-1" data-wf-motion="dashboard" data-wf-parallax="30" data-wf-scale="0.025">
          <img src={tabImage} alt="CeyPOS product dashboard" />
        </div>
        <img className="wf-luvy-tab-bg" src={tabBackground} alt="" aria-hidden="true" />
      </div>
    </section>
  );
}

function Benefits() {
  return (
    <section className="wf-section">
      <div className="wf-shell wf-two-col">
        <div className="wf-reveal" data-wf-motion="fade-up">
          <span className="wf-badge">RETAIL OPERATIONS</span>
          <h2 className="wf-title-lg mt-5">Expedite the speed at which your business grows.</h2>
          <p className="wf-lede mt-5">
            CeyPOS keeps the counter fast while giving owners clean visibility over stock, teams, sales, receipts, and customer engagement.
          </p>
          <div className="mt-8 grid gap-4">
            {["Checkout without clashes", "Inventory that reconciles quickly", "Team permissions for real stores"].map((item) => (
              <div className="flex items-center gap-3" key={item}>
                <span className="wf-check"><Check size={13} /></span>
                <span className="text-sm font-medium text-gray-800">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="wf-image-panel wf-reveal wf-reveal-delay-1" data-wf-motion="image" data-wf-parallax="28" data-wf-tilt="1.8">
          <img src={featureImage} alt="Retail dashboard feature preview" />
        </div>
      </div>
    </section>
  );
}

function LuvyBenefitRows() {
  const rows = [
    {
      number: "1",
      title: "Experience seamless checkout with CeyPOS.",
      body: "Cashiers can search, scan, reserve, discount, sell, and issue receipts without leaving the terminal flow.",
      image: benefitsImage,
    },
    {
      number: "2",
      title: "Discover inventory performance before it becomes a problem.",
      body: "Owners can see live stock, adjustments, product movement, and terminal reservations without refreshing the browser.",
      image: benefitImage2,
      flip: true,
    },
    {
      number: "3",
      title: "Boost your team’s performance with safer roles.",
      body: "Employees join through guided onboarding, while sensitive shop routes stay protected by Clerk, terminal scopes, and tenant checks.",
      image: benefitImage3,
    },
  ];

  return (
    <section className="wf-section wf-luvy-benefits">
      <div className="wf-shell">
        {rows.map((row) => {
          const card = (
            <article className="wf-luvy-benefit-card wf-ancestor-card" data-wf-motion="card">
              <span>{row.number}</span>
              <h3>{row.title}</h3>
              <p>{row.body}</p>
              <Link to={APP_ROUTES.features} className="wf-btn wf-btn-primary">Find Out More</Link>
            </article>
          );
          const image = (
            <div className="wf-luvy-benefit-image" data-wf-motion="image" data-wf-parallax={row.flip ? "-20" : "20"}>
              <img src={row.image} alt="" />
            </div>
          );

          return (
            <div className="wf-luvy-benefit-row" key={row.number}>
              {row.flip ? image : card}
              {row.flip ? card : image}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ProductDetails() {
  return (
    <section className="wf-section">
      <div className="wf-dark-block wf-luvy-details" data-wf-motion="dark-block">
        <img className="wf-dark-pattern" data-wf-parallax="-22" src={sectionPattern} alt="" />
        <div className="wf-section-heading center relative z-[1]">
          <h2 className="wf-title-lg">CeyPOS — the details overview of the product.</h2>
          <p className="wf-lede mx-auto">A direct answer to what buyers need to believe before launch: uptime, speed, terminal consistency, and clear owner visibility.</p>
        </div>
        <div className="wf-luvy-detail-grid relative z-[1]">
          {[
            ["99.9%", "Realtime checkout and inventory services designed for always-on counters."],
            ["'26", "Market launch path with secured routes, employee flows, and production readiness."],
            ["1.6M", "Transaction-scale UI and API patterns prepared for high-volume retail data."],
            ["0.06s", "Fast local UI response for search, cart updates, and stock availability display."],
          ].map(([value, body]) => (
            <article className="wf-luvy-detail-card" data-wf-motion="card" key={value}>
              <h3>{value}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SocialProofWall() {
  const cards = [
    [author1, "John Smith", "Founder, Retail Chain", "CeyPOS gives the counter team a fast workflow and gives owners the data they need after closing."],
    [avatar1, "Sadie Berlin", "@retailops", "Inventory, receipts, and terminal sync finally feel like one system instead of three separate chores."],
    [author2, "Kevin Logan", "@storelead", "The employee onboarding and protected shop flows are exactly what a serious POS launch needs."],
    [avatar2, "Nimali Perera", "@cashierdesk", "Fast search and clean checkout are the difference between a calm queue and a messy one."],
    [mainAvatar, "CeyPOS Team", "Launch partner", "Replace these testimonial cards later with real merchant quotes and local shop stories."],
  ];

  return (
    <section className="wf-section">
      <div className="wf-shell">
        <div className="wf-section-heading center" data-wf-motion="fade-up">
          <span className="wf-badge mx-auto">TECH LEADERS' HUB</span>
          <h2 className="wf-title-lg">Connecting shops to smarter retail networks.</h2>
        </div>
        <div className="wf-luvy-social-grid wf-ancestor-testimonial-wall">
          {cards.map(([img, name, role, quote]) => (
            <article className="wf-luvy-social-card" data-wf-motion="card" key={name}>
              <div>
                <img src={img} alt="" />
                <span>
                  <strong>{name}</strong>
                  <small>{role}</small>
                </span>
              </div>
              <p>{quote}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingCards() {
  return (
    <div className="wf-pricing-grid">
      {plans.map((plan) => (
        <article className={`wf-pricing-card ${plan.featured ? "featured" : ""}`} data-wf-motion="card" key={plan.name}>
          {plan.featured && <span className="absolute right-5 top-5 rounded-md bg-gray-950 px-2 py-1 text-xs font-semibold text-white">Popular</span>}
          <div className="wf-pricing-inner">
            <h3 className="wf-font text-2xl font-semibold">{plan.name}</h3>
            <p className="mt-3">{plan.body}</p>
            <div className="wf-price">{plan.price}</div>
            <p>{plan.price === "Free" ? "Trial workspace" : "Per month"}</p>
            <ul className="wf-check-list">
              {plan.features.map((feature) => (
                <li key={feature}><span className="wf-check"><Check size={13} /></span>{feature}</li>
              ))}
            </ul>
            <button type="button" onClick={startOwner} className={`wf-btn w-full ${plan.featured ? "wf-btn-dark" : "wf-btn-primary"}`}>
              {plan.cta}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function FAQ() {
  return (
    <section className="wf-section">
      <div className="wf-shell">
        <div className="mx-auto mb-12 max-w-[620px] text-center" data-wf-motion="fade-up">
          <span className="wf-badge mx-auto">QUESTIONS & ANSWERS</span>
          <h2 className="wf-title-lg mt-5">Frequently Asked Questions</h2>
          <p className="wf-lede mx-auto mt-4">Quick answers to the questions merchants usually ask before going live.</p>
        </div>
        <div className="wf-faq-grid">
          {faqs.map(([q, a]) => (
            <article className="wf-faq-card" data-wf-motion="card" key={q}>
              <h3>{q}</h3>
              <p>{a}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="wf-section-tight">
      <div className="wf-shell wf-cta">
        <img className="wf-cta-pattern-left" src={ctaLeft} alt="" />
        <img className="wf-cta-pattern-right" src={ctaRight} alt="" />
        <div className="relative z-[1]">
          <span className="wf-badge mx-auto" style={{ background: "#242628", color: "#f7f8f8" }}>LET&apos;S TRY</span>
          <h2 className="wf-title-lg mt-5">Start your 7-day free trial</h2>
          <p>Give CeyPOS a try and see how the checkout, inventory, and terminal workflow feels in your own shop.</p>
          <div className="mt-7 flex justify-center">
            <button type="button" onClick={startOwner} className="wf-btn wf-btn-primary">
              Get Started <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function PartnerStrip() {
  const logos = [partner1, partner2, partner3, partner1, partner2];

  return (
    <section className="wf-section-tight">
      <div className="wf-shell">
        <div className="wf-partner-strip" data-wf-motion="fade-up">
          <span>Trusted workflow foundation for retail teams</span>
          <div className="wf-partner-marquee">
            <div className="wf-partner-track">
              {[...logos, ...logos].map((img, index) => (
                <img src={img} alt="Partner logo" key={`${img}-${index}`} aria-hidden={index >= logos.length} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Journey() {
  const images = [productHero, featureImage, benefitImage2, benefitsImage];

  return (
    <section className="wf-section">
      <div className="wf-shell">
        <div className="wf-section-heading" data-wf-motion="fade-up">
          <span className="wf-badge">LAUNCH JOURNEY</span>
          <h2 className="wf-title-lg">From first setup to live checkout.</h2>
          <p className="wf-lede">
            The website now mirrors the example site rhythm: large opening story, deep product education, trust blocks, process cards, and repeated calls to action.
          </p>
        </div>
        <div className="wf-journey-grid">
          {journeySteps.map((item, index) => (
            <article className="wf-journey-card" data-wf-motion="card" key={item.step}>
              <div className="wf-ancestor-process-image">
                <img src={images[index]} alt="" />
              </div>
              <span>{item.step}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function AncestorWorks() {
  const works = [
    ["Counter Flow", "Fast search, scanning, cart controls, payment handoff, and receipt completion in one focused terminal.", ["POS", "Checkout"], dashboard],
    ["Stock Control", "Inventory, reservations, batches, thresholds, suppliers, and movement history kept readable for owners.", ["Inventory", "Realtime"], featureImage],
    ["Team Launch", "Owner, manager, cashier, and employee onboarding paths presented as one market-ready operating story.", ["Roles", "Security"], benefitImage3],
  ];

  return (
    <section className="wf-section">
      <div className="wf-shell">
        <div className="wf-section-heading" data-wf-motion="fade-up">
          <span className="wf-badge">SELECTED WORKFLOWS</span>
          <h2 className="wf-title-lg">Product stories that move like the reference site.</h2>
        </div>
        <div className="wf-ancestor-works">
          {works.map(([title, body, tags, image], index) => (
            <article className="wf-ancestor-work" data-wf-motion="card" data-wf-parallax={index % 2 === 0 ? "10" : "-10"} key={String(title)}>
              <div>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{String(title)}</h3>
                <p>{String(body)}</p>
                <div className="wf-ancestor-tags">
                  {(tags as string[]).map((tag) => <small key={tag}>{tag}</small>)}
                </div>
              </div>
              <img src={String(image)} alt="" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SplitShowcase({
  flip = false,
  eyebrow,
  title,
  body,
  image,
  points,
}: {
  flip?: boolean;
  eyebrow: string;
  title: string;
  body: string;
  image: string;
  points: string[];
}) {
  const copy = (
    <div data-wf-motion="fade-up">
      <span className="wf-badge">{eyebrow}</span>
      <h2 className="wf-title-lg mt-5">{title}</h2>
      <p className="wf-lede mt-5">{body}</p>
      <div className="wf-point-list">
        {points.map((point) => (
          <div className="wf-point" key={point}>
            <span className="wf-check"><Check size={13} /></span>
            <p>{point}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const art = (
    <div className="wf-showcase-art" data-wf-motion="image" data-wf-parallax={flip ? "-26" : "26"} data-wf-tilt="1.4">
      <img src={image} alt="" />
      <div className="wf-showcase-chip">Live workflow</div>
    </div>
  );

  return (
    <section className="wf-section">
      <div className="wf-shell wf-two-col">
        {flip ? art : copy}
        {flip ? copy : art}
      </div>
    </section>
  );
}

function ModuleMatrix() {
  return (
    <section className="wf-section">
      <div className="wf-shell">
        <div className="wf-section-heading center" data-wf-motion="fade-up">
          <span className="wf-badge mx-auto">CONNECTED MODULES</span>
          <h2 className="wf-title-lg">One operating system, not scattered tools.</h2>
          <p className="wf-lede mx-auto">
            Each module is designed to feed the next one, so the cashier flow, stock flow, owner flow, and customer flow stay aligned.
          </p>
        </div>
        <div className="wf-module-grid">
          {modules.map(([title, body], index) => (
            <article className="wf-module-card" data-wf-motion="card" key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustWall() {
  return (
    <section className="wf-section-tight">
      <div className="wf-shell">
        <div className="wf-trust-wall" data-wf-motion="dark-block">
          <img className="wf-dark-pattern" src={sectionPattern} alt="" data-wf-parallax="-20" />
          <div className="wf-section-heading center relative z-[1]">
            <span className="wf-badge mx-auto" style={{ background: "#242628", color: "#f7f8f8" }}>SHOP FLOOR SIGNALS</span>
            <h2 className="wf-title-lg">Built for the moments where POS cannot blink.</h2>
          </div>
          <div className="wf-trust-grid">
            {trustQuotes.map(([quote, label]) => (
              <article className="wf-trust-card" data-wf-motion="card" key={quote}>
                <p>"{quote}"</p>
                <span>{label}</span>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Comparison() {
  return (
    <section className="wf-section">
      <div className="wf-shell">
        <div className="wf-section-heading" data-wf-motion="fade-up">
          <span className="wf-badge">WHY THIS MATTERS</span>
          <h2 className="wf-title-lg">The market version needs complete flows.</h2>
          <p className="wf-lede">
            The long landing page now explains the same story your app architecture is moving toward: secured tenants, reliable terminals, and smooth operations.
          </p>
        </div>
        <div className="wf-comparison" data-wf-motion="dashboard">
          {comparisonRows.map((row, index) => (
            <div className={index === 0 ? "heading" : ""} key={row.join("-")}>
              {row.map((cell) => (
                <span key={cell}>{cell}</span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingDeepDive() {
  return (
    <section className="wf-section">
      <div className="wf-shell wf-pricing-deep">
        {[
          ["Starter", "Validate your first branch, product setup, checkout, and receipt flow."],
          ["Plus", "Run staff terminals with realtime reservations, analytics, and daily operations."],
          ["Pro", "Prepare multi-branch expansion, deeper reporting, priority support, and custom workflows."],
        ].map(([title, body]) => (
          <article className="wf-pricing-deep-card" data-wf-motion="card" key={title}>
            <h3>{title}</h3>
            <p>{body}</p>
            <button type="button" onClick={startOwner} className="wf-btn wf-btn-outline">Choose {title}</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function SupportTracks() {
  return (
    <section className="wf-section">
      <div className="wf-shell wf-card-grid">
        {[
          ["Launch checklist", "Shop profile, users, terminals, inventory import, payment methods, receipts, and first sale."],
          ["Troubleshooting", "Clear paths for WebSocket, checkout, receipt, employee onboarding, subscription, and stock sync issues."],
          ["Operational training", "Short guides for owner, manager, cashier, and support/admin workflows before market launch."],
        ].map(([title, body]) => (
          <article className="wf-card" data-wf-motion="card" key={title}>
            <div className="wf-card-inner">
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function MarketingHome() {
  return (
    <PageShell>
      <VideoHero />
      <ProductDarkBlock />
      <LuvyBenefitRows />
      <ProductDetails />
      <AncestorWorks />
      <PartnerStrip />
      <SocialProofWall />
      <section id="insights" className="wf-section">
        <div className="wf-shell">
          <div className="mb-12 max-w-[680px]" data-wf-motion="fade-up">
            <span className="wf-badge">INSIGHTS & UPDATES</span>
            <h2 className="wf-title-lg mt-5">Marketing-ready content blocks.</h2>
          </div>
          <div className="wf-card-grid">
            {[
              [blog1, "From counter chaos to connected checkout"],
              [blog2, "Inventory sync that feels calm under pressure"],
              [blog3, "How terminal roles keep shop data safer"],
            ].map(([img, title]) => (
              <article className="wf-card" data-wf-motion="card" data-wf-tilt="1.4" key={title}>
                <div className="wf-card-inner">
                  <img className="mb-5 rounded-xl" src={img} alt="" />
                  <h3>{title}</h3>
                  <p>Replace this later with your real launch story, screenshots, and case studies.</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <FAQ />
      <CTA />
    </PageShell>
  );
}

export function MarketingFeatures() {
  return (
    <PageShell>
      <Hero
        eyebrow="CEYPOS PRODUCT"
        title="Unlock the complete CeyPOS experience."
        body="Rebuilt from the Webflow product page language: large visual product hero, structured feature cards, dark overview block, and FAQ/CTA sections."
        image={productHero}
        art="product"
      />
      <section className="wf-section">
        <div className="wf-shell">
          <div className="mb-12 max-w-[700px]">
            <span className="wf-badge">PRODUCT MODULES</span>
            <h2 className="wf-title-lg mt-5">Revolutionize your shop workflow with connected tools.</h2>
          </div>
          <FeatureCards />
        </div>
      </section>
      <section className="wf-section-tight">
        <div className="wf-shell wf-two-col">
          <div className="wf-image-panel" data-wf-motion="image" data-wf-parallax="24"><img src={benefitsImage} alt="CeyPOS benefits" /></div>
          <div data-wf-motion="fade-up">
            <span className="wf-badge">BENEFITS</span>
            <h2 className="wf-title-lg mt-5">Dynamic flexibility for every terminal.</h2>
            <p className="wf-lede mt-5">Owner dashboard, cashier POS, paired terminals, customer receipts, and stock operations all update through one shop-scoped model.</p>
          </div>
        </div>
      </section>
      <ModuleMatrix />
      <AncestorWorks />
      <SplitShowcase
        eyebrow="TERMINAL SAFETY"
        title="Realtime checkout without stock disappearing from the interface."
        body="The product page now gives a deeper explanation of why CeyPOS protects active carts, releases reservations after sale completion, and keeps authoritative inventory available after sync."
        image={featureImage}
        points={["Reservation-aware checkout", "Terminal identity and role-aware API calls", "Fast recovery after refresh or reconnect"]}
      />
      <ProductDarkBlock />
      <Journey />
      <TrustWall />
      <FAQ />
      <CTA />
    </PageShell>
  );
}

export function MarketingPricing() {
  return (
    <PageShell>
      <section className="wf-section">
        <div className="wf-shell mx-auto max-w-[880px] text-center">
          <span className="wf-badge mx-auto">CEYPOS PRICING</span>
          <h1 className="wf-title-xl mx-auto">Cut costs, save time, and deliver faster checkout.</h1>
          <p className="wf-lede mx-auto">Pricing blocks recreated from the Webflow export with CeyPOS-ready plan copy.</p>
        </div>
      </section>
      <section className="wf-section-tight">
        <div className="wf-shell">
          <PricingCards />
        </div>
      </section>
      <PricingDeepDive />
      <AncestorWorks />
      <section className="wf-section">
        <div className="wf-shell wf-dark-block">
          <div className="relative z-[1] grid gap-8 md:grid-cols-[0.8fr_1.2fr]">
            <div>
              <span className="wf-badge" style={{ background: "#242628", color: "#f7f8f8" }}>COMPARE</span>
              <h2 className="wf-title-lg mt-5">Compare our plans.</h2>
            </div>
            <div className="grid gap-4">
              {["Beautiful landing pages", "Team terminals", "Receipt delivery", "Advanced analytics"].map((row) => (
                <div className="flex items-center justify-between rounded-xl bg-white/5 p-4 text-white" key={row}>
                  <span>{row}</span>
                  <span className="wf-check"><Check size={13} /></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <Comparison />
      <TrustWall />
      <FAQ />
      <CTA />
    </PageShell>
  );
}

export function MarketingAbout() {
  return (
    <PageShell>
      <section className="wf-section">
        <div className="wf-shell wf-two-col">
          <div>
            <span className="wf-badge">CEYPOS ABOUT US</span>
            <h1 className="wf-title-xl">We&apos;re on a mission to power retailers.</h1>
            <p className="wf-lede">We democratize retail technology for small and medium businesses by making reliable POS infrastructure feel simple, beautiful, and approachable.</p>
          </div>
          <div className="wf-card">
            <div className="wf-card-inner">
              <div className="grid grid-cols-3 gap-4">
                {[partner1, partner2, partner3].map((img) => (
                  <img className="rounded-xl bg-gray-50 p-4" src={img} alt="Partner" key={img} />
                ))}
              </div>
              <h3>Built for real shop floors.</h3>
              <p>Checkout should feel fast. Inventory should feel trustworthy. Staff access should feel safe. That is the product north star.</p>
            </div>
          </div>
        </div>
      </section>
      <Stats />
      <AncestorWorks />
      <Journey />
      <section className="wf-section">
        <div className="wf-shell wf-card-grid">
          {[
            [Zap, "Passion", "We obsess over counter speed, simple workflows, and calm operations."],
            [Cloud, "Reliability", "Offline-aware flows and realtime sync keep shops moving."],
            [ShieldCheck, "Trust", "Tenant-safe routes and role scopes protect merchant data."],
          ].map(([Icon, title, body]) => (
            <article className="wf-card" key={String(title)}>
              <div className="wf-card-inner">
                <div className="wf-icon"><Icon size={20} /></div>
                <h3>{String(title)}</h3>
                <p>{String(body)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <SplitShowcase
        eyebrow="OUR STANDARD"
        title="The product should feel calm even when the shop is not."
        body="CeyPOS is being shaped around real retail pressure: noisy counters, impatient customers, stock mistakes, employee handoffs, and owners who need answers quickly."
        image={benefitImage3}
        points={["Clear onboarding for owners and staff", "Operational design before decoration", "Market-ready security and tenant boundaries"]}
      />
      <TrustWall />
      <CTA />
    </PageShell>
  );
}

export function MarketingContact() {
  return (
    <PageShell>
      <section className="wf-section">
        <div className="wf-shell wf-contact-grid">
          <div>
            <span className="wf-badge">CEYPOS CONTACT</span>
            <h1 className="wf-title-xl">Get in touch with our team today.</h1>
            <p className="wf-lede">Tell us what kind of shop you run and which workflow you want to launch first.</p>
            <div className="mt-8 grid gap-4">
              {[
                [Mail, "Email", "hello@ceypossolutions.com"],
                [MessageSquare, "Call us", "+94 00 000 0000"],
                [MapPin, "Address", "Colombo, Sri Lanka"],
              ].map(([Icon, label, value]) => (
                <div className="wf-card" key={String(label)}>
                  <div className="wf-card-inner flex-row items-center gap-4">
                    <div className="wf-icon"><Icon size={20} /></div>
                    <div>
                      <h3 className="!m-0 !text-xl">{String(label)}</h3>
                      <p>{String(value)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <form className="wf-form">
            <img src={contactPattern} alt="" className="mb-4 h-12 w-12" />
            <h2 className="wf-font text-3xl font-semibold text-white">Send a message</h2>
            <p className="mt-2 text-gray-300">This is a styled frontend form. Connect it to your CRM/mailbox when ready.</p>
            <div className="mt-6 grid gap-4">
              <input className="wf-input" placeholder="Full Name" />
              <input className="wf-input" placeholder="Email" type="email" />
              <input className="wf-input" placeholder="Phone Number" />
              <textarea className="wf-input area" placeholder="Message" />
              <button className="wf-btn wf-btn-primary" type="button">Send Message</button>
            </div>
          </form>
        </div>
      </section>
      <SupportTracks />
      <AncestorWorks />
      <SplitShowcase
        eyebrow="CONTACT FLOW"
        title="Turn website interest into a clear launch conversation."
        body="This longer contact page gives prospects confidence before they write to you: what you support, what launch looks like, and how the team thinks about reliability."
        image={contactPattern}
        points={["Ask about shop size and modules", "Route launch questions to the right workflow", "Replace this content later with real sales/support copy"]}
      />
      <FAQ />
      <CTA />
    </PageShell>
  );
}

export function MarketingSupport() {
  return (
    <PageShell>
      <section className="wf-section">
        <div className="wf-shell wf-two-col">
          <div>
            <span className="wf-badge">CEYPOS SUPPORT</span>
            <h1 className="wf-title-xl">Support for launch, setup, and daily operations.</h1>
            <p className="wf-lede">Use this page as a polished support hub while you replace the placeholder copy with your real documentation and videos.</p>
            <div className="wf-hero-actions">
              <Link to={APP_ROUTES.contact} className="wf-btn wf-btn-dark">Contact Support</Link>
              <Link to={APP_ROUTES.features} className="wf-btn wf-btn-outline">View Product</Link>
            </div>
          </div>
          <div className="wf-image-panel"><img src={benefitImage2} alt="Support preview" /></div>
        </div>
      </section>
      <section className="wf-section-tight">
        <div className="wf-shell">
          <FeatureCards
            items={[
              { icon: <Headphones size={20} />, title: "Setup help", body: "Guidance for shop wizard, terminals, employees, and payment setup." },
              { icon: <CreditCard size={20} />, title: "Checkout support", body: "Help with receipts, discounts, cash/card workflows, and terminal pairing." },
              { icon: <Cloud size={20} />, title: "Sync checks", body: "Debugging realtime inventory, database snapshots, and WebSocket connectivity." },
            ]}
          />
        </div>
      </section>
      <section className="wf-section-tight">
        <div className="wf-shell wf-image-panel"><img src={benefitImage3} alt="Support workflow" /></div>
      </section>
      <SupportTracks />
      <Journey />
      <AncestorWorks />
      <Comparison />
      <FAQ />
      <CTA />
    </PageShell>
  );
}
