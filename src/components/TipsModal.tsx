import { useState } from 'react';
import { STORAGE_KEY } from './StudioTutorial';
import './TipsModal.css';

interface TipsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReplayTutorial?: () => void;
}

type Tab = 'how' | 'prompts' | 'create' | 'tools';

const TUTORIAL_STEPS = [
  {
    num: 1,
    icon: '🎮',
    title: 'Pick Your Game',
    desc: 'Choose a game type from the starter grid. Each one gives the AI a head start so you get a working game fast.',
  },
  {
    num: 2,
    icon: '💬',
    title: 'Tell the AI What You Want',
    desc: "Type what you want in the chat. Be specific! 'Space racing game with asteroids' beats 'make me a game'.",
  },
  {
    num: 3,
    icon: '✨',
    title: 'Watch the Magic',
    desc: "The AI writes your game code in real-time. When it's done, your game appears in the preview panel.",
  },
  {
    num: 4,
    icon: '🎨',
    title: 'Make It Yours',
    desc: "Ask for changes one at a time: 'change the player to a dragon', 'make it faster', 'add a score counter'.",
  },
  {
    num: 5,
    icon: '🚀',
    title: 'Power Moves',
    desc: "Use 'Make It Fun' for creative surprises, 'Team Up' to have two AIs collaborate, and Share to publish to the Arcade.",
  },
];

const PROMPT_TIPS = [
  {
    bad: 'Make me a game',
    good: 'Make me a space racing game with asteroids and a boost button',
    why: 'More detail = cooler results',
  },
  {
    bad: 'Make it look better',
    good: 'Make the background dark blue with stars, and make the player red',
    why: 'Tell the AI exactly what you see in your head',
  },
  {
    bad: 'Add everything: powerups, enemies, score, levels, and sound',
    good: 'Add a powerup that makes me go faster for 3 seconds',
    why: 'One change at a time works way better',
  },
  {
    bad: "It's broken",
    good: 'When I press the jump button nothing happens, the player just stays on the ground',
    why: 'Describe exactly what you see so the AI can fix it',
  },
];

const SCENARIOS = [
  { when: 'Something breaks', say: '"Undo that last change" or "Go back to before"' },
  { when: 'You want to change colors', say: '"Make the background dark blue" or "Change the player to green"' },
  {
    when: 'You want a new feature',
    say: '"Add a score counter in the top right" or "Add enemies that move left and right"',
  },
  { when: 'The game is too easy', say: '"Make it harder — faster enemies and less time"' },
  { when: 'You want to start over', say: 'Click the Reset button in the sidebar, then describe your new game' },
];

const GAME_TEMPLATES = [
  { emoji: '🏃', name: 'Jump & Run', desc: 'Classic platformer with jumping and collecting' },
  { emoji: '🚀', name: 'Space Blaster', desc: 'Shoot enemies in space' },
  { emoji: '🏎️', name: 'Racing', desc: 'Speed through tracks and dodge obstacles' },
  { emoji: '🐸', name: 'Frogger', desc: 'Cross roads and rivers safely' },
  { emoji: '🧩', name: 'Puzzle', desc: 'Match, sort, or solve challenges' },
  { emoji: '👆', name: 'Clicker', desc: 'Tap to earn and upgrade' },
  { emoji: '⚔️', name: 'RPG', desc: 'Explore worlds and battle enemies' },
  { emoji: '🐍', name: 'Snake', desc: 'Grow longer without hitting yourself' },
  { emoji: '🏓', name: 'Pong', desc: 'Bounce the ball past your opponent' },
  { emoji: '🧱', name: 'Breakout', desc: 'Smash bricks with a bouncing ball' },
  { emoji: '🦕', name: 'Dino Run', desc: 'Jump over cacti endlessly' },
  { emoji: '🔫', name: 'Tower Defense', desc: 'Place towers to stop waves of enemies' },
  { emoji: '🎯', name: 'Aim Trainer', desc: 'Click targets to improve your aim' },
  { emoji: '🃏', name: 'Memory Match', desc: 'Flip cards to find matching pairs' },
  { emoji: '📝', name: 'Trivia', desc: 'Answer questions and score points' },
  { emoji: '🏀', name: 'Sports', desc: 'Basketball, soccer, or any sport' },
  { emoji: '🧟', name: 'Survival', desc: 'Stay alive as long as possible' },
  { emoji: '🐦', name: 'Flappy', desc: 'Tap to fly through gaps' },
  { emoji: '🚗', name: 'Parking', desc: 'Park cars without crashing' },
  { emoji: '🔮', name: 'Idle', desc: 'Automate and watch numbers grow' },
  { emoji: '🌍', name: 'Geography', desc: 'Learn countries, flags, and capitals' },
  { emoji: '🧮', name: 'Math', desc: 'Solve math problems in a game' },
  { emoji: '📚', name: 'Word', desc: 'Spelling, typing, or word search' },
  { emoji: '🔬', name: 'Science', desc: 'Experiments and science challenges' },
  { emoji: '🎵', name: 'Music', desc: 'Make beats or play instruments' },
  { emoji: '💃', name: 'Dance', desc: 'Hit arrows to the beat' },
  { emoji: '🤿', name: 'Treasure Diver', desc: 'Dive deep and collect treasure' },
  { emoji: '♻️', name: 'Trash Sorter', desc: 'Sort recycling and learn about waste' },
  { emoji: '🍉', name: 'Fruit Slice', desc: 'Swipe to slice flying fruit' },
  { emoji: '🏗️', name: 'Tower Stack', desc: 'Stack blocks as high as you can' },
  { emoji: '🔍', name: 'Find the Friend', desc: 'Hidden object search game' },
];

const STUDIO_TOOLS = [
  {
    icon: '🔥',
    name: 'Make It Fun',
    desc: 'Tells the AI to add a creative surprise to your game — like a secret level, funny sound effect, or bonus power-up.',
  },
  {
    icon: '🎓',
    name: 'Ask Claude / Ask Grok',
    desc: 'Switch between two different AI models. Claude is great at following instructions. Grok is more creative and wild.',
  },
  {
    icon: '🤝',
    name: 'Team Up',
    desc: 'Both AIs work together — one builds your game, the other reviews it and suggests improvements.',
  },
  {
    icon: '🔧',
    name: 'Peek at the Code',
    desc: 'See the actual code behind your game. Great for learning how games are built!',
  },
  {
    icon: '🎉',
    name: 'Share',
    desc: 'Publish your game to the Arcade so friends and other kids can play it.',
  },
  {
    icon: '📜',
    name: 'History',
    desc: 'See every version of your game. If something breaks, you can go back to any previous version.',
  },
  {
    icon: '🔄',
    name: 'Reset',
    desc: 'Start completely fresh with a blank project.',
  },
  {
    icon: '🎤',
    name: 'Talk',
    desc: 'Click the microphone button to speak your ideas instead of typing. Say what you want and the AI will hear you.',
  },
  {
    icon: '📷',
    name: 'Upload Image',
    desc: 'Upload a drawing or screenshot and the AI will try to build a game inspired by it.',
  },
];

export default function TipsModal({ isOpen, onClose, onReplayTutorial }: TipsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('how');

  if (!isOpen) return null;

  const handleReplay = () => {
    localStorage.setItem(STORAGE_KEY, 'not_started');
    onClose();
    onReplayTutorial?.();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="tips-modal tips-modal-tabbed" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>

        <div className="tips-header">
          <span className="tips-icon">📖</span>
          <h2>Learn to VibeCode</h2>
        </div>

        {/* Tab bar */}
        <div className="tips-tabs">
          <button
            className={`tips-tab ${activeTab === 'how' ? 'active' : ''}`}
            onClick={() => setActiveTab('how')}
            type="button"
          >
            How It Works
          </button>
          <button
            className={`tips-tab ${activeTab === 'prompts' ? 'active' : ''}`}
            onClick={() => setActiveTab('prompts')}
            type="button"
          >
            Prompt Tips
          </button>
          <button
            className={`tips-tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
            type="button"
          >
            What Can I Make?
          </button>
          <button
            className={`tips-tab ${activeTab === 'tools' ? 'active' : ''}`}
            onClick={() => setActiveTab('tools')}
            type="button"
          >
            Studio Tools
          </button>
        </div>

        <div className="tips-content">
          {/* Tab 1: How It Works */}
          {activeTab === 'how' && (
            <div className="tips-tab-content">
              <div className="tutorial-steps-list">
                {TUTORIAL_STEPS.map((s) => (
                  <div key={s.num} className="tutorial-step-card">
                    <div className="tutorial-step-num">{s.num}</div>
                    <div className="tutorial-step-icon">{s.icon}</div>
                    <div className="tutorial-step-info">
                      <strong>{s.title}</strong>
                      <p>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              {onReplayTutorial && (
                <button className="btn-replay-tutorial" onClick={handleReplay} type="button">
                  Replay Tutorial
                </button>
              )}
            </div>
          )}

          {/* Tab 2: Prompt Tips */}
          {activeTab === 'prompts' && (
            <div className="tips-tab-content">
              <section className="tips-section">
                <h3>Before & After</h3>
                <div className="prompt-comparisons">
                  {PROMPT_TIPS.map((tip, i) => (
                    <div key={i} className="prompt-comparison">
                      <div className="prompt-bad">
                        <span className="prompt-label">Instead of:</span>
                        <span className="prompt-text">"{tip.bad}"</span>
                      </div>
                      <div className="prompt-good">
                        <span className="prompt-label">Try:</span>
                        <span className="prompt-text">"{tip.good}"</span>
                      </div>
                      <div className="prompt-why">{tip.why}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="tips-section">
                <h3>What to Say When...</h3>
                <div className="scenario-list">
                  {SCENARIOS.map((s, i) => (
                    <div key={i} className="scenario-item">
                      <span className="scenario-when">{s.when}</span>
                      <span className="scenario-say">{s.say}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* Tab 3: What Can I Make */}
          {activeTab === 'create' && (
            <div className="tips-tab-content">
              <p className="tab-intro">31 game types to choose from, plus art, animations, stories, tools, and more!</p>
              <div className="templates-grid">
                {GAME_TEMPLATES.map((t, i) => (
                  <div key={i} className="template-card">
                    <span className="template-emoji">{t.emoji}</span>
                    <div className="template-info">
                      <strong>{t.name}</strong>
                      <span>{t.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: Studio Tools */}
          {activeTab === 'tools' && (
            <div className="tips-tab-content">
              <div className="tools-list">
                {STUDIO_TOOLS.map((tool, i) => (
                  <div key={i} className="tool-card">
                    <span className="tool-icon">{tool.icon}</span>
                    <div className="tool-info">
                      <strong>{tool.name}</strong>
                      <p>{tool.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <section className="tips-section rules-section">
                <h3>Community Rules</h3>
                <p className="rules-intro">
                  To keep Vibe Code Studio fun and safe for everyone, some things are not allowed:
                </p>
                <ul className="rules-list">
                  <li>
                    <span className="rule-icon">⚔️</span>
                    <span>Violence or weapons</span>
                  </li>
                  <li>
                    <span className="rule-icon">👻</span>
                    <span>Scary or horror content</span>
                  </li>
                  <li>
                    <span className="rule-icon">🤬</span>
                    <span>Bad words or mean content</span>
                  </li>
                  <li>
                    <span className="rule-icon">🔞</span>
                    <span>Adult content</span>
                  </li>
                  <li>
                    <span className="rule-icon">🍺</span>
                    <span>Drugs or alcohol</span>
                  </li>
                  <li>
                    <span className="rule-icon">🎰</span>
                    <span>Gambling</span>
                  </li>
                </ul>
                <p className="rules-note">
                  If you try to create something that breaks these rules, the AI helper will politely ask you to try
                  something else!
                </p>
              </section>
            </div>
          )}
        </div>

        <div className="tips-footer">
          <button className="btn-got-it" onClick={onClose}>
            Got it! Let's create!
          </button>
        </div>
      </div>
    </div>
  );
}
