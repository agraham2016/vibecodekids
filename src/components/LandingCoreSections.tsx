import { FINAL_CTA_CONTENT, HOW_IT_WORKS_STEPS, REFRAME_CONTENT, SOCIAL_PROOF_CARDS } from './landingContent';

interface LandingCoreSectionsProps {
  onCta: (buttonId: string, section?: string) => void;
}

export default function LandingCoreSections({ onCta }: LandingCoreSectionsProps) {
  return (
    <>
      <section className="landing-section how-it-works" id="how-it-works">
        <h2 className="section-heading">How It Works</h2>
        <div className="steps-grid">
          {HOW_IT_WORKS_STEPS.map((step) => (
            <article key={step.title} className="step-card">
              <div className="step-icon" aria-hidden="true">
                {step.icon}
              </div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-desc">{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section reframe-section" id="creation-time">
        <div className="reframe-panel">
          <div className="reframe-copy">
            <h2 className="section-heading section-heading-left">{REFRAME_CONTENT.headline}</h2>
            <p className="section-subheading section-subheading-left">
              Parents can immediately see that this is about making, thinking, and creating something real.
            </p>
          </div>
          <ul className="reframe-list" aria-label="Parent benefits">
            {REFRAME_CONTENT.bullets.map((bullet) => (
              <li key={bullet} className="reframe-item">
                <span className="reframe-check" aria-hidden="true">
                  +
                </span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="landing-section social-proof-section" id="social-proof">
        <h2 className="section-heading">Social proof space for real family wins</h2>
        <p className="section-subheading">
          This section is ready for testimonials, student creations, and usage stats as soon as those assets are
          finalized.
        </p>
        <div className="proof-grid">
          {SOCIAL_PROOF_CARDS.map((card) => (
            <article key={card.title} className="proof-card">
              <div className="proof-icon" aria-hidden="true">
                {card.icon}
              </div>
              <h3 className="proof-title">{card.title}</h3>
              <p className="proof-desc">{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section final-cta-section">
        <h2 className="section-heading">{FINAL_CTA_CONTENT.headline}</h2>
        <button type="button" className="section-cta" onClick={() => onCta('final-cta', 'final')}>
          {FINAL_CTA_CONTENT.ctaLabel}
        </button>
        <p className="final-cta-subtext">{FINAL_CTA_CONTENT.subtext}</p>
      </section>
    </>
  );
}
