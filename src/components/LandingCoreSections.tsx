import {
  BENEFIT_ITEMS,
  FOUNDER_STORY,
  HERO_CONTENT,
  HOW_IT_WORKS_STEPS,
  MID_PAGE_CTA,
  TRUST_POINTS,
} from './landingContent';

interface LandingCoreSectionsProps {
  onCta: (buttonId: string, section?: string) => void;
}

export default function LandingCoreSections({ onCta }: LandingCoreSectionsProps) {
  return (
    <>
      <section className="how-it-works" id="how-it-works">
        <h2 className="section-heading">How It Works</h2>
        <p className="section-subheading">A simple way for kids to go from idea to playable game.</p>
        <div className="steps-row">
          {HOW_IT_WORKS_STEPS.map((step, index) => (
            <div key={step.title} className="step-card">
              <div className="step-number" aria-hidden="true">
                {step.icon}
              </div>
              <span className="step-label">Step {index + 1}</span>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-desc">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="benefits-section" id="benefits">
        <h2 className="section-heading">Why parents start the Free 30-Day Trial</h2>
        <p className="section-subheading">
          Clear value fast: creativity, learning, fun, and a product built for families.
        </p>
        <div className="parent-grid">
          {BENEFIT_ITEMS.map((item) => (
            <div key={item.title} className="parent-card benefit-card">
              <span className="parent-card-icon" aria-hidden="true">
                {item.icon}
              </span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mid-cta-section">
        <div className="mid-cta-card">
          <h2>{MID_PAGE_CTA.title}</h2>
          <p>{MID_PAGE_CTA.description}</p>
          <button className="section-cta" onClick={() => onCta('mid-page-cta', 'middle')}>
            {HERO_CONTENT.ctaLabel}
          </button>
          <p className="mid-cta-subtext">{HERO_CONTENT.ctaSubtext}</p>
        </div>
      </section>

      <section className="founder-story-section" id="founder-story">
        <h2 className="section-heading">{FOUNDER_STORY.title}</h2>
        <p className="section-subheading">
          An authentic story for parents who want AI to feel creative, safe, and easy to understand.
        </p>
        <div className="founder-story-card">
          <p>{FOUNDER_STORY.body}</p>
        </div>
        <div className="founder-story-points">
          {TRUST_POINTS.map((point) => (
            <div key={point.title} className="parent-card">
              <span className="parent-card-icon" aria-hidden="true">
                {point.icon}
              </span>
              <h3>{point.title}</h3>
              <p>{point.description}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
