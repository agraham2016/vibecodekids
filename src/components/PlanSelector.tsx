import './PlanSelector.css'

interface PlanSelectorProps {
  selectedPlan: 'free' | 'creator' | 'pro'
  onSelectPlan: (plan: 'free' | 'creator' | 'pro') => void
  onContinue: () => void
  onBack: () => void
}

const PLANS = [
  {
    id: 'free' as const,
    name: 'Free Trial',
    price: 0,
    icon: '⭐',
    description: '30 days to try it out',
    features: [
      '3 games per month',
      '10 prompts per day',
      'Share to Arcade',
      '30-day access'
    ],
    notIncluded: [
      'AI Cover Art',
      'Premium Assets'
    ]
  },
  {
    id: 'creator' as const,
    name: 'Creator',
    price: 13,
    icon: '🚀',
    popular: true,
    description: 'For aspiring game makers',
    features: [
      '15 games per month',
      '50 prompts per day',
      '5 AI Cover Arts',
      'Premium Assets',
      'Priority support'
    ],
    notIncluded: [
      'AI Game Sprites'
    ]
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: 21,
    icon: '👑',
    description: 'For serious creators',
    features: [
      '40 games per month',
      '80 prompts per day',
      '20 AI Cover Arts',
      '10 AI Sprite Sets',
      'Premium Assets',
      'Priority support'
    ],
    notIncluded: []
  }
]

export default function PlanSelector({ selectedPlan, onSelectPlan, onContinue, onBack }: PlanSelectorProps) {
  return (
    <div className="plan-selector">
      <div className="plan-header">
        <h2>Choose Your Plan</h2>
        <p>Select the plan that's right for you</p>
      </div>

      <div className="plans-grid">
        {PLANS.map(plan => (
          <div 
            key={plan.id}
            className={`plan-card ${selectedPlan === plan.id ? 'selected' : ''} ${plan.popular ? 'popular' : ''}`}
            onClick={() => onSelectPlan(plan.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectPlan(plan.id); } }}
          >
            {plan.popular && <span className="popular-badge">MOST POPULAR</span>}
            
            <div className="plan-icon">{plan.icon}</div>
            <h3 className="plan-name">{plan.name}</h3>
            
            <div className="plan-price">
              {plan.price === 0 ? (
                <span className="price-free">Free</span>
              ) : (
                <>
                  <span className="price-amount">${plan.price}</span>
                  <span className="price-period">/month</span>
                </>
              )}
            </div>
            
            <p className="plan-description">{plan.description}</p>
            
            <ul className="plan-features">
              {plan.features.map((feature, i) => (
                <li key={i} className="feature-included">
                  <span className="feature-icon">✓</span>
                  {feature}
                </li>
              ))}
              {plan.notIncluded.map((feature, i) => (
                <li key={i} className="feature-not-included">
                  <span className="feature-icon">✗</span>
                  {feature}
                </li>
              ))}
            </ul>
            
            <div className="plan-select-indicator">
              {selectedPlan === plan.id ? '✓ Selected' : 'Select'}
            </div>
          </div>
        ))}
      </div>

      <div className="plan-actions">
        <button className="btn-back" onClick={onBack}>
          ← Back
        </button>
        <button className="btn-continue" onClick={onContinue}>
          Continue with {PLANS.find(p => p.id === selectedPlan)?.name} →
        </button>
      </div>

      <p className="plan-note">
        {selectedPlan === 'free' 
          ? 'No credit card required — 30-day free trial'
          : 'Secure payment powered by Stripe'}
      </p>
    </div>
  )
}
