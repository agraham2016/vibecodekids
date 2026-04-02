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
  subheadline: 'Type a game idea. AI builds it. Play it in your browser. No coding needed.',
  ctaLabel: 'Make a Game Now',
  ctaSupport: 'No account needed to start. Build and play your first game in minutes.',
  trustLine: 'Built for kids. Simple for families. No coding required.',
  videoLabel: 'Pick a quick starter or type your own game idea',
};

export const HOW_IT_WORKS_STEPS: LandingStep[] = [
  {
    icon: '01',
    title: 'Describe your game',
    description: 'Pick a starter or type your own 2D game idea in plain English',
  },
  {
    icon: '02',
    title: 'AI builds it',
    description: 'AI turns the idea into a playable game in the browser',
  },
  {
    icon: '03',
    title: 'Play & share',
    description: 'Play it right away, then save it and share it with friends and family',
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
    answer: 'They can start right on this page with no account needed. First game built in minutes.',
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
    answer:
      'Yes. Designed for kids and families with safety filters, parent-aware signup, and age-appropriate experiences.',
  },
] as const;

export const FINAL_CTA_CONTENT = {
  headline: 'Ready to make your first game?',
  ctaLabel: 'Make a Game Now',
  subtext: 'No account needed to start',
};

export const COMING_SOON_CONTENT = {
  badge: 'Available now: 2D games',
  headline: 'Start with games. Create even more soon.',
  subheadline:
    "Today, kids can build 2D games in minutes. Coming soon, they'll be able to create even more with Vibe Code Kidz.",
  closingLine: 'Start creating with 2D games today — and grow with new creative modes as Vibe Code Kidz expands.',
  items: [
    { icon: '3D', title: '3D Games', description: 'Bigger worlds, new views, and more ways to play' },
    { icon: 'APP', title: 'Apps', description: 'Simple tools, quizzes, and kid-friendly app ideas' },
    { icon: 'MUSIC', title: 'Music', description: 'Make beats, soundboards, and musical creations' },
    { icon: 'BOT', title: 'Robotics', description: 'Creative build modes inspired by robotics experiences' },
    { icon: 'FX', title: 'Animations', description: 'Bring stories and characters to life with motion' },
    { icon: 'STORY', title: 'Interactive Stories', description: 'Create stories kids can click through and explore' },
    { icon: 'WORLD', title: 'Digital Worlds', description: 'Build places, scenes, and playful worlds to explore' },
    { icon: 'AI', title: 'Smart Characters', description: 'Give creations personalities, voices, and more reactions' },
  ],
};
