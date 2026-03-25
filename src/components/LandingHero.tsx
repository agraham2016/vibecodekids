import { HERO_CONTENT, HERO_VISUAL_STEPS } from './landingContent';

interface LandingHeroProps {
  onPrimaryCta: () => void;
}

function renderVisualSurface(index: number) {
  if (index === 0) {
    return (
      <div className="hero-demo-surface hero-demo-prompt" aria-hidden="true">
        <div className="hero-demo-bubble">"Make a puppy adventure where I collect stars and dodge puddles."</div>
        <span className="hero-demo-note">Typed in plain English</span>
      </div>
    );
  }

  if (index === 1) {
    return (
      <div className="hero-demo-surface hero-demo-build" aria-hidden="true">
        <span className="hero-demo-status">AI is building the game...</span>
        <div className="hero-demo-progress">
          <span />
        </div>
        <div className="hero-demo-progress hero-demo-progress-short">
          <span />
        </div>
        <div className="hero-demo-build-chips">
          <span>Characters</span>
          <span>Goals</span>
          <span>Level</span>
        </div>
      </div>
    );
  }

  return (
    <div className="hero-demo-surface hero-demo-play" aria-hidden="true">
      <div className="hero-demo-game-bar">
        <span>Score 120</span>
        <span>Lives 3</span>
      </div>
      <div className="hero-demo-game-stage">
        <span className="hero-demo-player" />
        <span className="hero-demo-star hero-demo-star-1" />
        <span className="hero-demo-star hero-demo-star-2" />
        <span className="hero-demo-star hero-demo-star-3" />
      </div>
      <span className="hero-demo-play-badge">Playable now</span>
    </div>
  );
}

export default function LandingHero({ onPrimaryCta }: LandingHeroProps) {
  return (
    <section className="landing-hero" aria-labelledby="landing-hero-title">
      <div className="hero-copy">
        <div className="hero-badge">{HERO_CONTENT.badge}</div>
        <h1 id="landing-hero-title" className="hero-headline">
          {HERO_CONTENT.headline}
        </h1>
        <p className="hero-subtitle">{HERO_CONTENT.subheadline}</p>

        <div className="hero-proof-points" aria-label="Key product benefits">
          {HERO_CONTENT.proofPoints.map((point) => (
            <span key={point} className="hero-proof-chip">
              {point}
            </span>
          ))}
        </div>

        <div className="hero-buttons">
          <button className="btn-signup hero-primary-button" onClick={onPrimaryCta}>
            {HERO_CONTENT.ctaLabel}
          </button>
        </div>
        <p className="hero-cta-subtext">{HERO_CONTENT.ctaSubtext}</p>
      </div>

      <div className="hero-visual" aria-label="Visual demonstration of how a child builds a game with AI">
        {HERO_VISUAL_STEPS.map((item, index) => (
          <article key={item.step} className="hero-visual-card">
            <div className="hero-visual-card-top">
              <span className="hero-visual-step">{item.step}</span>
              <span className="hero-visual-step-dot" />
            </div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            {renderVisualSurface(index)}
            <div className="hero-visual-chip-row">
              {item.chips.map((chip) => (
                <span key={chip} className="hero-visual-chip">
                  {chip}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
