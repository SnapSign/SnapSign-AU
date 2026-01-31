import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleOpenPdf = () => {
    // Track analytics event
    if (window.gtag) {
      window.gtag('event', 'home_open_pdf_click', {
        event_category: 'engagement',
        event_label: 'homepage_open_pdf'
      });
    }
    
    // Create a hidden file input to trigger file selection
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,application/pdf';
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file && file.type === 'application/pdf') {
        // Create object URL and navigate to viewer with file information
        const fileUrl = URL.createObjectURL(file);
        navigate('/view', { state: { document: { 
          id: Date.now() + Math.random(), 
          name: file.name, 
          size: file.size, 
          type: file.type, 
          file: file 
        }}})
      } else {
        alert('Please select a valid PDF file');
      }
    };
    fileInput.click();
  };

  const handleSignPdf = () => {
    // Track analytics event
    if (window.gtag) {
      window.gtag('event', 'home_sign_pdf_click', {
        event_category: 'engagement',
        event_label: 'homepage_sign_pdf'
      });
    }
    navigate('/sign');
  };

  const trackPricingView = () => {
    // Track when user scrolls to pricing section
    if (window.gtag) {
      window.gtag('event', 'home_pricing_view', {
        event_category: 'engagement',
        event_label: 'pricing_section_view'
      });
    }
  };

  const handleProCtaClick = () => {
    if (window.gtag) {
      window.gtag('event', 'home_pro_cta_click', {
        event_category: 'conversion',
        event_label: 'pro_plan_cta'
      });
    }
  };

  const features = [
    { title: "Plain-language explanation", icon: "📖" },
    { title: "Caveats & unfair conditions", icon: "⚠️" },
    { title: "Obligations & penalties summary", icon: "📋" },
    { title: "Logical inconsistency flags", icon: "🔍" },
    { title: "Translation when needed", icon: "🌐" },
    { title: "Email-to-sign + HubSpot capture", icon: "📧" }
  ];

  const pricingTiers = [
    {
      name: "Free",
      price: "Forever",
      features: [
        "1 AI call per document",
        "No storage",
        "Text-based PDFs only",
        "Basic analysis"
      ],
      cta: "Get Started",
      highlight: false
    },
    {
      name: "Pro",
      price: "$5/mo",
      features: [
        "N AI calls per document",
        "DecoDocs storage",
        "OCR support",
        "Higher limits",
        "Export reports"
      ],
      cta: "Upgrade to Pro",
      highlight: true,
      onClick: handleProCtaClick
    },
    {
      name: "Premium",
      price: "Contact",
      features: [
        "Pro + DOCX support",
        "Advanced workflows",
        "Multi-document analysis",
        "Custom integrations"
      ],
      cta: "Contact Sales",
      highlight: false
    }
  ];

  const roadmapItems = [
    {
      period: "Now",
      items: [
        "PDF analysis",
        "Email-to-sign",
        "HubSpot capture (kill feature)"
      ]
    },
    {
      period: "Next",
      items: [
        "Google Drive open",
        "OneDrive open",
        "iCloud open",
        "Mobile apps iOS/Android"
      ]
    },
    {
      period: "Later",
      items: [
        "DOCX support",
        "Multi-doc analysis",
        "Version compare"
      ]
    }
  ];

  return (
    <div className="homepage">
      {/* Top Navigation */}
      <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="nav-container">
          <div className="nav-logo">DecoDocs</div>
          <div className="nav-links">
            <a href="#product">Product</a>
            <a href="#pricing">Pricing</a>
            <a href="#roadmap">Roadmap</a>
            <a href="#sign" onClick={handleSignPdf}>Sign</a>
            <a href="/about">About</a>
          </div>
          <button className="nav-cta" onClick={handleOpenPdf}>
            Open PDF
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">Decode documents. Sign with clarity.</h1>
            <p className="hero-subtitle">
              Open a PDF, get a plain-language explanation, caveats, and hidden risks before you sign.
            </p>
            <div className="hero-ctas">
              <button className="primary-cta" onClick={handleOpenPdf}>
                Open PDF Document
              </button>
              <button className="secondary-cta" onClick={handleSignPdf}>
                Sign any PDF
              </button>
            </div>
            <p className="trust-line">
              No storage in Free. Paid can store in DecoDocs.
            </p>
          </div>
          <div className="hero-visual">
            <div className="mockup-container">
              <div className="document-mockup">
                <div className="document-header">
                  <div className="document-title">Contract Agreement</div>
                  <div className="document-meta">PDF • 12 pages</div>
                </div>
                <div className="document-content">
                  <div className="highlighted-text">This clause requires immediate attention...</div>
                  <div className="risk-flag">⚠️ Potential risk identified</div>
                  <div className="plain-explanation">In plain language: This means...</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <div className="section-container">
          <h2 className="section-title">How it works</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <div className="step-icon">📄</div>
              <h3>Open PDF</h3>
              <p>Select any document to analyze</p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-icon">🔍</div>
              <h3>Get explanation</h3>
              <p>Risks mapped and explained</p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <div className="step-icon">✅</div>
              <h3>Decide / Sign</h3>
              <p>Make informed decisions</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <div className="section-container">
          <h2 className="section-title">What we do</h2>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open vs Upload */}
      <section className="open-vs-upload">
        <div className="section-container">
          <h2 className="section-title">Open vs Upload</h2>
          <div className="comparison-cards">
            <div className="comparison-card">
              <h3>Open (default)</h3>
              <p>Ephemeral, no storage</p>
              <ul>
                <li>Process once, no saving</li>
                <li>Privacy-focused</li>
                <li>Free tier available</li>
              </ul>
            </div>
            <div className="comparison-card">
              <h3>Upload (Pro)</h3>
              <p>Stored in DecoDocs, history, export</p>
              <ul>
                <li>Persistent storage</li>
                <li>Document history</li>
                <li>Export capabilities</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="pricing" id="pricing" ref={trackPricingView}>
        <div className="section-container">
          <h2 className="section-title">Pricing</h2>
          <p className="pricing-description">
            Free/Pro features are identical; Pro just allows deeper analysis and storage.
          </p>
          <div className="pricing-grid">
            {pricingTiers.map((tier, index) => (
              <div 
                key={index} 
                className={`pricing-card ${tier.highlight ? 'highlighted' : ''}`}
                onClick={tier.onClick}
              >
                <div className="pricing-header">
                  <h3>{tier.name}</h3>
                  <div className="pricing-price">{tier.price}</div>
                </div>
                <ul className="pricing-features">
                  {tier.features.map((feature, featIndex) => (
                    <li key={featIndex}>{feature}</li>
                  ))}
                </ul>
                <button 
                  className={`pricing-cta ${tier.highlight ? 'highlighted' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (tier.onClick) tier.onClick();
                  }}
                >
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>
          <div className="pricing-explanation">
            <h4>What we count (cost-based, not artificial)</h4>
            <ul>
              <li><strong>LLM inference</strong>: Per AI call</li>
              <li><strong>OCR</strong>: Per page processed</li>
              <li><strong>Persistent storage</strong>: Per document stored</li>
              <li><strong>Multi-pass analysis</strong>: Per additional pass</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="roadmap" id="roadmap">
        <div className="section-container">
          <h2 className="section-title">Roadmap</h2>
          <div className="roadmap-timeline">
            {roadmapItems.map((period, index) => (
              <div key={index} className="roadmap-period">
                <h3 className="roadmap-period-title">{period.period}</h3>
                <ul className="roadmap-items">
                  {period.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="roadmap-item">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-section">
            <h4>Legal</h4>
            <a href="#privacy">Privacy</a>
            <a href="#terms">Terms</a>
          </div>
          <div className="footer-section">
            <h4>Company</h4>
            <a href="/about">About</a>
            <a href="mailto:contact@snapsign.com">Contact</a>
          </div>
          <div className="footer-section">
            <h4>Resources</h4>
            <a href="#product">Product</a>
            <a href="#pricing">Pricing</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© SnapSign Pty Ltd</p>
          <p>ABN 72 679 570 757</p>
          <p className="privacy-statement">
            Privacy: We don't store files in Free tier. Pro tier storage is optional.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
