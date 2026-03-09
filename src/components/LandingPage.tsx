import { useState, useEffect, useCallback, useRef } from 'react';
import { trackPageView, trackCtaClick } from '../lib/marketingEvents';
import './LandingPage.css';

interface LandingPageProps {
  onLoginClick: () => void;
  onSignupClick: () => void;
}

interface FeaturedGame {
  id: string;
  title: string;
  creatorName?: string;
  displayName?: string;
  views?: number;
  genre?: string;
}

const DEMO_SCENARIOS = [
  {
    prompt: 'Make me a platformer with a dinosaur that collects gems!',
    aiReply: "Let's build it! Here's your dino platformer with gem collecting, jumping physics, and a score counter!",
    label: 'Platformer',
    bg: 'linear-gradient(180deg, #87CEEB 0%, #87CEEB 60%, #5B8C3E 60%, #4a7a30 100%)',
    elements: [
      { emoji: '🦕', className: 'demo-player demo-bounce', style: { bottom: '42%', left: '22%', fontSize: '2.4rem' } },
      { emoji: '💎', className: 'demo-item demo-float', style: { bottom: '62%', left: '55%', fontSize: '1.4rem' } },
      {
        emoji: '💎',
        className: 'demo-item demo-float-delay',
        style: { bottom: '72%', left: '75%', fontSize: '1.4rem' },
      },
      { emoji: '💎', className: 'demo-item demo-float', style: { bottom: '55%', left: '35%', fontSize: '1.2rem' } },
      { emoji: '☁️', className: 'demo-cloud demo-drift', style: { top: '10%', left: '15%', fontSize: '2rem' } },
      { emoji: '☁️', className: 'demo-cloud demo-drift-delay', style: { top: '5%', left: '65%', fontSize: '1.6rem' } },
    ],
    platforms: [
      { style: { bottom: '38%', left: '10%', width: '30%' } },
      { style: { bottom: '50%', left: '45%', width: '25%' } },
      { style: { bottom: '62%', left: '68%', width: '22%' } },
    ],
    scoreText: 'GEMS: 3  LIVES: 3',
  },
  {
    prompt: 'I want a space blaster where I blast aliens!',
    aiReply: 'Launching your space blaster! Fly your ship, blast alien waves, and rack up your high score!',
    label: 'Space Blaster',
    bg: 'linear-gradient(180deg, #0a0a20 0%, #1a0a40 100%)',
    elements: [
      { emoji: '🚀', className: 'demo-player demo-hover', style: { bottom: '15%', left: '45%', fontSize: '2.4rem' } },
      { emoji: '👾', className: 'demo-enemy demo-sway', style: { top: '15%', left: '20%', fontSize: '1.8rem' } },
      { emoji: '👾', className: 'demo-enemy demo-sway-delay', style: { top: '12%', left: '50%', fontSize: '1.8rem' } },
      { emoji: '👾', className: 'demo-enemy demo-sway', style: { top: '18%', left: '75%', fontSize: '1.8rem' } },
      {
        emoji: '✦',
        className: 'demo-star demo-twinkle',
        style: { top: '30%', left: '10%', fontSize: '0.5rem', color: '#fff' },
      },
      {
        emoji: '✦',
        className: 'demo-star demo-twinkle-delay',
        style: { top: '50%', left: '80%', fontSize: '0.4rem', color: '#fff' },
      },
      {
        emoji: '✦',
        className: 'demo-star demo-twinkle',
        style: { top: '70%', left: '30%', fontSize: '0.3rem', color: '#fff' },
      },
      {
        emoji: '✦',
        className: 'demo-star demo-twinkle-delay',
        style: { top: '25%', left: '90%', fontSize: '0.6rem', color: '#fff' },
      },
    ],
    platforms: [],
    scoreText: 'SCORE: 2400  WAVE: 3',
  },
  {
    prompt: 'Make a snake game where I eat apples and grow!',
    aiReply: "Classic snake coming up! Arrow keys to move, eat apples to grow longer, and don't hit your tail!",
    label: 'Snake',
    bg: 'linear-gradient(180deg, #0f1923 0%, #1a2a3a 100%)',
    elements: [
      { emoji: '🟢', className: 'demo-static', style: { top: '40%', left: '35%', fontSize: '1.2rem' } },
      { emoji: '🟢', className: 'demo-static', style: { top: '40%', left: '40%', fontSize: '1.2rem' } },
      { emoji: '🟢', className: 'demo-static', style: { top: '40%', left: '45%', fontSize: '1.2rem' } },
      { emoji: '🟢', className: 'demo-static', style: { top: '40%', left: '50%', fontSize: '1.2rem' } },
      { emoji: '🟩', className: 'demo-static', style: { top: '40%', left: '55%', fontSize: '1.3rem' } },
      { emoji: '🍎', className: 'demo-item demo-pulse', style: { top: '25%', left: '70%', fontSize: '1.4rem' } },
    ],
    platforms: [],
    scoreText: 'LENGTH: 5  SCORE: 40',
  },
];

const GAME_TEMPLATES = [
  {
    title: 'Jump & Run',
    genre: 'Platformer',
    description: 'Hop across platforms and collect coins',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    sprite: '/assets/sprites/platformer/player.png',
    emoji: '🏃',
  },
  {
    title: 'Space Blaster',
    genre: 'Space Blaster',
    description: 'Blast aliens and dodge enemy fire',
    gradient: 'linear-gradient(180deg, #0a0a20 0%, #1a0a50 100%)',
    sprite: '/assets/sprites/shooter/ship.png',
    emoji: '🚀',
  },
  {
    title: 'Speed Racer',
    genre: 'Racing',
    description: 'Dodge traffic and race to the finish',
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    sprite: '/assets/sprites/racing/car-player.png',
    emoji: '🏎️',
  },
  {
    title: 'Road Crosser',
    genre: 'Frogger',
    description: 'Hop across busy lanes to safety',
    gradient: 'linear-gradient(135deg, #1a472a 0%, #2d6a4f 50%, #40916c 100%)',
    sprite: '/assets/sprites/frogger/frog.png',
    emoji: '🐸',
  },
  {
    title: 'Gem Match',
    genre: 'Puzzle',
    description: 'Match colorful gems to score big',
    gradient: 'linear-gradient(135deg, #4a1a6b 0%, #2a1040 50%, #6b21a8 100%)',
    sprite: '/assets/sprites/puzzle/gems.png',
    emoji: '💎',
  },
  {
    title: 'Tap Frenzy',
    genre: 'Clicker',
    description: 'Click the gem, buy upgrades, go wild',
    gradient: 'linear-gradient(135deg, #1a0533 0%, #2d1b69 50%, #4c1d95 100%)',
    sprite: '/assets/sprites/clicker/gem.png',
    emoji: '👆',
  },
  {
    title: 'Adventure Quest',
    genre: 'RPG',
    description: 'Explore, find treasure, talk to NPCs',
    gradient: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 50%, #52b788 100%)',
    sprite: '/assets/sprites/rpg/hero.png',
    emoji: '⚔️',
  },
  {
    title: 'Endless Runner',
    genre: 'Runner',
    description: 'Run, jump, and dodge obstacles at top speed',
    gradient: 'linear-gradient(135deg, #ff6b35 0%, #f7c948 50%, #1a1a2e 100%)',
    sprite: '/assets/sprites/endless-runner/player.png',
    emoji: '🏃‍♂️',
  },
  {
    title: 'Tower Defense',
    genre: 'Strategy',
    description: 'Place towers and defend against enemy waves',
    gradient: 'linear-gradient(135deg, #2d3436 0%, #636e72 50%, #00b894 100%)',
    sprite: '/assets/sprites/tower-defense/tower.png',
    emoji: '🏰',
  },
  {
    title: "Beat 'Em Up",
    genre: 'Fighting',
    description: 'Punch and kick your way through enemies',
    gradient: 'linear-gradient(135deg, #d63031 0%, #e17055 50%, #2d3436 100%)',
    sprite: '/assets/sprites/fighting/fighter.png',
    emoji: '🥊',
  },
  {
    title: 'Snake',
    genre: 'Classic',
    description: 'Eat food, grow longer, avoid your tail',
    gradient: 'linear-gradient(135deg, #00b894 0%, #00cec9 50%, #0984e3 100%)',
    sprite: '/assets/sprites/snake/head.png',
    emoji: '🐍',
  },
  {
    title: 'Soccer',
    genre: 'Sports',
    description: 'Score goals and beat the AI opponent',
    gradient: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 50%, #1abc9c 100%)',
    sprite: '/assets/sprites/sports/ball.png',
    emoji: '⚽',
  },
  {
    title: 'Brick Breaker',
    genre: 'Arcade',
    description: 'Smash bricks with a bouncing ball',
    gradient: 'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 50%, #fd79a8 100%)',
    sprite: '/assets/sprites/brick-breaker/paddle.png',
    emoji: '🧱',
  },
  {
    title: 'Flappy Bird',
    genre: 'Casual',
    description: 'Tap to fly through the pipes',
    gradient: 'linear-gradient(135deg, #74b9ff 0%, #a29bfe 50%, #55efc4 100%)',
    sprite: '/assets/sprites/flappy/bird.png',
    emoji: '🐦',
  },
  {
    title: 'Bubble Pop',
    genre: 'Puzzle',
    description: 'Aim and pop matching colored bubbles',
    gradient: 'linear-gradient(135deg, #fd79a8 0%, #e84393 50%, #6c5ce7 100%)',
    sprite: '/assets/sprites/bubble-shooter/bubbles.png',
    emoji: '🫧',
  },
  {
    title: 'Block Stack',
    genre: 'Puzzle',
    description: 'Stack falling blocks and clear full lines',
    gradient: 'linear-gradient(135deg, #0984e3 0%, #6c5ce7 50%, #00cec9 100%)',
    sprite: '/assets/sprites/falling-blocks/blocks.png',
    emoji: '🟦',
  },
  {
    title: 'Rhythm Beats',
    genre: 'Music',
    description: 'Hit the arrows to the beat of the music',
    gradient: 'linear-gradient(135deg, #e84393 0%, #fd79a8 50%, #fdcb6e 100%)',
    sprite: '/assets/sprites/rhythm/arrows.png',
    emoji: '🎵',
  },
  {
    title: 'Pet Buddy',
    genre: 'Sim',
    description: 'Feed, play with, and care for your pet',
    gradient: 'linear-gradient(135deg, #fdcb6e 0%, #f39c12 50%, #e17055 100%)',
    sprite: '/assets/sprites/pet-sim/pet.png',
    emoji: '🐾',
  },
  {
    title: 'Paddle Bounce',
    genre: 'Arcade',
    description: 'Bounce the ball past your paddle—how long can you last?',
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    sprite: '/assets/sprites/brick-breaker/paddle.png',
    emoji: '🏓',
  },
  {
    title: 'Catch & Dodge',
    genre: 'Arcade',
    description: 'Catch the good stuff, dodge the rest',
    gradient: 'linear-gradient(135deg, #fd79a8 0%, #e84393 50%, #6c5ce7 100%)',
    sprite: '/assets/sprites/common/star.png',
    emoji: '🍎',
  },
  {
    title: 'Whack-a-Mole',
    genre: 'Arcade',
    description: 'Tap the targets before they disappear',
    gradient: 'linear-gradient(135deg, #e84393 0%, #fd79a8 50%, #fdcb6e 100%)',
    sprite: '/assets/sprites/common/star.png',
    emoji: '👊',
  },
  {
    title: 'Memory Match',
    genre: 'Puzzle',
    description: 'Flip cards to find matching pairs',
    gradient: 'linear-gradient(135deg, #4a1a6b 0%, #2a1040 100%)',
    sprite: '/assets/sprites/puzzle/gems.png',
    emoji: '🃏',
  },
  {
    title: 'Maze Chase',
    genre: 'Arcade',
    description: 'Collect dots and avoid the chasers',
    gradient: 'linear-gradient(135deg, #0a3d62 0%, #0c2461 100%)',
    sprite: '/assets/sprites/common/star.png',
    emoji: '👻',
  },
  {
    title: 'Top-Down Shooter',
    genre: 'Action',
    description: 'Move and shoot in all directions',
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    sprite: '/assets/sprites/shooter/ship.png',
    emoji: '🎯',
  },
  {
    title: 'Simple Fishing',
    genre: 'Casual',
    description: 'Cast your line and reel in the catch',
    gradient: 'linear-gradient(180deg, #74b9ff 0%, #0984e3 60%, #0a3d62 100%)',
    sprite: '/assets/sprites/common/star.png',
    emoji: '🎣',
  },
  {
    title: 'Simon Says',
    genre: 'Puzzle',
    description: 'Watch and repeat the pattern',
    gradient: 'linear-gradient(135deg, #2d3436 0%, #636e72 100%)',
    sprite: '/assets/sprites/common/star.png',
    emoji: '🔮',
  },
  {
    title: 'Treasure Diver',
    genre: 'Action',
    description: 'Dive deep, grab gems, dodge jellyfish',
    gradient: 'linear-gradient(135deg, #0077b6 0%, #00b4d8 50%, #90e0ef 100%)',
    sprite: '/assets/sprites/common/star.png',
    emoji: '🤿',
  },
  {
    title: 'Trash Sorter',
    genre: 'Reflex',
    description: 'Sort recycling, compost, and trash before time runs out',
    gradient: 'linear-gradient(135deg, #2d6a4f 0%, #52b788 50%, #95d5b2 100%)',
    sprite: '/assets/sprites/common/star.png',
    emoji: '♻️',
  },
  {
    title: 'Fruit Slice',
    genre: 'Arcade',
    description: 'Slice the fruit, skip the bombs',
    gradient: 'linear-gradient(135deg, #d62828 0%, #f77f00 50%, #fcbf49 100%)',
    sprite: '/assets/sprites/common/star.png',
    emoji: '🍉',
  },
  {
    title: 'Tower Stack',
    genre: 'Precision',
    description: 'Stack blocks as high as you can',
    gradient: 'linear-gradient(135deg, #4361ee 0%, #7209b7 50%, #f72585 100%)',
    sprite: '/assets/sprites/common/star.png',
    emoji: '🏗️',
  },
  {
    title: 'Find the Friend',
    genre: 'Seek',
    description: 'Spot the hidden friend before time runs out',
    gradient: 'linear-gradient(135deg, #386641 0%, #6a994e 50%, #a7c957 100%)',
    sprite: '/assets/sprites/common/star.png',
    emoji: '🔍',
  },
];

const SHOWCASE_NAMES = [
  'Mia',
  'Jayden',
  'Zoe',
  'Ethan',
  'Luna',
  'Noah',
  'Ava',
  'Liam',
  'Chloe',
  'Oliver',
  'Sophia',
  'Mason',
];

function friendlyCreatorName(raw: string | undefined, index: number): string {
  if (!raw || /test/i.test(raw) || /^user/i.test(raw)) {
    return SHOWCASE_NAMES[index % SHOWCASE_NAMES.length];
  }
  return raw;
}

const FAQ_ITEMS = [
  {
    q: 'What is vibecoding?',
    a: 'Vibecoding is a new way to create games using AI. Your child simply describes the game they want in plain English — "make a platformer where a cat collects fish" — and our AI writes the actual game code. No programming knowledge needed. They learn game design, logic, and creativity while having fun.',
  },
  {
    q: 'Is this safe for my child?',
    a: 'Absolutely. VibeCode Kidz is fully COPPA compliant. We use AI content moderation to filter inappropriate requests, require parental consent for users under 13, and never collect more data than necessary. All games are limited to E-rated (Everyone) content — think Minecraft and Pokemon, not anything violent or scary.',
  },
  {
    q: 'What ages is this for?',
    a: 'VibeCode Kidz is designed for ages 7 to 18. Younger kids (7-10) can describe simple games and learn the basics, while older kids and teens can create increasingly complex projects. The AI adapts to their skill level.',
  },
  {
    q: 'Do kids actually learn to code?',
    a: 'Yes! While the AI writes the initial code, kids can see and edit the source code of every game they create. They learn computational thinking, game design principles, debugging, and how code works — all through hands-on creation rather than boring tutorials.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes, you can cancel your subscription at any time from your account settings. There are no contracts or cancellation fees. Your child keeps access through the end of the billing period.',
  },
  {
    q: 'Do you accept Arizona ESA funds?',
    a: 'Yes! VibeCode Kidz qualifies as an approved ESA educational technology expense. Arizona ESA families can pay with their ClassWallet funds. Visit our ESA page for details on quarterly and annual billing options.',
  },
];

export default function LandingPage({ onLoginClick, onSignupClick }: LandingPageProps) {
  const [demoIndex, setDemoIndex] = useState(0);
  const [typedPrompt, setTypedPrompt] = useState('');
  const [showAiReply, setShowAiReply] = useState(false);
  const [typedReply, setTypedReply] = useState('');
  const [phase, setPhase] = useState<'typing' | 'building' | 'done'>('typing');
  const [featuredGames, setFeaturedGames] = useState<FeaturedGame[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const [previewGameId, setPreviewGameId] = useState<string | null>(null);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);
  const pageRef = useRef<HTMLDivElement | null>(null);

  // Native click listener for path links — fixes tap/click not working on mobile (iOS/Android)
  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;
    const handleLink = (e: Event) => {
      const ev = e as MouseEvent;
      if (ev.button !== 0 || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
      const target = (e.target as HTMLElement).closest('a[href^="/"]:not([href^="//"])');
      if (!target) return;
      const href = (target as HTMLAnchorElement).getAttribute('href') || '';
      if (href && href !== '#' && (window.innerWidth <= 768 || 'ontouchstart' in window)) {
        e.preventDefault();
        e.stopPropagation();
        window.location.href = href;
      }
    };
    root.addEventListener('click', handleLink, true);
    return () => root.removeEventListener('click', handleLink, true);
  }, []);

  const handleFooterPathLink = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    const href = e.currentTarget.getAttribute('href') || '';
    if (href.startsWith('/') && !href.startsWith('//') && (window.innerWidth <= 768 || 'ontouchstart' in window)) {
      e.preventDefault();
      window.location.href = href;
    }
  }, []);

  const cleanupPreview = useCallback(() => {
    if (restartInterval.current) {
      clearInterval(restartInterval.current);
      restartInterval.current = null;
    }
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
    setPreviewGameId(null);
    setPreviewLoaded(false);
    previewIframeRef.current = null;
  }, []);

  const handleCardMouseEnter = useCallback((gameId: string) => {
    if ('ontouchstart' in window) return;
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => {
      if (restartInterval.current) clearInterval(restartInterval.current);
      setPreviewLoaded(false);
      setPreviewGameId(gameId);
      restartInterval.current = setInterval(() => {
        setPreviewLoaded(false);
        setPreviewGameId(null);
        setTimeout(() => setPreviewGameId(gameId), 100);
      }, 6000);
    }, 300);
  }, []);

  const handleCardMouseLeave = useCallback(() => {
    cleanupPreview();
  }, [cleanupPreview]);

  const scenario = DEMO_SCENARIOS[demoIndex];

  const startScenario = useCallback((index: number) => {
    setDemoIndex(index);
    setTypedPrompt('');
    setTypedReply('');
    setShowAiReply(false);
    setPhase('typing');
  }, []);

  // Demo typing animation
  useEffect(() => {
    const prompt = DEMO_SCENARIOS[demoIndex].prompt;
    if (phase !== 'typing') return;
    if (typedPrompt.length < prompt.length) {
      const speed = 25 + Math.random() * 20;
      const timer = setTimeout(() => setTypedPrompt(prompt.slice(0, typedPrompt.length + 1)), speed);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      setShowAiReply(true);
      setPhase('building');
    }, 400);
    return () => clearTimeout(timer);
  }, [typedPrompt, phase, demoIndex]);

  useEffect(() => {
    const reply = DEMO_SCENARIOS[demoIndex].aiReply;
    if (phase !== 'building') return;
    if (typedReply.length < reply.length) {
      const speed = 18 + Math.random() * 12;
      const timer = setTimeout(() => setTypedReply(reply.slice(0, typedReply.length + 1)), speed);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setPhase('done'), 300);
    return () => clearTimeout(timer);
  }, [typedReply, phase, demoIndex]);

  useEffect(() => {
    if (phase !== 'done') return;
    const timer = setTimeout(() => {
      startScenario((demoIndex + 1) % DEMO_SCENARIOS.length);
    }, 5000);
    return () => clearTimeout(timer);
  }, [phase, demoIndex, startScenario]);

  useEffect(() => {
    return () => cleanupPreview();
  }, [cleanupPreview]);

  // First-party marketing: page_view on mount (Elias approved)
  useEffect(() => {
    trackPageView();
  }, []);

  const handleCta = useCallback(
    (buttonId: string, section?: string) => {
      trackCtaClick(buttonId, section);
      onSignupClick();
    },
    [onSignupClick],
  );

  // Fetch featured games
  useEffect(() => {
    fetch('/api/gallery?limit=6')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const games = Array.isArray(data) ? data : data.games || [];
        setFeaturedGames(games.slice(0, 6));
      })
      .catch(() => {});
  }, []);

  // Nav scroll effect — direct DOM toggle to avoid React re-renders during scroll
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const nav = navRef.current;
        if (nav) {
          const scrolled = window.scrollY > 40;
          if (scrolled && !nav.classList.contains('nav-scrolled')) {
            nav.classList.add('nav-scrolled');
          } else if (!scrolled && nav.classList.contains('nav-scrolled')) {
            nav.classList.remove('nav-scrolled');
          }
        }
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div ref={pageRef} className="landing-page">
      <div className="landing-bg" />

      {/* ── 1. Sticky Nav ── */}
      <nav ref={navRef} className="landing-nav" aria-label="Main navigation">
        <div className="nav-inner">
          <a href="/" className="nav-logo-link">
            <img src="/images/logo.png?v=2" alt="VibeCode Kidz" className="nav-logo-img" />
          </a>
          <div className="nav-links">
            <a href="#how-it-works">How It Works</a>
            <a href="/gallery">Arcade</a>
            <a href="#pricing">Pricing</a>
            <a href="/esa">ESA</a>
            <a href="/contact">Contact</a>
          </div>
          <div className="nav-actions">
            <button className="nav-login" onClick={onLoginClick}>
              Log In
            </button>
            <button className="nav-cta" onClick={() => handleCta('nav-cta', 'nav')}>
              Get Started Free
            </button>
          </div>
        </div>
      </nav>

      <div className="landing-content" id="main-content">
        {/* ── 2. Hero ── */}
        <section className="landing-hero">
          <div className="hero-logo">
            <img src="/images/logo.png?v=2" alt="VibeCode Kidz" className="hero-logo-img" />
          </div>
          <h1 className="hero-headline">Your kid describes a game. AI builds it.</h1>
          <p className="hero-subtitle">No coding needed. Just imagination.</p>

          <div className="hero-features">
            <div className="feature">
              <span className="feature-icon">💬</span>
              <span>Chat with AI</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🎮</span>
              <span>Make Games</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🏆</span>
              <span>Share &amp; Play</span>
            </div>
          </div>

          <div className="hero-buttons">
            <button className="btn-signup" onClick={() => handleCta('btn-signup', 'hero')}>
              Get Started Free
            </button>
            <button className="btn-login" onClick={onLoginClick}>
              Log In
            </button>
          </div>

          <p className="hero-note">Start your free 30-day trial — 3 games and 10 prompts/day</p>
        </section>

        {/* ── 3. How It Works ── */}
        <section className="how-it-works" id="how-it-works">
          <h2 className="section-heading">How It Works</h2>
          <p className="section-subheading">From idea to playable game in under a minute</p>
          <div className="steps-row">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3 className="step-title">Describe Your Game</h3>
              <p className="step-desc">Tell the AI what you want in plain English — any game you can imagine.</p>
            </div>
            <div className="step-connector" />
            <div className="step-card">
              <div className="step-number">2</div>
              <h3 className="step-title">AI Builds It</h3>
              <p className="step-desc">Watch your game come to life in seconds with real, working code.</p>
            </div>
            <div className="step-connector" />
            <div className="step-card">
              <div className="step-number">3</div>
              <h3 className="step-title">Play &amp; Share</h3>
              <p className="step-desc">Test it instantly, tweak it with more prompts, and publish to the Arcade.</p>
            </div>
          </div>
        </section>

        {/* ── 4. Live Demo (existing) ── */}
        <section className="live-demo-section">
          <h2 className="section-heading">See It In Action</h2>
          <p className="section-subheading">Describe a game. Watch it come to life.</p>

          <div className="demo-tabs">
            {DEMO_SCENARIOS.map((s, i) => (
              <button
                key={s.label}
                className={`demo-tab ${i === demoIndex ? 'active' : ''}`}
                onClick={() => startScenario(i)}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="demo-window">
            <div className="demo-window-header">
              <div className="preview-dots">
                <span />
                <span />
                <span />
              </div>
              <span className="preview-title">vibe-code-studio</span>
            </div>
            <div className="demo-split">
              <div className="demo-chat-panel">
                <div className="demo-chat-label">Your Idea</div>
                <div className="demo-chat-messages">
                  <div className="demo-bubble demo-bubble-user">
                    <span className="demo-avatar">🧒</span>
                    <div className="demo-bubble-text">
                      {typedPrompt}
                      {phase === 'typing' && <span className="demo-cursor">|</span>}
                    </div>
                  </div>
                  {showAiReply && (
                    <div className="demo-bubble demo-bubble-ai">
                      <span className="demo-avatar">🤖</span>
                      <div className="demo-bubble-text">
                        {typedReply}
                        {phase === 'building' && <span className="demo-cursor">|</span>}
                      </div>
                    </div>
                  )}
                  {phase === 'building' && typedReply.length < 3 && (
                    <div className="demo-building">
                      <div className="demo-spinner" />
                      <span>Building your game...</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="demo-game-panel" style={{ background: scenario.bg }}>
                <div className={`demo-game-scene ${phase === 'done' ? 'demo-scene-active' : 'demo-scene-building'}`}>
                  {phase !== 'done' && (
                    <div className="demo-game-loading">
                      <div className="demo-loader-ring" />
                      <span>Generating...</span>
                    </div>
                  )}
                  {phase === 'done' && (
                    <>
                      <div className="demo-hud">{scenario.scoreText}</div>
                      {scenario.platforms.map((p, i) => (
                        <div key={i} className="demo-platform" style={p.style} />
                      ))}
                      {scenario.elements.map((el, i) => (
                        <span key={i} className={el.className} style={el.style}>
                          {el.emoji}
                        </span>
                      ))}
                      <div className="demo-game-badge">Playable Game</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button className="section-cta" onClick={() => handleCta('section-cta', 'demo')}>
            Try It Yourself — Free
          </button>
        </section>

        {/* ── 5. Real Games Showcase ── */}
        {featuredGames.length > 0 && (
          <section className="games-showcase">
            <h2 className="section-heading">Games Built by Kids Like You</h2>
            <p className="section-subheading">Real games created on VibeCode Kidz — playable right now</p>
            <div className="showcase-game-grid">
              {featuredGames.map((game, i) => (
                <a
                  key={game.id}
                  href={`/play/${game.id}`}
                  className={`showcase-game-card${previewGameId === game.id && previewLoaded ? ' sgc-preview-active' : ''}`}
                  onMouseEnter={() => handleCardMouseEnter(game.id)}
                  onMouseLeave={handleCardMouseLeave}
                >
                  <div className="sgc-screen">
                    {previewGameId === game.id && (
                      <>
                        {!previewLoaded && <div className="sgc-preview-loader">LOADING...</div>}
                        <iframe
                          ref={previewIframeRef}
                          className={`sgc-preview-frame${previewLoaded ? ' visible' : ''}`}
                          src={`/play/${game.id}?preview=1`}
                          sandbox="allow-scripts allow-pointer-lock"
                          loading="lazy"
                          onLoad={() => setPreviewLoaded(true)}
                        />
                      </>
                    )}
                    <div className="sgc-screen-overlay">
                      <span className="sgc-genre">{game.genre || 'Game'}</span>
                    </div>
                  </div>
                  <div className="sgc-info">
                    <span className="sgc-title">{game.title || 'Untitled'}</span>
                    <span className="sgc-creator">
                      by {friendlyCreatorName(game.displayName || game.creatorName, i)}
                    </span>
                  </div>
                  <div className="sgc-play">Play</div>
                </a>
              ))}
            </div>
            <a href="/gallery" className="section-cta-link">
              Browse all games in the Arcade
            </a>
          </section>
        )}

        {/* ── 6. Template Grid (existing) ── */}
        <section className="template-showcase">
          <h2 className="section-heading">31 Game Types to Vibecode</h2>
          <p className="section-subheading">Pick a template or describe something totally new</p>
          <div className="template-grid">
            {GAME_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.title}
                className="template-card"
                onClick={() => handleCta(`template-${tmpl.genre}`, 'templates')}
              >
                <div className="template-card-bg" style={{ background: tmpl.gradient }}>
                  <img src={tmpl.sprite} alt={tmpl.title} className="template-card-sprite" />
                  <span className="template-card-emoji" aria-hidden="true">
                    {tmpl.emoji}
                  </span>
                </div>
                <div className="template-card-info">
                  <span className="template-card-genre">{tmpl.genre}</span>
                  <span className="template-card-title">{tmpl.title}</span>
                  <span className="template-card-desc">{tmpl.description}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── 7. Vibecode From Scratch (existing) ── */}
        <section className="scratch-section">
          <div className="scratch-divider">
            <span className="scratch-divider-line" />
            <span className="scratch-divider-text">OR</span>
            <span className="scratch-divider-line" />
          </div>
          <h2 className="scratch-title">Vibecode Something From Scratch</h2>
          <p className="scratch-subtitle">
            Don't see what you want? Just describe it. Your AI buddy will vibecode any game you can imagine.
          </p>
          <div className="scratch-examples">
            {[
              { icon: '🏰', quote: '"A castle defense game with dragons and wizards"' },
              { icon: '🧟', quote: '"Zombie survival where I build walls and craft weapons"' },
              { icon: '🐱', quote: '"A cat cafe simulator where customers order treats"' },
              { icon: '🌌', quote: '"An asteroid mining game in outer space"' },
              { icon: '🎃', quote: '"A haunted house escape room with puzzles"' },
              { icon: '🏴‍☠️', quote: '"A pirate ship battle game on the ocean"' },
            ].map(({ icon, quote }) => (
              <div
                key={quote}
                className="scratch-card"
                role="button"
                tabIndex={0}
                onClick={() => handleCta(`scratch-${quote.slice(0, 20)}`, 'scratch')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCta('scratch-card', 'scratch');
                  }
                }}
              >
                <span className="scratch-card-icon" aria-hidden="true">
                  {icon}
                </span>
                <span className="scratch-card-quote">{quote}</span>
              </div>
            ))}
          </div>
          <div className="scratch-bottom">
            <p className="scratch-hint">Type anything you want — the only limit is your imagination</p>
            <button className="section-cta" onClick={() => handleCta('section-cta', 'scratch')}>
              Start Vibecoding — Free
            </button>
          </div>
        </section>

        {/* ── 8. For Parents ── */}
        <section className="for-parents" id="parents">
          <h2 className="section-heading">Built for Kids. Trusted by Parents.</h2>
          <p className="section-subheading">Safety, education, and transparency are built into everything we do</p>
          <div className="parent-grid">
            <div className="parent-card">
              <span className="parent-card-icon">🛡️</span>
              <h3>Safe &amp; COPPA Compliant</h3>
              <p>
                Parental consent for under-13 users, minimal data collection, and full compliance with children's
                privacy law.
              </p>
            </div>
            <div className="parent-card">
              <span className="parent-card-icon">🧠</span>
              <h3>Real Coding Skills</h3>
              <p>
                Kids learn game design, computational thinking, and can view and edit the real source code behind every
                game.
              </p>
            </div>
            <div className="parent-card">
              <span className="parent-card-icon">✅</span>
              <h3>Kid-Friendly Content Only</h3>
              <p>
                AI content moderation ensures all games stay E-rated. Swords and spells are fine — graphic violence is
                not.
              </p>
            </div>
            <div className="parent-card">
              <span className="parent-card-icon">👨‍👩‍👧</span>
              <h3>You Stay in Control</h3>
              <p>
                View your child's creations, request data access or deletion anytime, and set daily usage limits through
                your account.
              </p>
            </div>
          </div>
        </section>

        {/* ── 9. Pricing ── */}
        <section className="pricing-section" id="pricing">
          <h2 className="section-heading">Simple, Affordable Plans</h2>
          <p className="section-subheading">Start free. Upgrade when you're ready.</p>
          <div className="pricing-grid">
            <div className="price-card">
              <h3 className="price-card-name">Free Trial</h3>
              <div className="price-card-price">$0</div>
              <div className="price-card-period">for 30 days</div>
              <ul className="price-card-features">
                <li>3 games per month</li>
                <li>10 AI prompts per day</li>
                <li>Unlimited plays</li>
                <li>Share to Arcade</li>
              </ul>
              <button className="price-card-btn" onClick={() => handleCta('price-free-btn', 'pricing')}>
                Start Free Trial
              </button>
            </div>
            <div className="price-card featured">
              <div className="price-card-badge">Most Popular</div>
              <h3 className="price-card-name">Creator</h3>
              <div className="price-card-price">$13</div>
              <div className="price-card-period">per month</div>
              <ul className="price-card-features">
                <li>15 games per month</li>
                <li>50 AI prompts per day</li>
                <li>Unlimited plays</li>
                <li>Share to Arcade</li>
                <li>Priority support</li>
              </ul>
              <button className="price-card-btn" onClick={() => handleCta('price-creator-btn', 'pricing')}>
                Get Started
              </button>
            </div>
            <div className="price-card">
              <h3 className="price-card-name">Pro</h3>
              <div className="price-card-price">$21</div>
              <div className="price-card-period">per month</div>
              <ul className="price-card-features">
                <li>40 games per month</li>
                <li>80 AI prompts per day</li>
                <li>Unlimited plays</li>
                <li>Share to Arcade</li>
                <li>Priority support</li>
              </ul>
              <button className="price-card-btn" onClick={() => handleCta('price-pro-btn', 'pricing')}>
                Get Started
              </button>
            </div>
          </div>
          <p className="pricing-esa-note">
            Arizona ESA family? <a href="/esa">Pay with your scholarship funds</a>
          </p>
        </section>

        {/* ── 10. FAQ ── */}
        <section className="faq-section" id="faq">
          <h2 className="section-heading">Frequently Asked Questions</h2>
          <div className="faq-list">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className={`faq-item ${openFaq === i ? 'open' : ''}`}>
                <button
                  className="faq-question"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  aria-controls={`faq-answer-${i}`}
                >
                  <span>{item.q}</span>
                  <span className="faq-toggle" aria-hidden="true">
                    {openFaq === i ? '−' : '+'}
                  </span>
                </button>
                {openFaq === i && (
                  <div className="faq-answer" id={`faq-answer-${i}`} role="region">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── 11. Final CTA ── */}
        <section className="final-cta-section">
          <h2>Ready to start vibecoding?</h2>
          <p>Your child's next favorite game is one sentence away.</p>
          <button className="section-cta" onClick={() => handleCta('section-cta', 'final')}>
            Get Started Free
          </button>
        </section>
      </div>

      {/* ── 12. Full Footer ── */}
      <footer className="landing-footer-full">
        <div className="footer-inner">
          <div className="footer-col">
            <img src="/images/logo.png?v=2" alt="VibeCode Kidz" className="footer-logo" />
            <p className="footer-tagline">AI-powered game creation for kids ages 7-18</p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <a href="/" onClick={handleFooterPathLink}>
              Studio
            </a>
            <a href="/gallery" onClick={handleFooterPathLink}>
              Arcade
            </a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="footer-col">
            <h4>Parents</h4>
            <a href="/parent-portal" onClick={handleFooterPathLink}>
              Parent Portal
            </a>
            <a href="/esa" onClick={handleFooterPathLink}>
              ESA Families
            </a>
            <a href="#parents">Safety</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="footer-col">
            <h4>Community</h4>
            <a href="/contact" onClick={handleFooterPathLink}>
              Contact Us
            </a>
            <a href="/gallery" onClick={handleFooterPathLink}>
              Game Arcade
            </a>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <a href="/privacy" onClick={handleFooterPathLink}>
              Privacy Policy
            </a>
            <a href="/terms" onClick={handleFooterPathLink}>
              Terms of Service
            </a>
          </div>
        </div>
        <div className="footer-bottom">&copy; 2026 VibeCode Kidz. All rights reserved.</div>
      </footer>
    </div>
  );
}
