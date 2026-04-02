import DemoBuilder from './DemoBuilder';
import { HERO_CONTENT } from './landingContent';

interface LandingHeroProps {
  onPrimaryCta: () => void;
  onSignupClick: () => void;
}

export default function LandingHero({ onPrimaryCta, onSignupClick }: LandingHeroProps) {
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

        <div className="hero-demo-wrap">
          <p className="hero-video-label">{HERO_CONTENT.videoLabel}</p>
          <DemoBuilder onSignupClick={onSignupClick} variant="hero" />
          <p className="hero-microcopy">{HERO_CONTENT.trustLine}</p>
        </div>
      </div>
    </section>
  );
}
