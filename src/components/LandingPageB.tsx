import { useState, useEffect, useCallback, useRef } from 'react'
import { getVisitorId } from '../lib/abVariant'
import './LandingPageB.css'
import './LandingPage.css'

interface LandingPageBProps {
  onLoginClick: () => void
  onSignupClick: () => void
}

interface Generation {
  generationId: string
  prompt: string
  code: string
  thumbs: 'up' | 'down' | null
}

const GAME_STARTERS = [
  { label: 'Platformer', prompt: 'A platformer game with a cat that collects fish' },
  { label: 'Space Shooter', prompt: 'A space shooter where I blast alien ships' },
  { label: 'Snake', prompt: 'A classic snake game where I eat apples and grow' },
  { label: 'Racing', prompt: 'A top-down racing game dodging traffic' },
  { label: 'Flappy Bird', prompt: 'A flappy bird style game with a dragon' },
  { label: 'Brick Breaker', prompt: 'A brick breaker game with power-ups' },
]

const MAX_FREE_PROMPTS = 5

type Phase = 'idle' | 'loading' | 'playing' | 'gated'

function injectLibraries(code: string): string {
  const hasFullStructure = code.toLowerCase().includes('<!doctype') || code.toLowerCase().includes('<html')
  const previewScrollStyle = `<style>html,body{overflow-y:auto!important;overflow-x:hidden;min-height:100%}</style>`
  const libraryScripts = `<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script><script>window.THREE=THREE;</script>`
  const headInject = previewScrollStyle + libraryScripts
  if (hasFullStructure) {
    if (code.includes('</head>')) return code.replace('</head>', `${headInject}</head>`)
    if (code.includes('<body')) return code.replace(/<body/i, `${previewScrollStyle}<body`)
  }
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">${headInject}</head><body>${code}</body></html>`
}

export default function LandingPageB({ onLoginClick, onSignupClick }: LandingPageBProps) {
  const [customPrompt, setCustomPrompt] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [generations, setGenerations] = useState<Generation[]>([])
  const [currentCode, setCurrentCode] = useState('')
  const [currentGenId, setCurrentGenId] = useState('')
  const [promptsUsed, setPromptsUsed] = useState(() => {
    const saved = sessionStorage.getItem('vck_demo_prompts_used')
    return saved ? parseInt(saved, 10) : 0
  })
  const [aiMessage, setAiMessage] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const tryItRef = useRef<HTMLDivElement>(null)
  const visitorId = useRef(getVisitorId())
  const navRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    sessionStorage.setItem('vck_demo_prompts_used', String(promptsUsed))
  }, [promptsUsed])

  useEffect(() => {
    if (iframeRef.current && currentCode) {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document
      if (doc) {
        doc.open()
        doc.write(injectLibraries(currentCode))
        doc.close()
      }
    }
  }, [currentCode])

  const logEvent = useCallback((payload: Record<string, any>) => {
    fetch('/api/demo/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId: visitorId.current, variant: 'b', ...payload }),
    }).catch(() => {})
  }, [])

  useEffect(() => {
    logEvent({ type: 'pageview', referrer: document.referrer, device: /Mobi/i.test(navigator.userAgent) ? 'mobile' : 'desktop' })
  }, [logEvent])

  const handleGenerate = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return

    if (promptsUsed >= MAX_FREE_PROMPTS) {
      localStorage.setItem('vck_draft_code', currentCode)
      localStorage.setItem('vck_draft_prompt', generations[generations.length - 1]?.prompt || '')
      localStorage.setItem('vck_draft_ts', String(Date.now()))
      setPhase('gated')
      logEvent({ type: 'signup', promptsUsed })
      return
    }

    setPhase('loading')
    setErrorMsg('')
    setAiMessage('')

    try {
      const res = await fetch('/api/demo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, visitorId: visitorId.current, variant: 'b' }),
      })
      const data = await res.json()

      if (data.gated) {
        localStorage.setItem('vck_draft_code', currentCode)
        localStorage.setItem('vck_draft_prompt', prompt)
        localStorage.setItem('vck_draft_ts', String(Date.now()))
        setPhase('gated')
        logEvent({ type: 'signup', promptsUsed })
        return
      }

      if (!data.code) {
        setAiMessage(data.message || 'Something went wrong.')
        setPhase('idle')
        return
      }

      const gen: Generation = {
        generationId: data.generationId,
        prompt,
        code: data.code,
        thumbs: null,
      }
      setGenerations(prev => [...prev, gen])
      setCurrentCode(data.code)
      setCurrentGenId(data.generationId)
      setAiMessage(data.message || '')
      setPromptsUsed(prev => prev + 1)
      setCustomPrompt('')
      setPhase('playing')
    } catch {
      setErrorMsg('Something went wrong. Please try again!')
      setPhase('idle')
    }
  }, [promptsUsed, currentCode, generations, logEvent])

  const handleThumbsFeedback = useCallback((thumbsUp: boolean) => {
    setGenerations(prev =>
      prev.map(g => g.generationId === currentGenId ? { ...g, thumbs: thumbsUp ? 'up' : 'down' } : g)
    )
    logEvent({ type: 'feedback', generationId: currentGenId, thumbsUp })
  }, [currentGenId, logEvent])

  const handleSignupFromGate = useCallback(() => {
    localStorage.setItem('vck_draft_code', currentCode)
    localStorage.setItem('vck_draft_prompt', generations[generations.length - 1]?.prompt || '')
    localStorage.setItem('vck_draft_ts', String(Date.now()))
    onSignupClick()
  }, [currentCode, generations, onSignupClick])

  useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const nav = navRef.current
        if (nav) {
          const scrolled = window.scrollY > 40
          if (scrolled && !nav.classList.contains('nav-scrolled')) nav.classList.add('nav-scrolled')
          else if (!scrolled && nav.classList.contains('nav-scrolled')) nav.classList.remove('nav-scrolled')
        }
        ticking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const currentThumb = generations.find(g => g.generationId === currentGenId)?.thumbs ?? null
  const remaining = MAX_FREE_PROMPTS - promptsUsed

  return (
    <div className="landing-page">
      <div className="landing-bg" />

      {/* Nav — same as Landing A */}
      <nav ref={navRef} className="landing-nav">
        <div className="nav-inner">
          <a href="/" className="nav-logo-link">
            <img src="/images/logo.png" alt="VibeCode Kids" className="nav-logo-img" />
          </a>
          <div className="nav-links">
            <a href="#how-it-works">How It Works</a>
            <a href="/gallery">Arcade</a>
            <a href="#pricing">Pricing</a>
            <a href="/esa">ESA</a>
          </div>
          <div className="nav-actions">
            <button className="nav-login" onClick={onLoginClick}>Log In</button>
            <button className="nav-cta" onClick={onSignupClick}>Get Started Free</button>
          </div>
        </div>
      </nav>

      <div className="landing-content">

        {/* Hero */}
        <section className="landing-hero">
          <div className="hero-logo">
            <img src="/images/logo.png" alt="VibeCode Kids" className="hero-logo-img" />
          </div>
          <h1 className="hero-headline">Your kid describes a game. AI builds it.</h1>
          <p className="hero-subtitle">Try it right now — no signup needed.</p>

          <div className="hero-features">
            <div className="feature"><span className="feature-icon">💬</span><span>Describe It</span></div>
            <div className="feature"><span className="feature-icon">🤖</span><span>AI Builds It</span></div>
            <div className="feature"><span className="feature-icon">🎮</span><span>Play It Instantly</span></div>
          </div>

          <div className="hero-buttons">
            <button className="btn-signup" onClick={() => tryItRef.current?.scrollIntoView({ behavior: 'smooth' })}>
              Try It Now
            </button>
            <button className="btn-login" onClick={onLoginClick}>Log In</button>
          </div>
        </section>

        {/* Try It Now Section */}
        <section ref={tryItRef} className="tryit-section" id="try-it">
          <h2 className="section-heading">Make a Game Right Now</h2>
          <p className="section-subheading">Pick a starter or describe your own — AI does the rest</p>

          {/* Signup Gate Modal */}
          {phase === 'gated' && (
            <div className="tryit-gate-overlay">
              <div className="tryit-gate-modal">
                <h3>Nice work — you made {promptsUsed} games!</h3>
                <p>Create a free account to save your games and keep creating.</p>
                <button className="tryit-gate-signup" onClick={handleSignupFromGate}>
                  Create Free Account
                </button>
                <button className="tryit-gate-plans" onClick={onSignupClick}>
                  See Plans
                </button>
              </div>
            </div>
          )}

          {/* Preset prompts */}
          <div className="tryit-presets">
            {GAME_STARTERS.map(s => (
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
              placeholder="Or describe your own game..."
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleGenerate(customPrompt) }}
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
                  sandbox="allow-scripts allow-same-origin allow-pointer-lock"
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
                onClick={() => { setPhase('idle'); setCustomPrompt('') }}
              >
                Try Another
              </button>
            </div>
          )}
        </section>

        {/* How It Works — reused from Landing A */}
        <section className="how-it-works" id="how-it-works">
          <h2 className="section-heading">How It Works</h2>
          <p className="section-subheading">From idea to playable game in under a minute</p>
          <div className="steps-row">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3 className="step-title">Describe Your Game</h3>
              <p className="step-desc">Tell the AI what you want in plain English — any game you can imagine.</p>
            </div>
            <div className="step-connector" />
            <div className="step-card">
              <div className="step-number">2</div>
              <h3 className="step-title">AI Builds It</h3>
              <p className="step-desc">Watch your game come to life in seconds with real, working code.</p>
            </div>
            <div className="step-connector" />
            <div className="step-card">
              <div className="step-number">3</div>
              <h3 className="step-title">Play &amp; Share</h3>
              <p className="step-desc">Test it instantly, tweak it with more prompts, and publish to the Arcade.</p>
            </div>
          </div>
        </section>

        {/* For Parents */}
        <section className="for-parents" id="parents">
          <h2 className="section-heading">Built for Kids. Trusted by Parents.</h2>
          <p className="section-subheading">Safety, education, and transparency are built into everything we do</p>
          <div className="parent-grid">
            <div className="parent-card">
              <span className="parent-card-icon">&#128737;&#65039;</span>
              <h3>Safe &amp; COPPA Compliant</h3>
              <p>Parental consent for under-13 users, minimal data collection, and full compliance with children's privacy law.</p>
            </div>
            <div className="parent-card">
              <span className="parent-card-icon">&#129504;</span>
              <h3>Real Coding Skills</h3>
              <p>Kids learn game design, computational thinking, and can view and edit the real source code behind every game.</p>
            </div>
            <div className="parent-card">
              <span className="parent-card-icon">&#9989;</span>
              <h3>Kid-Friendly Content Only</h3>
              <p>AI content moderation ensures all games stay E-rated. Swords and spells are fine — graphic violence is not.</p>
            </div>
            <div className="parent-card">
              <span className="parent-card-icon">&#128104;&#8205;&#128105;&#8205;&#128103;</span>
              <h3>You Stay in Control</h3>
              <p>View your child's creations, request data access or deletion anytime, and set daily usage limits through your account.</p>
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
              <button className="price-card-btn" onClick={onSignupClick}>Start Free Trial</button>
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
              <button className="price-card-btn" onClick={onSignupClick}>Get Started</button>
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
              <button className="price-card-btn" onClick={onSignupClick}>Get Started</button>
            </div>
          </div>
          <p className="pricing-esa-note">
            Arizona ESA family? <a href="/esa">Pay with your scholarship funds</a>
          </p>
        </section>

        {/* Final CTA */}
        <section className="final-cta-section">
          <h2>Ready to start vibecoding?</h2>
          <p>Your child's next favorite game is one sentence away.</p>
          <button className="section-cta" onClick={onSignupClick}>Get Started Free</button>
        </section>
      </div>

      {/* Footer */}
      <footer className="landing-footer-full">
        <div className="footer-inner">
          <div className="footer-col">
            <img src="/images/logo.png" alt="VibeCode Kids" className="footer-logo" />
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
            <a href="/esa">ESA Families</a>
            <a href="#parents">Safety</a>
          </div>
          <div className="footer-col">
            <h4>Community</h4>
            <a href="https://discord.gg/placeholder" target="_blank" rel="noopener noreferrer">Join Discord</a>
            <a href="/contact">Contact Us</a>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
          </div>
        </div>
        <div className="footer-bottom">&copy; 2026 VibeCode Kids. All rights reserved.</div>
      </footer>
    </div>
  )
}
