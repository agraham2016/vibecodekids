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
  headline: 'Build Your First 2D Game in Minutes',
  subheadline: 'Describe a 2D game idea. AI builds it. They play it instantly in the browser. No coding needed.',
  ctaLabel: 'Try It Now',
  ctaSupport: 'No account needed to try. Build and play your first game in minutes.',
  trustLine: 'Built for kids. Simple for families. No coding required.',
  videoLabel: 'Play a real example game, then build your own',
  videoSrc: '/demo-rocket-dodge.html',
};

export const HOW_IT_WORKS_STEPS: LandingStep[] = [
  {
    icon: '01',
    title: 'Describe your game',
    description: 'Tell the AI what kind of game you want — zombie survival, space shooter, racing, puzzles & more',
  },
  {
    icon: '02',
    title: 'AI builds it',
    description: 'Your game is generated with real graphics, controls, and gameplay — ready to play',
  },
  {
    icon: '03',
    title: 'Play & share',
    description: 'Play it instantly in your browser, then share it with friends and family',
  },
] as const;

export const REFRAME_CONTENT = {
  headline: 'Not just screen time… creation time',
  bullets: [
    'Builds creativity and game design thinking',
    'Encourages problem-solving',
    'Teaches real-world tech skills',
  ],
};

export const LANDING_QUESTIONS: LandingQuestion[] = [
  {
    question: 'What does my child actually do?',
    answer:
      'They describe a game idea in plain English — like "make a zombie survival game" — watch AI build it, then play and improve it right away.',
  },
  {
    question: 'Do they need coding experience?',
    answer: 'No. Kids just describe what they want and the AI handles all the code. They play, tweak, and iterate.',
  },
  {
    question: 'How fast can they get started?',
    answer: 'They can try it right now on this page — no account needed. First game built in minutes.',
  },
  {
    question: 'Does it work in the browser?',
    answer: 'Yes. Games run instantly in the browser with real graphics and controls. Nothing to install.',
  },
  {
    question: 'What kinds of games can they make?',
    answer: 'Kids can create 2D platformers, shooters, racing games, puzzles, RPGs, tycoon games, and more right now.',
  },
  {
    question: 'Can they share what they build?',
    answer: 'Yes. Games go to the Arcade where friends and family can play them.',
  },
  {
    question: 'Is it safe for kids?',
    answer: 'Yes. Built for kids and families with content safety, COPPA compliance, and parental controls.',
  },
] as const;

export const FINAL_CTA_CONTENT = {
  headline: 'Ready to build your first game?',
  ctaLabel: 'Try It Now',
  subtext: 'No signup required to try',
};
