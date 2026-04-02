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
  category: string;
  previewUrl: string;
}

const DEMO_STARTERS = [
  { emoji: '🧟', label: 'Zombie survival game' },
  { emoji: '🚀', label: 'Space shooter' },
  { emoji: '🏎️', label: 'Racing game' },
  { emoji: '🗡️', label: 'Dungeon adventure' },
  { emoji: '🧩', label: 'Puzzle game' },
];

const LOADING_MESSAGES = [
  'Designing your game...',
  'Adding the fun parts...',
  'Making it look awesome...',
  'Almost ready...',
];

const CATEGORY_EMOJIS: Record<string, string> = {
  arcade: '👾',
  puzzle: '🧩',
  adventure: '🗺️',
  rpg: '⚔️',
  strategy: '🧠',
  racing: '🏎️',
  sports: '⚽',
  classic: '🕹️',
  other: '🎮',
};

const BUILT_IN_ARCADE_GAMES: ArcadeGame[] = [
  {
    id: 'demo-rocket-dodge',
    title: 'Rocket Dodge',
    creatorName: 'a VibeCode kid',
    category: 'arcade',
    previewUrl: '/demo-rocket-dodge.html',
  },
  {
    id: 'demo-neon-paddle',
    title: 'Neon Paddle',
    creatorName: 'another VibeCode kid',
    category: 'classic',
    previewUrl: '/demo-neon-paddle.html',
  },
  {
    id: 'demo-gem-runner',
    title: 'Gem Runner',
    creatorName: 'a young creator',
    category: 'adventure',
    previewUrl: '/demo-gem-runner.html',
  },
];

type DemoState = 'idle' | 'loading' | 'success' | 'error' | 'rate-limited';

export default function DemoBuilder({ onSignupClick, variant = 'section' }: DemoBuilderProps) {
  const [state, setState] = useState<DemoState>('idle');
  const [input, setInput] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [promptsRemaining, setPromptsRemaining] = useState<number | null>(null);
  const [arcadeGames, setArcadeGames] = useState<ArcadeGame[]>([]);
  const [playingGameId, setPlayingGameId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  useEffect(() => {
    if (state !== 'loading') return;
    let cancelled = false;
    fetch(`/api/gallery?limit=30&_=${Date.now()}`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`Gallery request failed: ${r.status}`);
        }
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        const galleryGames: ArcadeGame[] = (data.games || [])
          .filter((g: ArcadeGame) => g.id && g.title)
          .map((g: ArcadeGame) => ({
            ...g,
            previewUrl: `/play/${g.id}?preview`,
          }));
        const combined = [...galleryGames, ...BUILT_IN_ARCADE_GAMES];
        const shuffled = [...combined].sort(() => Math.random() - 0.5).slice(0, 6);
        setArcadeGames(shuffled);
        setPlayingGameId((current) => current ?? shuffled[0]?.id ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setArcadeGames(BUILT_IN_ARCADE_GAMES);
        setPlayingGameId(BUILT_IN_ARCADE_GAMES[0]?.id ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [state]);

  const generate = useCallback(
    async (prompt: string) => {
      setArcadeGames(BUILT_IN_ARCADE_GAMES);
      setPlayingGameId(BUILT_IN_ARCADE_GAMES[0]?.id ?? null);
      setState('loading');
      startLoadingMessages();

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90_000);

      try {
        const visitorId =
          sessionStorage.getItem('vck_mkt_sid') || `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        const res = await fetch('/api/demo/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: prompt, visitorId }),
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
        setPlayingGameId(null);

        localStorage.setItem('vck_draft_code', data.code);
        localStorage.setItem('vck_draft_prompt', prompt);
        localStorage.setItem('vck_draft_ts', String(Date.now()));

        setState('success');
      } catch {
        clearTimeout(timeout);
        stopLoadingMessages();
        setPlayingGameId(null);
        setState('error');
      }
    },
    [startLoadingMessages, stopLoadingMessages],
  );

  const handleChipClick = (label: string) => {
    setInput(label);
    generate(`Make me a 2D ${label.toLowerCase()} with the Vibe 2D engine`);
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

  const enhancedCode = generatedCode ? enhanceSandboxedPreviewHtml(generatedCode) : '';
  const activeArcadeGame = arcadeGames.find((game) => game.id === playingGameId) ?? null;
  const arcadeProofText = activeArcadeGame
    ? `${activeArcadeGame.creatorName} made this in under 10 minutes`
    : 'Kids are building these fast';
  const isHeroVariant = variant === 'hero';

  const content = (
    <>
      {!isHeroVariant && <h2 className="section-heading">Build your first game right now</h2>}
      <p className="demo-builder-subtext">
        {isHeroVariant
          ? 'Pick a quick starter or describe your own idea.'
          : 'No account needed. Pick a game or describe your own idea.'}
      </p>

      {state === 'idle' && (
        <div className="demo-builder-idle">
          <div className="demo-starter-chips">
            {DEMO_STARTERS.map((s) => (
              <button key={s.label} type="button" className="demo-chip" onClick={() => handleChipClick(s.label)}>
                <span className="demo-chip-emoji">{s.emoji}</span>
                {s.label}
              </button>
            ))}
          </div>

          <div className="demo-input-row">
            <input
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
            Your game may take up to 3 minutes. Play something from the Arcade or keep reading below while it finishes.
          </p>

          {playingGameId ? (
            <div className="demo-arcade-player">
              <p className="demo-arcade-proof">{arcadeProofText}</p>
              <div className="demo-arcade-player-bar">
                <span className="demo-arcade-now-playing">Playing: {activeArcadeGame?.title ?? 'Arcade demo'}</span>
                <button type="button" className="demo-arcade-back-btn" onClick={() => setPlayingGameId(null)}>
                  Back to games
                </button>
              </div>
              <div className="demo-arcade-iframe-wrap">
                <iframe
                  src={activeArcadeGame?.previewUrl}
                  title="Arcade game"
                  sandbox="allow-scripts allow-same-origin allow-pointer-lock"
                  className="demo-arcade-iframe"
                />
              </div>
            </div>
          ) : arcadeGames.length > 0 ? (
            <div className="demo-arcade-section">
              <p className="demo-arcade-heading">Pick another Arcade game while yours finishes building</p>
              <div className="demo-arcade-grid">
                {arcadeGames.map((g) => (
                  <button key={g.id} type="button" className="demo-arcade-card" onClick={() => setPlayingGameId(g.id)}>
                    <span className="demo-arcade-card-emoji">{CATEGORY_EMOJIS[g.category] || '🎮'}</span>
                    <span className="demo-arcade-card-title">{g.title}</span>
                    <span className="demo-arcade-card-creator">by {g.creatorName}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="demo-arcade-loading-note">Loading Arcade games...</p>
          )}
        </div>
      )}

      {state === 'success' && (
        <div className="demo-builder-success">
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

      {state === 'error' && (
        <div className="demo-builder-error">
          <p className="demo-error-msg">Something went wrong -- let's try again!</p>
          <button type="button" className="demo-retry-btn" onClick={handleTryAnother}>
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
