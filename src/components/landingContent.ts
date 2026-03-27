export interface LandingStep {
  icon: string;
  title: string;
  description: string;
}

export interface LandingCard {
  icon: string;
  title: string;
  description: string;
}

export const HERO_CONTENT = {
  headline: 'Build Your First Game in Minutes',
  subheadline: 'Just describe your idea. AI builds it. You play it.',
  ctaLabel: 'Start Free',
  ctaSupport: 'Takes less than 60 seconds to start',
  trustLine: 'No coding required. No experience needed.',
  videoLabel: 'Watch a real game get built in under 3 minutes',
  videoSrc: '/videos/how-it-works.mp4',
};

export const HOW_IT_WORKS_STEPS: LandingStep[] = [
  {
    icon: '01',
    title: 'Type an idea',
    description: 'Describe the game in plain English',
  },
  {
    icon: '02',
    title: 'AI builds it',
    description: 'Characters, rules, and gameplay are generated instantly',
  },
  {
    icon: '03',
    title: 'Play instantly',
    description: 'Launch and play your game right away',
  },
] as const;

export const REFRAME_CONTENT = {
  headline: 'Not just screen time… creation time',
  bullets: ['Builds creativity', 'Encourages problem-solving', 'Teaches real-world tech thinking'],
};

export const SOCIAL_PROOF_CARDS: LandingCard[] = [
  {
    icon: '★',
    title: 'Testimonials',
    description: 'Add short parent quotes here about how quickly kids understood the product and built a first game.',
  },
  {
    icon: '▶',
    title: 'Student creations',
    description: 'Show real playable games from the Arcade here so families can see the quality immediately.',
  },
  {
    icon: '#',
    title: 'Usage stats',
    description: 'Reserve this spot for future proof like games built, repeat creators, or weekly family activity.',
  },
] as const;

export const FINAL_CTA_CONTENT = {
  headline: 'Start building your first game today',
  ctaLabel: 'Try it Free',
  subtext: 'Takes less than 60 seconds to get started',
};
