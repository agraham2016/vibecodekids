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

export interface LandingHighlight {
  icon: string;
  title: string;
  description: string;
}

export interface LandingChecklistPoint {
  icon: string;
  text: string;
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
  headline: "Turn your kid's imagination into a real video game in minutes",
  patternInterrupt: 'No coding. No downloads. Just imagination.',
  subheadline:
    'Instead of just consuming screen time, kids can create obstacle courses, racing games, platformers, and more right in the browser.',
  ctaLabel: 'Start Free 30-Day Trial',
  ctaUrgency: 'Takes less than 60 seconds to start',
  ctaSubtext: 'No credit card required',
  proofPoints: ['Works in your browser', 'Built for ages 8+', 'First game in minutes'],
};

export const HERO_VISUAL_STEPS = [
  {
    step: 'Step 1',
    title: 'Type an idea',
    description: 'Kids describe the game they want in everyday words.',
    chips: ['Prompt', 'Plain English'],
  },
  {
    step: 'Step 2',
    title: 'Watch it build',
    description: 'The builder turns that idea into characters, rules, and a playable level.',
    chips: ['Characters', 'Gameplay'],
  },
  {
    step: 'Step 3',
    title: 'Play it right away',
    description: 'Kids test what they made, tweak it, and keep building confidence.',
    chips: ['Playable', 'Made by them'],
  },
] as const;

export const HOW_IT_WORKS_STEPS: LandingStep[] = [
  {
    icon: '💬',
    title: 'Your child describes their game',
    description: 'They type an idea in everyday language, like a racer, obstacle course, or pet adventure.',
  },
  {
    icon: '🤖',
    title: 'The game comes to life in minutes',
    description: 'Vibe Code Kidz turns that idea into something playable they can click and test right away.',
  },
  {
    icon: '🎮',
    title: 'They play, improve, and feel proud',
    description: 'Kids keep shaping the game until it feels like theirs, then share it when they are ready.',
  },
] as const;

export const BENEFIT_ITEMS: LandingBenefit[] = [
  {
    icon: '🎨',
    title: 'Creative screen time',
    description: 'Kids spend time making something original instead of only watching, swiping, or scrolling.',
  },
  {
    icon: '🏆',
    title: 'Confidence from building real things',
    description: 'A playable game gives kids a fast win they can point to, improve, and feel proud of.',
  },
  {
    icon: '🧠',
    title: 'Learning by making',
    description: 'They build logic, creativity, and problem-solving skills while creating games they care about.',
  },
  {
    icon: '⚡',
    title: 'Easy for parents to say yes to',
    description: 'It runs in the browser, feels approachable, and gets kids to a first game quickly.',
  },
] as const;

export const FOUNDER_STORY = {
  title: 'Built by a teacher who wanted kids creating faster',
  body: 'I created Vibe Code Kidz after teaching students how to use new tools and seeing the same thing over and over: they wanted to make games, but most software felt too technical. This was built so kids could start with imagination, get a quick win, and keep creating.',
};

export const TRUST_POINTS: LandingTrustPoint[] = [
  {
    icon: '🌟',
    title: 'Made for beginners',
    description: 'Kids can start with an idea they already have instead of learning complicated software first.',
  },
  {
    icon: '👨‍👩‍👧',
    title: 'Parent-friendly by design',
    description: 'Families get a simple, creative starting point instead of a confusing technical experience.',
  },
  {
    icon: '🚀',
    title: 'Real results in minutes',
    description: 'Children make a real playable game quickly, which makes the value easy for parents to see.',
  },
] as const;

export const MID_PAGE_CTA = {
  title: 'Start the Free 30-Day Trial and let them build their first game today',
  description: 'Most families can get started in under a minute, and kids can reach a first playable game in minutes.',
};

export const CREATION_HIGHLIGHTS: LandingHighlight[] = [
  {
    icon: '🕹️',
    title: 'Mario-style platformers',
    description: 'Kids build run-and-jump levels with coins, checkpoints, and their own creative twists.',
  },
  {
    icon: '🧗',
    title: 'Obstacle challenges',
    description: 'Design dodge, jump, and survive courses that feel like the challenge games kids already love.',
  },
  {
    icon: '🏎️',
    title: 'Racing games',
    description: 'Create fast tracks, boost pads, and fun themes that make every lap feel like their own idea.',
  },
  {
    icon: '⚔️',
    title: 'Battle arenas',
    description: 'Build action-packed arenas with custom goals, hazards, and characters they can test right away.',
  },
] as const;

export const PARENT_REASSURANCE_POINTS: LandingChecklistPoint[] = [
  { icon: '✓', text: 'No coding required' },
  { icon: '✓', text: 'Works directly in your browser' },
  { icon: '✓', text: 'Built for ages 8+' },
  { icon: '✓', text: 'Kids can create their first game in minutes' },
] as const;

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
