import { useState, useEffect, useCallback, useRef } from 'react';
import { trackPageView, trackCtaClick } from '../lib/marketingEvents';
import './LandingPage.css';

interface LandingPageProps {
  onLoginClick: () => void;
  onSignupClick: () => void;
}

interface FeaturedGame {
  id: string;
  title: string;
  creatorName?: string;
  displayName?: string;
  views?: number;
  genre?: string;
}

const SHOWCASE_NAMES = [
  'Mia',
  'Jayden',
  'Zoe',
  'Ethan',
  'Luna',
  'Noah',
  'Ava',
  'Liam',
  'Chloe',
  'Oliver',
  'Sophia',
  'Mason',
];

function friendlyCreatorName(raw: string | undefined, index: number): string {
  if (!raw || /test/i.test(raw) || /^user/i.test(raw)) {
    return SHOWCASE_NAMES[index % SHOWCASE_NAMES.length];
  }
  return raw;
}

const FAQ_ITEMS = [
  {
    q: 'What is vibecoding?',
    a: 'Vibecoding is a new way to create games using AI. Your child simply describes the game they want in plain English — "make a platformer where a cat collects fish" — and our AI writes the actual game code. No programming knowledge needed. They learn game design, logic, and creativity while having fun.',
  },
  {
    q: 'Is this safe for my child?',
    a: 'Absolutely. VibeCode Kidz is fully COPPA compliant. We use AI content moderation to filter inappropriate requests, require parental consent for users under 13, and never collect more data than necessary. All games are limited to E-rated (Everyone) content — think Minecraft and Pokemon, not anything violent or scary.',
  },
  {
    q: 'What ages is this for?',
    a: 'VibeCode Kidz is designed for ages 7 to 18. Younger kids (7-10) can describe simple games and learn the basics, while older kids and teens can create increasingly complex projects. The AI adapts to their skill level.',
  },
  {
    q: 'Do kids actually learn to code?',
    a: 'Yes! While the AI writes the initial code, kids can see and edit the source code of every game they create. They learn computational thinking, game design principles, debugging, and how code works — all through hands-on creation rather than boring tutorials.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes, you can cancel your subscription at any time from your account settings. There are no contracts or cancellation fees. Your child keeps access through the end of the billing period.',
  },
  {
    q: 'Do you accept Arizona ESA funds?',
    a: 'Yes! VibeCode Kidz qualifies as an approved ESA educational technology expense. Arizona ESA families can pay with their ClassWallet funds. Visit our ESA page for details on quarterly and annual billing options.',
  },
];

export default function LandingPage({ onLoginClick, onSignupClick }: LandingPageProps) {
  const [featuredGames, setFeaturedGames] = useState<FeaturedGame[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const [previewGameId, setPreviewGameId] = useState<string | null>(null);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);
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

  const cleanupPreview = useCallback(() => {
    if (restartInterval.current) {
      clearInterval(restartInterval.current);
      restartInterval.current = null;
    }
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
    setPreviewGameId(null);
    setPreviewLoaded(false);
    previewIframeRef.current = null;
  }, []);

  const handleCardMouseEnter = useCallback((gameId: string) => {
    if ('ontouchstart' in window) return;
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => {
      if (restartInterval.current) clearInterval(restartInterval.current);
      setPreviewLoaded(false);
      setPreviewGameId(gameId);
      restartInterval.current = setInterval(() => {
        setPreviewLoaded(false);
        setPreviewGameId(null);
        setTimeout(() => setPreviewGameId(gameId), 100);
      }, 6000);
    }, 300);
  }, []);

  const handleCardMouseLeave = useCallback(() => {
    cleanupPreview();
  }, [cleanupPreview]);

  useEffect(() => {
    return () => cleanupPreview();
  }, [cleanupPreview]);

  // First-party marketing: page_view on mount (Elias approved)
  useEffect(() => {
    trackPageView();
  }, []);

  const handleCta = useCallback(
    (buttonId: string, section?: string) => {
      trackCtaClick(buttonId, section);
      onSignupClick();
    },
    [onSignupClick],
  );

  // Fetch featured games
  useEffect(() => {
    fetch('/api/gallery?limit=6')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const games = Array.isArray(data) ? data : data.games || [];
        setFeaturedGames(games.slice(0, 6));
      })
      .catch(() => {});
  }, []);

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
              Get Started Free
            </button>
          </div>
        </div>
      </nav>

      <div className="landing-content" id="main-content">
        {/* ── 2. Hero ── */}
        <section className="landing-hero">
          <div className="hero-logo">
            <img src="/images/logo.png?v=3" alt="VibeCode Kidz" className="hero-logo-img" />
          </div>
          <h1 className="hero-headline">Teach kids to create with AI, not just consume it.</h1>
          <p className="hero-subtitle">
            Pick a game type or describe your own idea. VibeCode Kidz matches it to the right game engine so your child
            can start with a playable game fast and customize it through vibe coding.
          </p>

          <div className="hero-features">
            <div className="feature">
              <span className="feature-icon">💬</span>
              <span>Pick or Describe</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🎮</span>
              <span>Playable Fast</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🏆</span>
              <span>Customize &amp; Share</span>
            </div>
          </div>

          <div className="hero-buttons">
            <button className="btn-signup" onClick={() => handleCta('btn-signup', 'hero')}>
              Get Started Free
            </button>
            <button className="btn-login" onClick={onLoginClick}>
              Log In
            </button>
          </div>

          <p className="hero-note">
            Start your free 30-day trial and give them a playable first version instead of a blank page.
          </p>
        </section>

        {/* ── 3. How It Works ── */}
        <section className="how-it-works" id="how-it-works">
          <h2 className="section-heading">How It Works</h2>
          <p className="section-subheading">A guided, beginner-friendly path from idea to playable game</p>
          <div className="steps-row">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3 className="step-title">Pick It or Describe It</h3>
              <p className="step-desc">Start with a game type or describe your own idea in plain English.</p>
            </div>
            <div className="step-connector" />
            <div className="step-card">
              <div className="step-number">2</div>
              <h3 className="step-title">Get a Playable Starter</h3>
              <p className="step-desc">
                VibeCode Kidz matches the idea to the right game engine and builds a playable first version fast.
              </p>
            </div>
            <div className="step-connector" />
            <div className="step-card">
              <div className="step-number">3</div>
              <h3 className="step-title">Customize &amp; Share</h3>
              <p className="step-desc">
                Change the art, rules, obstacles, and goals until it feels like your own, then share it to the Arcade
                when you are ready.
              </p>
            </div>
          </div>
        </section>

        {/* ── 4. Real Games Showcase ── */}
        {featuredGames.length > 0 && (
          <section className="games-showcase">
            <h2 className="section-heading">Make It. Share It. Inspire the Next Creator.</h2>
            <p className="section-subheading">
              Kids build a game, share it to the Arcade, and let friends play it free. That is how one game idea can
              spark the next one.
            </p>
            <div className="showcase-game-grid">
              {featuredGames.map((game, i) => (
                <a
                  key={game.id}
                  href={`/play/${game.id}`}
                  className={`showcase-game-card${previewGameId === game.id && previewLoaded ? ' sgc-preview-active' : ''}`}
                  onMouseEnter={() => handleCardMouseEnter(game.id)}
                  onMouseLeave={handleCardMouseLeave}
                >
                  <div className="sgc-screen">
                    {previewGameId === game.id && (
                      <>
                        {!previewLoaded && <div className="sgc-preview-loader">LOADING...</div>}
                        <iframe
                          ref={previewIframeRef}
                          className={`sgc-preview-frame${previewLoaded ? ' visible' : ''}`}
                          src={`/play/${game.id}?preview=1`}
                          sandbox="allow-scripts allow-pointer-lock"
                          loading="lazy"
                          onLoad={() => setPreviewLoaded(true)}
                        />
                      </>
                    )}
                    <div className="sgc-screen-overlay">
                      <span className="sgc-genre">{game.genre || 'Game'}</span>
                    </div>
                  </div>
                  <div className="sgc-info">
                    <span className="sgc-title">{game.title || 'Untitled'}</span>
                    <span className="sgc-creator">
                      by {friendlyCreatorName(game.displayName || game.creatorName, i)}
                    </span>
                  </div>
                  <div className="sgc-play">Play</div>
                </a>
              ))}
            </div>
            <a href="/gallery" className="section-cta-link">
              Browse all games in the Arcade
            </a>
          </section>
        )}

        {/* ── 6. Founder Story ── */}
        <section className="founder-story-section">
          <h2 className="section-heading">A Better Middle Path for AI</h2>
          <p className="section-subheading">
            We built VibeCode Kidz after seeing two extremes: schools trying to block AI entirely, and kids getting
            dropped into powerful tools built for adults.
          </p>
          <div className="founder-story-card">
            <p>
              VibeCode Kidz is the middle path: a safe, creative, guided way for kids to use AI productively. Instead of
              just consuming content, they can turn ideas into real games, build confidence quickly, and share what they
              made with friends and family.
            </p>
          </div>
          <div className="parent-grid founder-pillars">
            <div className="parent-card">
              <span className="parent-card-icon">🧭</span>
              <h3>Guided, Not Overwhelming</h3>
              <p>
                Kids can start creating right away without having to navigate tools and workflows designed for adults.
              </p>
            </div>
            <div className="parent-card">
              <span className="parent-card-icon">✨</span>
              <h3>Creative, Not Passive</h3>
              <p>
                AI becomes a tool for making, testing, and learning instead of just watching, scrolling, or consuming.
              </p>
            </div>
            <div className="parent-card">
              <span className="parent-card-icon">🛡️</span>
              <h3>Safe, Not Reckless</h3>
              <p>Parent controls, kid-friendly content rules, and moderated sharing are built into the experience.</p>
            </div>
            <div className="parent-card">
              <span className="parent-card-icon">⚡</span>
              <h3>Fast, Not Frustrating</h3>
              <p>
                Kids can go from idea to playable game in minutes, so they build confidence before complexity gets in
                the way.
              </p>
            </div>
          </div>
        </section>

        {/* ── 7. Start With A Playable Game ── */}
        <section className="scratch-section">
          <h2 className="scratch-title">Start With a Playable Game. Then Make It Yours.</h2>
          <p className="scratch-subtitle">
            Describe what you want to make and VibeCode Kidz matches it to the right game engine, giving kids a playable
            starting point they can tweak, remix, and improve through vibe coding.
          </p>
          <div className="scratch-examples">
            {[
              { icon: '🏰', quote: '"A castle defense game with dragons and wizards"' },
              { icon: '🧟', quote: '"Zombie survival where I build walls and craft weapons"' },
              { icon: '🐱', quote: '"A cat cafe simulator where customers order treats"' },
              { icon: '🌌', quote: '"An asteroid mining game in outer space"' },
              { icon: '🎃', quote: '"A haunted house escape room with puzzles"' },
              { icon: '🏴‍☠️', quote: '"A pirate ship battle game on the ocean"' },
            ].map(({ icon, quote }) => (
              <div
                key={quote}
                className="scratch-card"
                role="button"
                tabIndex={0}
                onClick={() => handleCta(`scratch-${quote.slice(0, 20)}`, 'scratch')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCta('scratch-card', 'scratch');
                  }
                }}
              >
                <span className="scratch-card-icon" aria-hidden="true">
                  {icon}
                </span>
                <span className="scratch-card-quote">{quote}</span>
              </div>
            ))}
          </div>
          <div className="scratch-bottom">
            <p className="scratch-hint">No blank page. No adult workflow. Just a playable start kids can build on.</p>
            <button className="section-cta" onClick={() => handleCta('section-cta', 'scratch')}>
              Start With a Playable Game
            </button>
          </div>
        </section>

        {/* ── 8. For Parents ── */}
        <section className="for-parents" id="parents">
          <h2 className="section-heading">Creative Screen Time Parents Can Feel Good About</h2>
          <p className="section-subheading">
            VibeCode Kidz is a guided middle path for AI in education: creative, safe, and built for beginners.
          </p>
          <div className="parent-grid">
            <div className="parent-card">
              <span className="parent-card-icon">🛡️</span>
              <h3>Safe &amp; COPPA Compliant</h3>
              <p>
                Parental consent for under-13 users, minimal data collection, and kid-friendly guardrails are built in
                from the start.
              </p>
            </div>
            <div className="parent-card">
              <span className="parent-card-icon">🧠</span>
              <h3>Create With AI, Not Just Consume It</h3>
              <p>
                Kids use AI to make, test, and improve their own games. It is creative screen time with a real outcome.
              </p>
            </div>
            <div className="parent-card">
              <span className="parent-card-icon">✅</span>
              <h3>Built for Beginners</h3>
              <p>
                We built VibeCode Kidz for kids who want to make games, but are not ready for adult AI coding tools and
                complex workflows.
              </p>
            </div>
            <div className="parent-card">
              <span className="parent-card-icon">👨‍👩‍👧</span>
              <h3>You Stay in Control</h3>
              <p>
                View your child's creations, request data access or deletion anytime, and set daily usage limits through
                your account.
              </p>
            </div>
          </div>
        </section>

        {/* ── 10. Pricing ── */}
        <section className="pricing-section" id="pricing">
          <h2 className="section-heading">Simple, Affordable Plans</h2>
          <p className="section-subheading">Start free. Upgrade when you're ready.</p>
          <div className="pricing-grid">
            <div className="price-card">
              <h3 className="price-card-name">Free Trial</h3>
              <div className="price-card-price">$0</div>
              <div className="price-card-period">for 30 days</div>
              <ul className="price-card-features">
                <li>3 games per month</li>
                <li>10 AI prompts per day</li>
                <li>Unlimited plays</li>
                <li>Share to Arcade</li>
              </ul>
              <button className="price-card-btn" onClick={() => handleCta('price-free-btn', 'pricing')}>
                Start Free Trial
              </button>
            </div>
            <div className="price-card featured">
              <div className="price-card-badge">Most Popular</div>
              <h3 className="price-card-name">Creator</h3>
              <div className="price-card-price">$13</div>
              <div className="price-card-period">per month</div>
              <ul className="price-card-features">
                <li>15 games per month</li>
                <li>50 AI prompts per day</li>
                <li>Unlimited plays</li>
                <li>Share to Arcade</li>
                <li>Priority support</li>
              </ul>
              <button className="price-card-btn" onClick={() => handleCta('price-creator-btn', 'pricing')}>
                Get Started
              </button>
            </div>
            <div className="price-card">
              <h3 className="price-card-name">Pro</h3>
              <div className="price-card-price">$21</div>
              <div className="price-card-period">per month</div>
              <ul className="price-card-features">
                <li>40 games per month</li>
                <li>80 AI prompts per day</li>
                <li>Unlimited plays</li>
                <li>Share to Arcade</li>
                <li>Priority support</li>
              </ul>
              <button className="price-card-btn" onClick={() => handleCta('price-pro-btn', 'pricing')}>
                Get Started
              </button>
            </div>
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

        {/* ── 12. Final CTA ── */}
        <section className="final-cta-section">
          <h2>What if your child could build and share a game today?</h2>
          <p>Start free and give them a creative, guided way to use AI.</p>
          <button className="section-cta" onClick={() => handleCta('section-cta', 'final')}>
            Get Started Free
          </button>
        </section>
      </div>

      {/* ── 13. Full Footer ── */}
      <footer className="landing-footer-full">
        <div className="footer-inner">
          <div className="footer-col">
            <img src="/images/logo.png?v=3" alt="VibeCode Kidz" className="footer-logo" />
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
            <a href="#parents">Safety</a>
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
