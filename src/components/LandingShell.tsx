import { useCallback, useEffect, useRef } from 'react';
import { trackCtaClick, trackMetaLandingCta, trackPageView } from '../lib/marketingEvents';
import LandingCoreSections from './LandingCoreSections';
import LandingHero from './LandingHero';
import { HERO_CONTENT } from './landingContent';
import './LandingPage.css';

interface LandingShellProps {
  variant: 'a' | 'b';
  onLoginClick: () => void;
  onSignupClick: () => void;
}

const NAV_LINKS = [
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#creation-time', label: 'For Parents' },
  { href: '#questions', label: 'Q&A' },
] as const;

export default function LandingShell({ variant, onLoginClick, onSignupClick }: LandingShellProps) {
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    trackPageView(undefined, undefined, variant);
  }, [variant]);

  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const nav = navRef.current;
        if (!nav) {
          ticking = false;
          return;
        }

        if (window.scrollY > 20) nav.classList.add('nav-scrolled');
        else nav.classList.remove('nav-scrolled');

        ticking = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleCta = useCallback(
    (buttonId: string, section?: string) => {
      trackCtaClick(buttonId, section, variant);
      trackMetaLandingCta(section, variant);
      const el = document.getElementById('try-now');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    },
    [variant],
  );

  return (
    <div className="landing-page">
      <div className="landing-bg" />

      <nav ref={navRef} className="landing-nav" aria-label="Main navigation">
        <div className="nav-inner">
          <a href="/" className="nav-logo-link" aria-label="Vibe Code Kidz home">
            <img src="/images/logo.png?v=3" alt="Vibe Code Kidz" className="nav-logo-img" />
          </a>

          <div className="nav-links">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </div>

          <div className="nav-actions">
            <button type="button" className="nav-login" onClick={onLoginClick}>
              Log In
            </button>
            <button type="button" className="nav-login" onClick={onSignupClick}>
              Sign Up
            </button>
            <button type="button" className="nav-cta" onClick={() => handleCta('nav-cta', 'nav')}>
              {HERO_CONTENT.ctaLabel}
            </button>
          </div>
        </div>
      </nav>

      <main className="landing-content">
        <LandingHero onPrimaryCta={() => handleCta('hero-primary-cta', 'hero')} onSignupClick={onSignupClick} />
        <LandingCoreSections onCta={handleCta} />
      </main>

      <footer className="landing-footer" aria-label="Footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <img
              src="/images/logo.png?v=3"
              alt="Vibe Code Kidz"
              className="footer-logo"
              loading="lazy"
              decoding="async"
            />
            <p className="footer-tagline">
              Kids describe a 2D game idea, AI builds it, and they play it right away in the browser.
            </p>
          </div>

          <div className="footer-links">
            <a href="#how-it-works">How It Works</a>
            <a href="/gallery">Arcade</a>
            <a href="/gallery">Student Creations</a>
            <a href="/esa">ESA</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/contact">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
