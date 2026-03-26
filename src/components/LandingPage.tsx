import { useState, useEffect, useCallback, useRef } from 'react';
import { trackPageView, trackCtaClick, trackMetaLandingCta } from '../lib/marketingEvents';
import LandingHero from './LandingHero';
import LandingCoreSections from './LandingCoreSections';
import { HERO_CONTENT, PRICING_PLANS } from './landingContent';
import './LandingPage.css';

interface LandingPageProps {
  onLoginClick: () => void;
  onSignupClick: () => void;
}

const FAQ_ITEMS = [
  {
    q: 'What does my child actually do?',
    a: 'They describe a game idea in plain English, watch AI build a playable version, then keep changing it until it feels like their own game.',
  },
  {
    q: 'Is this safe for my child?',
    a: 'Yes. VibeCode Kidz uses kid-friendly guardrails, requires parental consent for kids under 13, and keeps data collection minimal.',
  },
  {
    q: 'What ages is this for?',
    a: 'Vibe Code Kidz is built for ages 8 and up. Younger kids can start with simple ideas, and older kids can build more advanced projects.',
  },
  {
    q: 'Do kids actually learn to code?',
    a: 'They learn by building real things. Kids can focus on creativity first, then explore how games work as their confidence grows.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. You can cancel anytime in account settings. There are no contracts or cancellation fees.',
  },
  {
    q: 'Do you accept Arizona ESA funds?',
    a: 'Yes. Arizona ESA families can pay with ClassWallet funds. Visit our ESA page for details.',
  },
];

function PrimaryCtaNote() {
  return <p className="cta-support-line">No credit card required • Takes less than 60 seconds</p>;
}

export default function LandingPage({ onLoginClick, onSignupClick }: LandingPageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const pageRef = useRef<HTMLDivElement | null>(null);

  // Native click listener for path links — fixes tap/click not working on mobile (iOS/Android)
  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;
    const handleLink = (e: Event) => {
      const ev = e as MouseEvent;
      if (ev.button !== 0 || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
      const target = (e.target as HTMLElement).closest('a[href^="/"]:not([href^="//"])');
      if (!target) return;
      const href = (target as HTMLAnchorElement).getAttribute('href') || '';
      if (href && href !== '#' && (window.innerWidth <= 768 || 'ontouchstart' in window)) {
        e.preventDefault();
        e.stopPropagation();
        window.location.href = href;
      }
    };
    root.addEventListener('click', handleLink, true);
    return () => root.removeEventListener('click', handleLink, true);
  }, []);

  const handleFooterPathLink = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    const href = e.currentTarget.getAttribute('href') || '';
    if (href.startsWith('/') && !href.startsWith('//') && (window.innerWidth <= 768 || 'ontouchstart' in window)) {
      e.preventDefault();
      window.location.href = href;
    }
  }, []);

  // First-party marketing: page_view on mount (Elias approved)
  useEffect(() => {
    trackPageView(undefined, undefined, 'a');
  }, []);

  const handleCta = useCallback(
    (buttonId: string, section?: string) => {
      trackCtaClick(buttonId, section, 'a');
      trackMetaLandingCta(section, 'a');
      onSignupClick();
    },
    [onSignupClick],
  );

  // Nav scroll effect — direct DOM toggle to avoid React re-renders during scroll
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const nav = navRef.current;
        if (nav) {
          const scrolled = window.scrollY > 40;
          if (scrolled && !nav.classList.contains('nav-scrolled')) {
            nav.classList.add('nav-scrolled');
          } else if (!scrolled && nav.classList.contains('nav-scrolled')) {
            nav.classList.remove('nav-scrolled');
          }
        }
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div ref={pageRef} className="landing-page">
      <div className="landing-bg" />

      {/* ── 1. Sticky Nav ── */}
      <nav ref={navRef} className="landing-nav" aria-label="Main navigation">
        <div className="nav-inner">
          <a href="/" className="nav-logo-link">
            <img src="/images/logo.png?v=3" alt="VibeCode Kidz" className="nav-logo-img" />
          </a>
          <div className="nav-links">
            <a href="#how-it-works">How It Works</a>
            <a href="/gallery">Arcade</a>
            <a href="#pricing">Pricing</a>
            <a href="/esa">ESA</a>
            <a href="/contact">Contact</a>
          </div>
          <div className="nav-actions">
            <button className="nav-login" onClick={onLoginClick}>
              Log In
            </button>
            <button className="nav-cta" onClick={() => handleCta('nav-cta', 'nav')}>
              {HERO_CONTENT.ctaLabel}
            </button>
          </div>
        </div>
      </nav>

      <div className="landing-content" id="main-content">
        <LandingHero onPrimaryCta={() => handleCta('hero-primary-cta', 'hero')} />
        <LandingCoreSections onCta={handleCta} />

        {/* ── 10. Pricing ── */}
        <section className="pricing-section" id="pricing">
          <h2 className="section-heading">Simple plans after your Free 30-Day Trial</h2>
          <p className="section-subheading">
            Start free, see if your child lights up, and only continue if it feels like a great fit for your family.
          </p>
          <div className="pricing-grid">
            {PRICING_PLANS.map((plan) => (
              <div key={plan.id} className={`price-card${plan.featured ? ' featured' : ''}`}>
                {plan.badge && <div className="price-card-badge">{plan.badge}</div>}
                <h3 className="price-card-name">{plan.name}</h3>
                <div className="price-card-price">{plan.price}</div>
                <div className="price-card-period">{plan.period}</div>
                <ul className="price-card-features">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <div className="cta-stack cta-stack-full price-card-cta">
                  <button className="price-card-btn" onClick={() => handleCta(`price-${plan.id}-btn`, 'pricing')}>
                    {plan.id === 'trial' ? HERO_CONTENT.ctaLabel : 'Choose This Plan'}
                  </button>
                  <PrimaryCtaNote />
                </div>
              </div>
            ))}
          </div>
          <p className="pricing-esa-note">
            Arizona ESA family? <a href="/esa">Pay with your scholarship funds</a>
          </p>
        </section>

        {/* ── 11. FAQ ── */}
        <section className="faq-section" id="faq">
          <h2 className="section-heading">Frequently Asked Questions</h2>
          <div className="faq-list">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className={`faq-item ${openFaq === i ? 'open' : ''}`}>
                <button
                  className="faq-question"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  aria-controls={`faq-answer-${i}`}
                >
                  <span>{item.q}</span>
                  <span className="faq-toggle" aria-hidden="true">
                    {openFaq === i ? '−' : '+'}
                  </span>
                </button>
                {openFaq === i && (
                  <div className="faq-answer" id={`faq-answer-${i}`} role="region">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="final-cta-section">
          <h2>Let your kid create instead of just consume</h2>
          <p>Give them a skill that builds creativity, confidence, and something real they can be proud of.</p>
          <button className="section-cta" onClick={() => handleCta('final-cta', 'final')}>
            {HERO_CONTENT.ctaLabel}
          </button>
          <p className="hero-cta-subtext final-cta-subtext">{HERO_CONTENT.ctaSubtext}</p>
        </section>
      </div>

      {/* ── 13. Full Footer ── */}
      <footer className="landing-footer-full">
        <div className="footer-inner">
          <div className="footer-col">
            <img
              src="/images/logo.png?v=3"
              alt="VibeCode Kidz"
              className="footer-logo"
              loading="lazy"
              decoding="async"
            />
            <p className="footer-tagline">
              AI-powered game creation for kids ages <span className="footer-tagline-nowrap">7-18</span>
            </p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <a href="/" onClick={handleFooterPathLink}>
              Studio
            </a>
            <a href="/gallery" onClick={handleFooterPathLink}>
              Arcade
            </a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="footer-col">
            <h4>Parents</h4>
            <a href="/parent-portal" onClick={handleFooterPathLink}>
              Parent Portal
            </a>
            <a href="/esa" onClick={handleFooterPathLink}>
              ESA Families
            </a>
            <a href="#benefits">Safety</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="footer-col">
            <h4>Community</h4>
            <a href="/contact" onClick={handleFooterPathLink}>
              Contact Us
            </a>
            <a href="/gallery" onClick={handleFooterPathLink}>
              Game Arcade
            </a>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <a href="/privacy" onClick={handleFooterPathLink}>
              Privacy Policy
            </a>
            <a href="/terms" onClick={handleFooterPathLink}>
              Terms of Service
            </a>
          </div>
        </div>
        <div className="footer-bottom">&copy; 2026 VibeCode Kidz. All rights reserved.</div>
      </footer>
    </div>
  );
}
