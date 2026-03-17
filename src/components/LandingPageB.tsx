import { useState, useEffect, useCallback, useRef } from 'react';
import { getVisitorId } from '../lib/abVariant';
import { trackPageView, trackCtaClick } from '../lib/marketingEvents';
import { ENGINE_SELECTION_GUIDE, STARTER_TEMPLATES } from '../config/gameCatalog';
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
const LANDING_ENGINE_GUIDES = Object.values(ENGINE_SELECTION_GUIDE);

type Phase = 'idle' | 'loading' | 'playing' | 'gated';

function injectLibraries(code: string): string {
  const hasFullStructure = code.toLowerCase().includes('<!doctype') || code.toLowerCase().includes('<html');
  const previewScrollStyle = `<style>html,body{overflow-y:auto!important;overflow-x:hidden;min-height:100%}</style>`;
  const libraryScripts = `<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script><script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script><script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script><script>
    window.THREE=THREE;delete window.createImageBitmap;
    (function(){if(!window.THREE||!window.THREE.ImageLoader)return;var o=window.THREE.ImageLoader.prototype.load;window.THREE.ImageLoader.prototype.load=function(u,l,p,e){if(typeof u==='string'&&u.indexOf('blob:')===0){fetch(u).then(function(r){return r.blob()}).then(function(b){return new Promise(function(res,rej){var r=new FileReader();r.onload=function(){res(r.result)};r.onerror=function(){rej(r.error)};r.readAsDataURL(b)})}).then(function(d){o.call(this,d,l,p,e)}.bind(this)).catch(function(err){if(e)e(err)})}else{o.call(this,u,l,p,e)}}})();
  </script>`;
  const headInject = previewScrollStyle + libraryScripts;
  if (hasFullStructure) {
    const headOpenMatch = code.match(/<head[^>]*>/i);
    if (headOpenMatch) {
      const idx = code.indexOf(headOpenMatch[0]) + headOpenMatch[0].length;
      return code.slice(0, idx) + headInject + code.slice(idx);
    }
    if (code.includes('<body')) return code.replace(/<body/i, `${previewScrollStyle}<body`);
  }
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">${headInject}</head><body>${code}</body></html>`;
}

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

  useEffect(() => {
    if (iframeRef.current && currentCode) {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(injectLibraries(currentCode));
        doc.close();
      }
    }
  }, [currentCode]);

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
    trackPageView();
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
    trackCtaClick('tryit-gate-signup', 'tryit');
    localStorage.setItem('vck_draft_code', currentCode);
    localStorage.setItem('vck_draft_prompt', generations[generations.length - 1]?.prompt || '');
    localStorage.setItem('vck_draft_ts', String(Date.now()));
    onSignupClick();
  }, [currentCode, generations, onSignupClick]);

  const handleCta = useCallback(
    (buttonId: string, section?: string) => {
      trackCtaClick(buttonId, section);
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
              Get Started Free
            </button>
          </div>
        </div>
      </nav>

      <div className="landing-content">
        {/* Hero */}
        <section className="landing-hero">
          <div className="hero-logo">
            <img src="/images/logo.png?v=3" alt="VibeCode Kidz" className="hero-logo-img" />
          </div>
          <h1 className="hero-headline">Kids can make games with AI.</h1>
          <p className="hero-subtitle">
            Pick a starter or describe an idea. VibeCode Kidz builds a playable game fast so kids can keep improving it.
          </p>

          <div className="hero-features">
            <div className="feature">
              <span className="feature-icon">💬</span>
              <span>Pick or Describe</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🤖</span>
              <span>Playable Fast</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🎮</span>
              <span>Make It Yours</span>
            </div>
          </div>

          <div className="hero-buttons">
            <button className="btn-signup" onClick={() => tryItRef.current?.scrollIntoView({ behavior: 'smooth' })}>
              Try It Now
            </button>
            <button className="btn-login" onClick={onLoginClick}>
              Log In
            </button>
          </div>
        </section>

        {/* Try It Now Section */}
        <section ref={tryItRef} className="tryit-section" id="try-it">
          <h2 className="section-heading">Pick It or Describe It</h2>
          <p className="section-subheading">
            Choose a starter or type your own idea. VibeCode Kidz will build a playable first version for you.
          </p>
          <div className="landing-engine-guide-grid">
            {LANDING_ENGINE_GUIDES.map((engine) => (
              <div key={engine.label} className="landing-engine-guide-card">
                <span className="landing-engine-guide-label">{engine.label}</span>
                <strong>{engine.runtimeSummary}</strong>
                <span>{engine.iterationSweetSpot}</span>
              </div>
            ))}
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

        {/* How It Works — reused from Landing A */}
        <section className="how-it-works" id="how-it-works">
          <h2 className="section-heading">How It Works</h2>
          <p className="section-subheading">From idea to playable game in 3 simple steps.</p>
          <div className="steps-row">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3 className="step-title">Pick It or Describe It</h3>
              <p className="step-desc">Choose a game type or describe your idea in plain English.</p>
            </div>
            <div className="step-connector" />
            <div className="step-card">
              <div className="step-number">2</div>
              <h3 className="step-title">Get the Right Engine</h3>
              <p className="step-desc">VibeCode Kidz picks the right engine and builds a playable starting point.</p>
            </div>
            <div className="step-connector" />
            <div className="step-card">
              <div className="step-number">3</div>
              <h3 className="step-title">Customize and Make It Yours</h3>
              <p className="step-desc">Keep changing the game until it feels like your own.</p>
            </div>
          </div>
        </section>

        {/* For Parents */}
        <section className="for-parents" id="parents">
          <h2 className="section-heading">Screen Time That Helps Kids Create</h2>
          <p className="section-subheading">A safer, simpler way for kids to use AI.</p>
          <div className="parent-grid">
            <div className="parent-card">
              <span className="parent-card-icon">&#128737;&#65039;</span>
              <h3>Safe &amp; COPPA Compliant</h3>
              <p>Parental consent, minimal data collection, and kid-friendly guardrails are built in.</p>
            </div>
            <div className="parent-card">
              <span className="parent-card-icon">&#129504;</span>
              <h3>Create With AI, Not Just Consume It</h3>
              <p>Kids use AI to make, test, and improve their own games.</p>
            </div>
            <div className="parent-card">
              <span className="parent-card-icon">&#9989;</span>
              <h3>Built for Beginners</h3>
              <p>Kids can make games without dealing with complicated adult tools.</p>
            </div>
            <div className="parent-card">
              <span className="parent-card-icon">&#128104;&#8205;&#128105;&#8205;&#128103;</span>
              <h3>You Stay in Control</h3>
              <p>View your child's creations, manage data requests, and set usage limits from your account.</p>
            </div>
          </div>
        </section>

        {/* Pricing */}
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

        {/* Final CTA */}
        <section className="final-cta-section">
          <h2>Your child can build a game today.</h2>
          <p>Start free and let them create with AI.</p>
          <button className="section-cta" onClick={() => handleCta('section-cta', 'final')}>
            Get Started Free
          </button>
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
            <a href="#parents">Safety</a>
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
