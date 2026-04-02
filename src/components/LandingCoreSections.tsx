import { FINAL_CTA_CONTENT, HOW_IT_WORKS_STEPS, LANDING_QUESTIONS, REFRAME_CONTENT } from './landingContent';

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
              Your child isn't just playing games — they're designing them. That's real creative thinking.
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

      <section className="landing-section qa-section" id="questions">
        <h2 className="section-heading">Questions parents usually ask</h2>
        <p className="section-subheading">Quick answers that reduce friction before a family clicks start.</p>
        <div className="qa-grid">
          {LANDING_QUESTIONS.map((item) => (
            <article key={item.question} className="qa-card">
              <p className="qa-question">{item.question}</p>
              <p className="qa-answer">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section final-cta-section">
        <h2 className="section-heading">{FINAL_CTA_CONTENT.headline}</h2>
        <button type="button" className="section-cta" onClick={() => onCta('final-cta', 'final-cta')}>
          {FINAL_CTA_CONTENT.ctaLabel}
        </button>
        <p className="final-cta-subtext">{FINAL_CTA_CONTENT.subtext}</p>
      </section>
    </>
  );
}
