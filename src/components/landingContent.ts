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

export interface LandingQuestion {
  question: string;
  answer: string;
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

export const LANDING_QUESTIONS: LandingQuestion[] = [
  {
    question: 'What does my child actually do?',
    answer: 'They type a game idea in plain English, watch AI build it, then play and improve the game right away.',
  },
  {
    question: 'Do they need coding experience?',
    answer: 'No. Kids can start by describing what they want to make, and the platform handles the heavy lifting.',
  },
  {
    question: 'How fast can they get started?',
    answer:
      'Most families can get from landing page to first game in just a few minutes, with less than 60 seconds to begin.',
  },
  {
    question: 'Does it work in the browser?',
    answer: 'Yes. It runs instantly in the browser, so there is nothing extra to install before trying it.',
  },
  {
    question: 'What kinds of games can they make?',
    answer: 'Kids can create platformers, racers, obstacle games, adventures, and other ideas they come up with.',
  },
  {
    question: 'Can they share what they build?',
    answer: 'Yes. Once they make a game they like, they can play it instantly and share it with family and friends.',
  },
] as const;

export const FINAL_CTA_CONTENT = {
  headline: 'Start building your first game today',
  ctaLabel: 'Try it Free',
  subtext: 'Takes less than 60 seconds to get started',
};
