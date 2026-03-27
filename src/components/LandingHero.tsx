import { HERO_CONTENT } from './landingContent';

interface LandingHeroProps {
  onPrimaryCta: () => void;
}

export default function LandingHero({ onPrimaryCta }: LandingHeroProps) {
  return (
    <section className="landing-hero" aria-labelledby="landing-hero-title">
      <div className="hero-shell">
        <div className="hero-copy">
          <h1 id="landing-hero-title" className="hero-headline">
            {HERO_CONTENT.headline}
          </h1>
          <p className="hero-subheadline">{HERO_CONTENT.subheadline}</p>

          <div className="hero-cta-group">
            <button type="button" className="hero-primary-button" onClick={onPrimaryCta}>
              {HERO_CONTENT.ctaLabel}
            </button>
            <p className="hero-support-copy">{HERO_CONTENT.ctaSupport}</p>
          </div>
        </div>

        <div className="hero-video-block">
          <p className="hero-video-label">{HERO_CONTENT.videoLabel}</p>
          <div className="hero-video-frame">
            <video
              className="hero-video"
              autoPlay
              muted
              playsInline
              controls
              preload="metadata"
              aria-label="How Vibe Code Kidz turns a game idea into a playable game"
            >
              <source src={HERO_CONTENT.videoSrc} type="video/mp4" />
            </video>
          </div>

          <div className="hero-video-cta-group">
            <button type="button" className="hero-primary-button hero-secondary-button" onClick={onPrimaryCta}>
              {HERO_CONTENT.ctaLabel}
            </button>
            <p className="hero-microcopy">{HERO_CONTENT.trustLine}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
