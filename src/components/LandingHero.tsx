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
            <iframe
              className="hero-video"
              src={HERO_CONTENT.videoSrc}
              title="Playable example game built with Vibe Code Kidz"
              sandbox="allow-scripts allow-same-origin allow-pointer-lock"
            />
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
