import { useState, useRef, useCallback, useEffect } from 'react';
import { enhanceSandboxedPreviewHtml } from '../utils/previewHtml';
import './DemoBuilder.css';

interface DemoBuilderProps {
  onSignupClick: () => void;
  variant?: 'section' | 'hero';
}

interface ArcadeGame {
  id: string;
  title: string;
  creatorName: string;
  previewUrl: string;
}

interface DemoGameConfig {
  gameType: string;
  dimension: string;
  theme: string;
  character: string;
  obstacles: string;
  visualStyle: string;
}

const DEMO_STARTERS: {
  emoji: string;
  label: string;
  prompt: string;
  gameConfig: DemoGameConfig;
}[] = [
  {
    emoji: '🥷🐱',
    label: 'Ninja cat adventure',
    prompt:
      'Build a polished 2D platformer. The player is a ninja cat jumping across rooftops at night. Include: smooth left/right movement with jump, coin collection with a +10 score popup that floats up and fades, 3 lives shown as hearts in the HUD, enemy slimes that patrol platforms, spike traps, particle burst when collecting coins, camera that follows the player, and a game over screen with score and press-SPACE-to-restart. Use a dark purple/blue sky, neon-lit building platforms, and glowing gold collectibles.',
    gameConfig: {
      gameType: 'platformer',
      dimension: '2d',
      theme: 'Ninja rooftops at night',
      character: 'Ninja cat',
      obstacles: 'Patrol slimes, spike traps, gaps',
      visualStyle: 'Dark neon city',
    },
  },
  {
    emoji: '🤖🌮',
    label: 'Robot taco runner',
    prompt:
      'Build a polished 2D endless runner. A robot taco auto-runs to the right. The player presses UP to jump over obstacles and DOWN to duck under barriers. Include: score based on distance traveled, coin pickups for bonus points, speed gradually increases over time, 3 lives, obstacles spawn with fair gaps, a particle trail behind the runner, screen shake when hit, and a game over screen showing final distance with press-SPACE-to-restart. Use bright futuristic neon colors with a scrolling cityscape background.',
    gameConfig: {
      gameType: 'endless runner',
      dimension: '2d',
      theme: 'Futuristic neon city',
      character: 'Robot taco',
      obstacles: 'Barriers, pits, laser gates',
      visualStyle: 'Bright neon/futuristic',
    },
  },
  {
    emoji: '🐉💎',
    label: 'Dragon treasure quest',
    prompt:
      'Build a polished 2D platformer. The player is a small dragon collecting treasure in a dungeon. Include: left/right movement with a flap-jump, fire breath attack with spacebar that defeats enemies, gold coins and gem collectibles, 3 hearts health system, enemy bats that fly in patterns, lava pit hazards, particle effects when collecting coins and using fire breath, camera follow, and a game over/restart screen. Use warm dungeon colors — stone grey platforms, orange lava, gold UI text.',
    gameConfig: {
      gameType: 'platformer',
      dimension: '2d',
      theme: 'Fantasy dungeon with lava',
      character: 'Small dragon',
      obstacles: 'Bats, lava pits, spike traps',
      visualStyle: 'Warm dungeon/fantasy',
    },
  },
  {
    emoji: '🧟',
    label: 'Zombie survival',
    prompt:
      'Build a polished 2D top-down survival shooter. The player moves in all 4 directions with arrow keys and shoots toward the nearest zombie automatically. Include: wave system starting with 5 zombies and increasing each wave, a player health bar, health pickups that spawn between waves, score counter, zombies get faster each wave, enemies flash white and fade on death (no blood), screen shake when the player is hit, particle explosions on zombie defeat, a "Wave Complete" banner between waves, and a game over screen showing final wave and score with press-SPACE-to-restart. Use a dark green/grey palette with bright projectiles.',
    gameConfig: {
      gameType: 'top down shooter',
      dimension: '2d',
      theme: 'Zombie apocalypse',
      character: 'Survivor',
      obstacles: 'Zombie waves, increasing speed',
      visualStyle: 'Dark green/grey with glowing projectiles',
    },
  },
  {
    emoji: '🚀',
    label: 'Space shooter',
    prompt:
      'Build a polished 2D vertical space shooter. The player ship moves left/right at the bottom and presses SPACE to fire lasers upward. Include: 3 enemy types that move in different patterns (straight, zigzag, fast dive), enemies spawn in waves from the top, power-up drops (rapid fire, shield), score counter, 3 lives, explosion particles when enemies are destroyed, a scrolling starfield background, and a game over/restart screen showing final score. Use a dark space background with a neon-colored ship and colorful enemies.',
    gameConfig: {
      gameType: 'shooter',
      dimension: '2d',
      theme: 'Outer space battle',
      character: 'Spaceship',
      obstacles: 'Alien ships, asteroids',
      visualStyle: 'Dark space with neon accents',
    },
  },
  {
    emoji: '🏎️',
    label: 'Racing game',
    prompt:
      'Build a polished 2D top-down racing game. The road scrolls downward and the player car steers left/right to avoid traffic. Include: other cars as obstacles in multiple lanes, speed boost pickups, coin collectibles, distance-based score display, speed increases over time, 3 lives with brief invincibility flash after a crash, road scenery (trees, barriers) scrolling past on the sides, particle sparks on near-misses, and a game over screen showing distance and score with press-SPACE-to-restart. Use bright highway colors — grey road, white lane markings, green roadside, colorful cars.',
    gameConfig: {
      gameType: 'racing',
      dimension: '2d',
      theme: 'Highway racing',
      character: 'Race car',
      obstacles: 'Traffic cars, barriers',
      visualStyle: 'Bright highway colors',
    },
  },
  {
    emoji: '🐸',
    label: 'Frogger crossing',
    prompt:
      'Build a polished 2D frogger-style road crossing game. The player frog hops one grid step per arrow key press. Include: rows of cars and trucks scrolling left/right at different speeds, a river section with floating logs the frog can ride, 3 lives, a score counter that increases for each row crossed, a safe home row at the top that completes one round, level counter that increases speed, tween-based hop animation, particle splash if the frog falls in water, and a game over/restart screen. Use bright green grass, grey roads, blue water, and colorful vehicles.',
    gameConfig: {
      gameType: 'frogger',
      dimension: '2d',
      theme: 'Road and river crossing',
      character: 'Frog',
      obstacles: 'Cars, trucks, river gaps',
      visualStyle: 'Bright and colorful classic',
    },
  },
  {
    emoji: '🧩',
    label: 'Puzzle adventure',
    prompt:
      'Build a polished 2D top-down adventure game. An explorer navigates rooms in an ancient temple. Include: 4-directional grid-based movement, colored keys that open matching colored doors, gem collectibles with a counter, simple push-block puzzles, enemy statues that shoot projectiles in a pattern, 3 hearts health, room transitions when walking to an edge, a treasure chest goal at the end, and a win/restart screen. Use earthy adventure colors — sand-colored floors, stone walls, gold keys, green gems.',
    gameConfig: {
      gameType: 'adventure',
      dimension: '2d',
      theme: 'Ancient temple exploration',
      character: 'Explorer',
      obstacles: 'Locked doors, push blocks, statue traps',
      visualStyle: 'Earthy adventure/temple',
    },
  },
];

const LOADING_MESSAGES = [
  'Designing your game...',
  'Adding the fun parts...',
  'Making it look awesome...',
  'Almost ready...',
];

const WAITING_ARCADE_GAME: ArcadeGame = {
  id: 'demo-neon-paddle',
  title: 'Neon Paddle',
  creatorName: 'another VibeCode kid',
  previewUrl: '/demo-neon-paddle.html',
};

const DEMO_REQUEST_TIMEOUT_MS = 180_000;

type DemoState = 'idle' | 'loading' | 'success' | 'error' | 'timeout' | 'rate-limited';

export default function DemoBuilder({ onSignupClick, variant = 'section' }: DemoBuilderProps) {
  const [state, setState] = useState<DemoState>('idle');
  const [input, setInput] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [promptsRemaining, setPromptsRemaining] = useState<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSubmittedPromptRef = useRef('');

  const startLoadingMessages = useCallback(() => {
    let idx = 0;
    setLoadingMsg(LOADING_MESSAGES[0]);
    loadingIntervalRef.current = setInterval(() => {
      idx = (idx + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[idx]);
    }, 2500);
  }, []);

  const stopLoadingMessages = useCallback(() => {
    if (loadingIntervalRef.current) {
      clearInterval(loadingIntervalRef.current);
      loadingIntervalRef.current = null;
    }
  }, []);

  const lastGameConfigRef = useRef<DemoGameConfig | null>(null);

  const generate = useCallback(
    async (prompt: string, gameConfig?: DemoGameConfig) => {
      lastSubmittedPromptRef.current = prompt;
      lastGameConfigRef.current = gameConfig ?? null;
      setState('loading');
      startLoadingMessages();

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DEMO_REQUEST_TIMEOUT_MS);

      try {
        const visitorId =
          sessionStorage.getItem('vck_mkt_sid') || `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        const res = await fetch('/api/demo/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: prompt, visitorId, gameConfig: gameConfig ?? null }),
          signal: controller.signal,
        });

        clearTimeout(timeout);
        const data = await res.json();

        stopLoadingMessages();

        if (data.gated || res.status === 429) {
          setState('rate-limited');
          return;
        }

        if (!res.ok || !data.code) {
          setState('error');
          return;
        }

        const stripped = data.code
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, '')
          .trim();
        if (stripped.length < 50) {
          setState('error');
          return;
        }

        setGeneratedCode(data.code);
        setPromptsRemaining(data.promptsRemaining ?? null);

        localStorage.setItem('vck_draft_code', data.code);
        localStorage.setItem('vck_draft_prompt', prompt);
        localStorage.setItem('vck_draft_ts', String(Date.now()));

        setState('success');
      } catch (error) {
        clearTimeout(timeout);
        stopLoadingMessages();
        const didTimeout =
          controller.signal.aborted ||
          (error instanceof DOMException && error.name === 'AbortError') ||
          (error instanceof Error && error.name === 'AbortError');
        setState(didTimeout ? 'timeout' : 'error');
      }
    },
    [startLoadingMessages, stopLoadingMessages],
  );

  const handleChipClick = (starter: (typeof DEMO_STARTERS)[number]) => {
    setInput(starter.label);
    generate(starter.prompt, starter.gameConfig);
  };

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    generate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTryAnother = () => {
    setGeneratedCode('');
    setInput('');
    setState('idle');
  };

  const handleRetryLastPrompt = () => {
    if (!lastSubmittedPromptRef.current) {
      handleTryAnother();
      return;
    }
    void generate(lastSubmittedPromptRef.current, lastGameConfigRef.current ?? undefined);
  };

  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state === 'success' && successRef.current) {
      successRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [state]);

  const enhancedCode = generatedCode ? enhanceSandboxedPreviewHtml(generatedCode) : '';
  const arcadeProofText = `${WAITING_ARCADE_GAME.creatorName} made this in under 10 minutes`;
  const isHeroVariant = variant === 'hero';

  const content = (
    <>
      {!isHeroVariant && <h2 className="section-heading">Build your first game right now</h2>}
      <p className="demo-builder-subtext">
        {isHeroVariant
          ? 'No account needed to start. Pick a quick starter or type your own idea.'
          : 'No account needed. Pick a game or describe your own idea.'}
      </p>

      {state === 'idle' && (
        <div className="demo-builder-idle">
          <div className="demo-starter-chips">
            {DEMO_STARTERS.map((s) => (
              <button key={s.label} type="button" className="demo-chip" onClick={() => handleChipClick(s)}>
                <span className="demo-chip-emoji">{s.emoji}</span>
                {s.label}
              </button>
            ))}
          </div>

          <div className="demo-input-row">
            <input
              id="demo-builder-input"
              type="text"
              className="demo-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Or describe the game you want to build..."
              maxLength={200}
            />
            <button type="button" className="demo-build-btn" onClick={handleSubmit} disabled={!input.trim()}>
              Build it
            </button>
          </div>
        </div>
      )}

      {state === 'loading' && (
        <div className="demo-builder-loading">
          <div className="demo-loading-header">
            <div className="demo-spinner" />
            <p className="demo-loading-msg">{loadingMsg}</p>
          </div>
          <p className="demo-loading-note">
            Your game may take up to 3 minutes. Try this Arcade favorite or keep reading the page while it finishes.
          </p>
          <div className="demo-arcade-player demo-arcade-player-single">
            <p className="demo-arcade-proof">{arcadeProofText}</p>
            <div className="demo-arcade-player-bar">
              <span className="demo-arcade-now-playing">Try this while you wait: {WAITING_ARCADE_GAME.title}</span>
            </div>
            <div className="demo-arcade-iframe-wrap">
              <iframe
                src={WAITING_ARCADE_GAME.previewUrl}
                title={WAITING_ARCADE_GAME.title}
                sandbox="allow-scripts allow-same-origin allow-pointer-lock"
                className="demo-arcade-iframe"
              />
            </div>
          </div>
        </div>
      )}

      {state === 'success' && (
        <div className="demo-builder-success" ref={successRef}>
          <p className="demo-celebration">You just built a real game!</p>

          <div className="demo-preview-frame">
            <iframe
              ref={iframeRef}
              srcDoc={enhancedCode}
              title="Your creation"
              sandbox="allow-scripts allow-same-origin allow-pointer-lock"
              className="demo-preview-iframe"
            />
          </div>

          <div className="demo-success-actions">
            <button type="button" className="demo-signup-btn" onClick={onSignupClick}>
              Save this game and keep building it
            </button>
            {promptsRemaining !== null && promptsRemaining > 0 && (
              <button type="button" className="demo-try-another-btn" onClick={handleTryAnother}>
                Try another one ({promptsRemaining} left)
              </button>
            )}
          </div>
        </div>
      )}

      {state === 'rate-limited' && (
        <div className="demo-builder-gated">
          <p className="demo-gated-msg">You have used all 5 free tries today. Want to keep building?</p>
          <button type="button" className="demo-signup-btn" onClick={onSignupClick}>
            Create a free account to keep going
          </button>
        </div>
      )}

      {(state === 'error' || state === 'timeout') && (
        <div className="demo-builder-error">
          <p className="demo-error-msg">
            {state === 'timeout'
              ? 'That build took longer than expected. Try again, or start with a simpler game idea.'
              : "Something went wrong -- let's try again!"}
          </p>
          <button type="button" className="demo-retry-btn" onClick={handleRetryLastPrompt}>
            Try again
          </button>
        </div>
      )}
    </>
  );

  if (isHeroVariant) {
    return (
      <div className="demo-builder-section demo-builder-section-hero" id="try-now">
        {content}
      </div>
    );
  }

  return (
    <section className="landing-section demo-builder-section" id="try-now">
      {content}
    </section>
  );
}
