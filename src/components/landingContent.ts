export interface LandingStep {
  icon: string;
  title: string;
  description: string;
}

export interface LandingBenefit {
  icon: string;
  title: string;
  description: string;
}

export interface LandingTrustPoint {
  icon: string;
  title: string;
  description: string;
}

export interface LandingPricePlan {
  id: string;
  name: string;
  price: string;
  period: string;
  featured?: boolean;
  badge?: string;
  features: string[];
}

export const HERO_CONTENT = {
  badge: 'Free 30-Day Trial',
  headline: 'Kids can build real video games with AI (no coding required)',
  subheadline: 'Turn screen time into creativity. Your child can go from idea to playable game in minutes.',
  ctaLabel: 'Start Free 30-Day Trial',
  ctaSubtext: 'No credit card required',
  proofPoints: ['Build games with AI', 'No coding required', 'Playable in minutes'],
};

export const HERO_VISUAL_STEPS = [
  {
    step: 'Step 1',
    title: 'A child types a game idea',
    description: '"Make a puppy adventure where I collect stars and dodge puddles."',
    chips: ['Plain English prompt', 'Kid-friendly'],
  },
  {
    step: 'Step 2',
    title: 'AI turns it into a real game',
    description: 'Vibe Code Kidz builds the characters, rules, and playable level in seconds.',
    chips: ['AI build', 'Real gameplay'],
  },
  {
    step: 'Step 3',
    title: 'They play, tweak, and share it',
    description: 'Kids test their game right away, then keep improving it and share it with friends.',
    chips: ['Playable instantly', 'Share when ready'],
  },
] as const;

export const HOW_IT_WORKS_STEPS: LandingStep[] = [
  {
    icon: '💬',
    title: 'Your child describes their game',
    description: 'They type an idea in everyday language, like a racing game, pet adventure, or obstacle course.',
  },
  {
    icon: '🤖',
    title: 'AI builds it instantly',
    description: 'Vibe Code Kidz turns that idea into a playable game they can click and test right away.',
  },
  {
    icon: '🎮',
    title: 'They play and share with friends',
    description: 'Kids keep improving their game, then share it when they are proud of what they made.',
  },
] as const;

export const BENEFIT_ITEMS: LandingBenefit[] = [
  {
    icon: '🎨',
    title: 'Creative screen time',
    description: 'Kids spend time making something original instead of only watching or scrolling.',
  },
  {
    icon: '🧠',
    title: 'Learning without frustration',
    description: 'They build logic, storytelling, and problem-solving skills while making real games.',
  },
  {
    icon: '⚡',
    title: 'Fast wins keep them engaged',
    description: 'A playable first version shows up quickly, which keeps excitement high from the start.',
  },
  {
    icon: '🛡️',
    title: 'Made for families',
    description: 'Kid-friendly guardrails and parent-friendly controls help the experience feel safe and approachable.',
  },
] as const;

export const FOUNDER_STORY = {
  title: 'Built by a teacher, designed for kids',
  body: 'I created Vibe Code Kidz after teaching students how to use AI and realizing all they wanted to do was build games. Existing tools were too complicated, so I built a platform just for them.',
};

export const TRUST_POINTS: LandingTrustPoint[] = [
  {
    icon: '🌟',
    title: 'Made for beginners',
    description: 'Kids can start with an idea they already have instead of learning adult software first.',
  },
  {
    icon: '👨‍👩‍👧',
    title: 'Parent-friendly by design',
    description: 'Families get a clearer path to safe, creative AI use instead of a confusing technical tool.',
  },
  {
    icon: '🚀',
    title: 'Real results in minutes',
    description: 'Children make a real playable game quickly, which makes the product easy to understand and trust.',
  },
] as const;

export const MID_PAGE_CTA = {
  title: 'Start a Free 30-Day Trial and let them make their first game today',
  description: 'Your child can go from an idea to a playable game before the excitement wears off.',
};

export const PRICING_PLANS: LandingPricePlan[] = [
  {
    id: 'trial',
    name: 'Free Trial',
    price: '$0',
    period: 'for 30 days',
    features: ['3 games per month', '10 AI prompts per day', 'Unlimited plays', 'Share to Arcade'],
  },
  {
    id: 'creator',
    name: 'Creator',
    price: '$13',
    period: 'per month after trial',
    featured: true,
    badge: 'Most Popular',
    features: ['15 games per month', '50 AI prompts per day', 'Unlimited plays', 'Share to Arcade', 'Priority support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$21',
    period: 'per month after trial',
    features: ['40 games per month', '80 AI prompts per day', 'Unlimited plays', 'Share to Arcade', 'Priority support'],
  },
] as const;
