import { useState, useEffect, useCallback, useRef } from 'react';
import { getVisitorId } from '../lib/abVariant';
import { trackPageView, trackCtaClick, trackMetaLandingCta } from '../lib/marketingEvents';
import LandingHero from './LandingHero';
import LandingCoreSections from './LandingCoreSections';
import { HERO_CONTENT, PRICING_PLANS } from './landingContent';
import { STARTER_TEMPLATES } from '../config/gameCatalog';
import { enhanceSandboxedPreviewHtml } from '../utils/previewHtml';
import './LandingPageB.css';
import './LandingPage.css';

interface LandingPageBProps {
  onLoginClick: () => void;
  onSignupClick: () => void;
}

interface Generation {
  generationId: string;
  prompt: string;
  code: string;
  thumbs: 'up' | 'down' | null;
}

const LANDING_STARTER_IDS = [
  'platformer',
  'maze-escape',
  'tower-defense',
  'pet-care-simulator',
  'obby',
  'open-map-explorer',
  'stunt-racer-3d',
  'house-builder',
] as const;

const GAME_STARTERS = LANDING_STARTER_IDS.map((id) => {
  const template = STARTER_TEMPLATES.find((entry) => entry.id === id)!;
  return {
    label: `${template.label}${template.engineId === 'vibe-3d' ? ' - Vibe 3D' : ' - Vibe 2D'}`,
    prompt: `Make me a ${template.dimension.toUpperCase()} ${template.label} game with the ${
      template.engineId === 'vibe-3d' ? 'Vibe 3D' : 'Vibe 2D'
    } engine style. The theme is ${template.defaultTheme}. I control a ${template.defaultCharacter}. The main challenge is ${
      template.defaultObstacle
    }.`,
  };
});

const MAX_FREE_PROMPTS = 5;

type Phase = 'idle' | 'loading' | 'playing' | 'gated';

export default function LandingPageB({ onLoginClick, onSignupClick }: LandingPageBProps) {
  const [customPrompt, setCustomPrompt] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [currentCode, setCurrentCode] = useState('');
  const [currentGenId, setCurrentGenId] = useState('');
  const [promptsUsed, setPromptsUsed] = useState(() => {
    const saved = sessionStorage.getItem('vck_demo_prompts_used');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [aiMessage, setAiMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const tryItRef = useRef<HTMLDivElement>(null);
  const visitorId = useRef(getVisitorId());
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    sessionStorage.setItem('vck_demo_prompts_used', String(promptsUsed));
  }, [promptsUsed]);

  const logEvent = useCallback((payload: Record<string, unknown>) => {
    fetch('/api/demo/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId: visitorId.current, variant: 'b', ...payload }),
    }).catch(() => {});
  }, []);

  useEffect(() => {
    logEvent({
      type: 'pageview',
      referrer: document.referrer,
      device: /Mobi/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    });
    trackPageView(undefined, undefined, 'b');
  }, [logEvent]);

  const handleGenerate = useCallback(
    async (prompt: string) => {
      if (!prompt.trim()) return;

      if (promptsUsed >= MAX_FREE_PROMPTS) {
        localStorage.setItem('vck_draft_code', currentCode);
        localStorage.setItem('vck_draft_prompt', generations[generations.length - 1]?.prompt || '');
        localStorage.setItem('vck_draft_ts', String(Date.now()));
        setPhase('gated');
        logEvent({ type: 'signup', promptsUsed });
        return;
      }

      setPhase('loading');
      setErrorMsg('');
      setAiMessage('');

      try {
        const res = await fetch('/api/demo/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: prompt, visitorId: visitorId.current, variant: 'b' }),
        });
        const data = await res.json();

        if (data.gated) {
          localStorage.setItem('vck_draft_code', currentCode);
          localStorage.setItem('vck_draft_prompt', prompt);
          localStorage.setItem('vck_draft_ts', String(Date.now()));
          setPhase('gated');
          logEvent({ type: 'signup', promptsUsed });
          return;
        }

        if (!data.code) {
          setAiMessage(data.message || 'Something went wrong.');
          setPhase('idle');
          return;
        }

        const gen: Generation = {
          generationId: data.generationId,
          prompt,
          code: data.code,
          thumbs: null,
        };
        setGenerations((prev) => [...prev, gen]);
        setCurrentCode(data.code);
        setCurrentGenId(data.generationId);
        setAiMessage(data.message || '');
        setPromptsUsed((prev) => prev + 1);
        setCustomPrompt('');
        setPhase('playing');
      } catch {
        setErrorMsg('Something went wrong. Please try again!');
        setPhase('idle');
      }
    },
    [promptsUsed, currentCode, generations, logEvent],
  );

  const handleThumbsFeedback = useCallback(
    (thumbsUp: boolean) => {
      setGenerations((prev) =>
        prev.map((g) => (g.generationId === currentGenId ? { ...g, thumbs: thumbsUp ? 'up' : 'down' } : g)),
      );
      logEvent({ type: 'feedback', generationId: currentGenId, thumbsUp });
    },
    [currentGenId, logEvent],
  );

  const handleSignupFromGate = useCallback(() => {
    trackMetaLandingCta('tryit', 'b');
    trackCtaClick('tryit-gate-signup', 'tryit', 'b');
    localStorage.setItem('vck_draft_code', currentCode);
    localStorage.setItem('vck_draft_prompt', generations[generations.length - 1]?.prompt || '');
    localStorage.setItem('vck_draft_ts', String(Date.now()));
    onSignupClick();
  }, [currentCode, generations, onSignupClick]);

  const handleCta = useCallback(
    (buttonId: string, section?: string) => {
      trackMetaLandingCta(section, 'b');
      trackCtaClick(buttonId, section, 'b');
      onSignupClick();
    },
    [onSignupClick],
  );

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const nav = navRef.current;
        if (nav) {
          const scrolled = window.scrollY > 40;
          if (scrolled && !nav.classList.contains('nav-scrolled')) nav.classList.add('nav-scrolled');
          else if (!scrolled && nav.classList.contains('nav-scrolled')) nav.classList.remove('nav-scrolled');
        }
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const currentThumb = generations.find((g) => g.generationId === currentGenId)?.thumbs ?? null;
  const remaining = MAX_FREE_PROMPTS - promptsUsed;

  return (
    <div className="landing-page">
      <div className="landing-bg" />

      {/* Nav — same as Landing A */}
      <nav ref={navRef} className="landing-nav">
        <div className="nav-inner">
          <a href="/" className="nav-logo-link">
            <img src="/images/logo.png?v=3" alt="VibeCode Kidz" className="nav-logo-img" />
          </a>
          <div className="nav-links">
            <a href="#how-it-works">How It Works</a>
            <a href="/gallery">Arcade</a>
            <a href="#pricing">Pricing</a>
            <a href="/esa">ESA</a>
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

      <div className="landing-content">
        <LandingHero onPrimaryCta={() => handleCta('hero-primary-cta', 'hero')} />
        <LandingCoreSections onCta={handleCta} />

        {/* Try It Now Section */}
        <section ref={tryItRef} className="tryit-section" id="try-it">
          <h2 className="section-heading">See the AI game builder in action</h2>
          <p className="section-subheading">
            Try the same flow your child would use: describe a game idea, let AI build it, and watch a playable version
            appear.
          </p>

          <div className="tryit-intro-card">
            <div>
              <span className="tryit-intro-badge">Live demo</span>
              <h3>Build games with AI before you sign up</h3>
              <p>
                Use a starter prompt or type your own idea. If your family likes the experience, start the Free 30-Day
                Trial.
              </p>
            </div>
            <button className="tryit-intro-cta" onClick={() => handleCta('tryit-intro-cta', 'tryit')}>
              {HERO_CONTENT.ctaLabel}
            </button>
          </div>

          {/* Signup Gate Modal */}
          {phase === 'gated' && (
            <div className="tryit-gate-overlay">
              <div className="tryit-gate-modal">
                <h3>Nice work — you made {promptsUsed} games!</h3>
                <p>Create a free account to save your games and make more.</p>
                <button className="tryit-gate-signup" onClick={handleSignupFromGate}>
                  Create Free Account
                </button>
                <button className="tryit-gate-plans" onClick={() => handleCta('tryit-gate-plans', 'tryit')}>
                  See Plans
                </button>
              </div>
            </div>
          )}

          {/* Preset prompts */}
          <div className="tryit-presets">
            {GAME_STARTERS.map((s) => (
              <button
                key={s.label}
                className="tryit-preset-btn"
                onClick={() => handleGenerate(s.prompt)}
                disabled={phase === 'loading'}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Custom prompt input */}
          <div className="tryit-input-row">
            <input
              className="tryit-input"
              type="text"
              placeholder="Describe your game idea..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleGenerate(customPrompt);
              }}
              disabled={phase === 'loading'}
              maxLength={200}
            />
            <button
              className="tryit-go-btn"
              onClick={() => handleGenerate(customPrompt)}
              disabled={phase === 'loading' || !customPrompt.trim()}
            >
              {phase === 'loading' ? 'Building...' : 'Make My Game!'}
            </button>
          </div>

          {/* Prompt counter */}
          {promptsUsed > 0 && phase !== 'gated' && (
            <p className="tryit-counter">
              {remaining > 0
                ? `${remaining} of ${MAX_FREE_PROMPTS} free creations remaining`
                : 'No free creations remaining'}
            </p>
          )}

          {errorMsg && <p className="tryit-error">{errorMsg}</p>}

          {/* Loading state */}
          {phase === 'loading' && (
            <div className="tryit-loading">
              <div className="tryit-spinner" />
              <span>AI is building your game...</span>
            </div>
          )}

          {/* Game preview */}
          {(phase === 'playing' || (phase === 'idle' && currentCode)) && currentCode && (
            <div className="tryit-result">
              {aiMessage && <p className="tryit-ai-message">{aiMessage}</p>}
              <div className="tryit-preview-wrapper">
                <iframe
                  ref={iframeRef}
                  title="Demo Game Preview"
                  sandbox="allow-scripts allow-pointer-lock"
                  className="tryit-preview-iframe"
                  srcDoc={enhanceSandboxedPreviewHtml(currentCode)}
                />

                {/* Thumbs feedback overlay */}
                <div className="tryit-feedback-bar">
                  <span className="tryit-feedback-label">How is it?</span>
                  <button
                    className={`tryit-thumb-btn ${currentThumb === 'up' ? 'active' : ''}`}
                    onClick={() => handleThumbsFeedback(true)}
                    title="Thumbs up"
                  >
                    <span aria-hidden>&#128077;</span>
                  </button>
                  <button
                    className={`tryit-thumb-btn ${currentThumb === 'down' ? 'active' : ''}`}
                    onClick={() => handleThumbsFeedback(false)}
                    title="Thumbs down"
                  >
                    <span aria-hidden>&#128078;</span>
                  </button>
                </div>
              </div>
              <button
                className="tryit-another-btn"
                onClick={() => {
                  setPhase('idle');
                  setCustomPrompt('');
                }}
              >
                Try Another
              </button>
            </div>
          )}
        </section>

        <section className="pricing-section" id="pricing">
          <h2 className="section-heading">Simple plans after your Free 30-Day Trial</h2>
          <p className="section-subheading">
            Start with the free trial first, then keep going only if your family loves it.
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
                <button className="price-card-btn" onClick={() => handleCta(`price-${plan.id}-btn`, 'pricing')}>
                  {plan.id === 'trial' ? HERO_CONTENT.ctaLabel : 'Choose This Plan'}
                </button>
              </div>
            ))}
          </div>
          <p className="pricing-esa-note">
            Arizona ESA family? <a href="/esa">Pay with your scholarship funds</a>
          </p>
        </section>

        <section className="final-cta-section">
          <h2>Start your Free 30-Day Trial today</h2>
          <p>Help your child turn an idea into a real playable game without needing to code.</p>
          <button className="section-cta" onClick={() => handleCta('final-cta', 'final')}>
            {HERO_CONTENT.ctaLabel}
          </button>
          <p className="hero-cta-subtext final-cta-subtext">{HERO_CONTENT.ctaSubtext}</p>
        </section>
      </div>

      {/* Footer */}
      <footer className="landing-footer-full">
        <div className="footer-inner">
          <div className="footer-col">
            <img src="/images/logo.png?v=3" alt="VibeCode Kidz" className="footer-logo" />
            <p className="footer-tagline">AI-powered game creation for kids ages 7-18</p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <a href="/">Studio</a>
            <a href="/gallery">Arcade</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="footer-col">
            <h4>Parents</h4>
            <a href="/parent-portal">Parent Portal</a>
            <a href="/esa">ESA Families</a>
            <a href="#founder-story">Why parents trust it</a>
          </div>
          <div className="footer-col">
            <h4>Community</h4>
            <a href="/contact">Contact Us</a>
            <a href="/gallery">Game Arcade</a>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
          </div>
        </div>
        <div className="footer-bottom">&copy; 2026 VibeCode Kidz. All rights reserved.</div>
      </footer>
    </div>
  );
}
