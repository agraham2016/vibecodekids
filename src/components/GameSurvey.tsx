import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GameConfig, StarterTemplateId } from '../types';
import {
  ENGINE_SELECTION_GUIDE,
  STARTER_TEMPLATES,
  STARTERS_BY_ENGINE,
  THEMES_BY_FAMILY,
  CHARACTERS_BY_FAMILY,
  CHALLENGES_BY_FAMILY,
  VISUAL_STYLES,
  getStarterTemplateById,
  getStarterRecommendationReason,
  getStarterFamilyGuide,
} from '../config/gameCatalog';
import { ENABLE_3D_STUDIO } from '../config/featureFlags';
import './GameSurvey.css';

interface GameSurveyProps {
  onComplete: (config: GameConfig) => void;
}

// ========== CREATION CATEGORIES ==========

type CreationCategory = 'game' | 'story' | 'app' | 'art' | 'music' | 'other';

const CREATION_CATEGORIES: { id: CreationCategory; icon: string; label: string; description: string }[] = [
  { id: 'game', icon: '🎮', label: 'A Game', description: 'Platformers, racers, puzzles & more' },
  { id: 'story', icon: '📖', label: 'A Story', description: 'Interactive stories & choose-your-adventure' },
  { id: 'app', icon: '📱', label: 'An App', description: 'Quizzes, tools, calculators & more' },
  { id: 'art', icon: '🎨', label: 'Art & Animation', description: 'Drawings, animations & visual art' },
  { id: 'music', icon: '🎵', label: 'Music & Sound', description: 'Beat makers, pianos & soundboards' },
  { id: 'other', icon: '✨', label: 'Something Else', description: 'Describe anything you can imagine!' },
];

// ========== SURVEY STEPS ==========

type SurveyStep = 'category' | 'gameType' | 'theme' | 'character' | 'obstacles' | 'visualStyle' | 'done';

const GAME_STEP_ORDER: SurveyStep[] = [
  'category',
  'gameType',
  'theme',
  'character',
  'obstacles',
  'visualStyle',
  'done',
];
const SIMPLE_STEP_ORDER: SurveyStep[] = ['category', 'theme', 'visualStyle', 'done'];

const STUDIO_SURVEY_TEMPLATES = STARTER_TEMPLATES.filter((template) => template.engineId === 'vibe-2d');

const BOT_MESSAGES: Record<string, string> = {
  category: 'What do you want to create?',
  gameType: "Pick a starter — I'll build it for you!",
  theme: 'What theme?',
  character: 'Who is the main character?',
  obstacles: 'What are the challenges?',
  visualStyle: 'Last one — what style?',
  done: 'Building it now!',
};

const NON_GAME_THEMES: { icon: string; label: string; value: string }[] = [
  { icon: '🚀', label: 'Space', value: 'space' },
  { icon: '🌊', label: 'Ocean', value: 'ocean' },
  { icon: '🌲', label: 'Nature', value: 'nature' },
  { icon: '🏰', label: 'Fantasy', value: 'fantasy' },
  { icon: '🤖', label: 'Sci-Fi', value: 'sci-fi' },
  { icon: '🎪', label: 'Fun & Silly', value: 'fun' },
  { icon: '🌈', label: 'Colorful', value: 'colorful' },
  { icon: '🐾', label: 'Animals', value: 'animals' },
];

// ========== COMPONENT ==========

export default function GameSurvey({ onComplete }: GameSurveyProps) {
  const [creationCategory, setCreationCategory] = useState<CreationCategory | null>(null);
  const [step, setStep] = useState<SurveyStep>('category');
  const [answers, setAnswers] = useState<Partial<GameConfig>>({});
  const [freeText, setFreeText] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'bot' | 'user'; text: string }[]>([
    { role: 'bot', text: BOT_MESSAGES.category },
  ]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const stepOrder = creationCategory === 'game' ? GAME_STEP_ORDER : SIMPLE_STEP_ORDER;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const speakMessage = useCallback(
    (index: number, text: string) => {
      window.speechSynthesis.cancel();
      if (speakingIndex === index) {
        setSpeakingIndex(null);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';
      utterance.onend = () => setSpeakingIndex(null);
      utterance.onerror = () => setSpeakingIndex(null);
      setSpeakingIndex(index);
      window.speechSynthesis.speak(utterance);
    },
    [speakingIndex],
  );

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const selectedStarter = useMemo(
    () =>
      getStarterTemplateById((answers.starterTemplateId || 'platformer') as StarterTemplateId) ||
      STUDIO_SURVEY_TEMPLATES[0],
    [answers.starterTemplateId],
  );

  const pickStarterFromText = useCallback((value: string) => {
    const lower = value.toLowerCase();
    return (
      STUDIO_SURVEY_TEMPLATES.find((template) => {
        const haystack =
          `${template.label} ${template.shortLabel} ${template.description} ${template.promptHint}`.toLowerCase();
        return (
          haystack.includes(lower) ||
          lower.includes(template.id.replace(/-/g, ' ')) ||
          lower.includes(template.shortLabel.toLowerCase())
        );
      }) ||
      (ENABLE_3D_STUDIO && /\b3d\b|\broblox\b|\bobby\b/.test(lower)
        ? getStarterTemplateById('obby')
        : ENABLE_3D_STUDIO && /\bsurvival\b|\bcraft\b|\bbuild\b/.test(lower)
          ? getStarterTemplateById('survival-crafting-game')
          : /\bpet\b|\banimal\b/.test(lower)
            ? getStarterTemplateById('pet-care-simulator')
            : /\brace\b|\bracing\b|\bcar\b/.test(lower)
              ? getStarterTemplateById('simple-racing')
              : /\bmaze\b|\bescape\b|\bdetective\b|\bmystery\b/.test(lower)
                ? getStarterTemplateById('maze-escape')
                : /\bmatch\b|\bmemory\b|\bpuzzle\b|\bchess\b/.test(lower)
                  ? getStarterTemplateById('matching-game')
                  : STUDIO_SURVEY_TEMPLATES[0])
    );
  }, []);

  const fallbackStarter = STUDIO_SURVEY_TEMPLATES[0]!;

  const handleCategoryPick = (cat: CreationCategory, label: string) => {
    if (isAnimating) return;
    setCreationCategory(cat);
    setIsAnimating(true);

    const newHistory = [...chatHistory, { role: 'user' as const, text: label }];

    setTimeout(() => {
      const nextStep = cat === 'game' ? 'gameType' : 'theme';
      newHistory.push({ role: 'bot', text: BOT_MESSAGES[nextStep] });
      setChatHistory(newHistory);
      setStep(nextStep);
      setIsAnimating(false);

      if (cat !== 'game') {
        setAnswers((prev) => ({
          ...prev,
          gameType: 'platformer',
          engineId: 'vibe-2d',
          genreFamily: 'platformAction',
          starterTemplateId: 'platformer',
          dimension: '2d',
          customNotes: `[Creation type: ${cat}] `,
        }));
      }
    }, 250);

    setChatHistory(newHistory);
  };

  const advanceStep = (userAnswer: string, configKey: keyof GameConfig, configValue: string) => {
    const newHistory = [...chatHistory, { role: 'user' as const, text: userAnswer }];

    let newAnswers: Partial<GameConfig> = { ...answers, [configKey]: configValue };
    if (configKey === 'gameType') {
      const starter =
        getStarterTemplateById(configValue as StarterTemplateId) || pickStarterFromText(userAnswer) || fallbackStarter;
      const wasInferred = starter.id !== configValue;
      newAnswers = {
        ...newAnswers,
        gameType: starter.id,
        engineId: starter.engineId,
        genreFamily: starter.genreFamily,
        starterTemplateId: starter.id,
        selectionReason: getStarterRecommendationReason(starter, wasInferred),
        dimension: starter.dimension,
        theme: answers.theme || starter.defaultTheme,
        character: answers.character || starter.defaultCharacter,
        obstacles: answers.obstacles || starter.defaultObstacle,
        customNotes: starter.id === configValue ? answers.customNotes || '' : userAnswer,
      };
    }
    setAnswers(newAnswers);
    setFreeText('');
    setIsAnimating(true);

    const currentIndex = stepOrder.indexOf(step);
    const nextStep = stepOrder[currentIndex + 1];

    setTimeout(() => {
      if (configKey === 'gameType') {
        newHistory.push({ role: 'bot', text: newAnswers.selectionReason || '' });
      }
      newHistory.push({ role: 'bot', text: BOT_MESSAGES[nextStep] });
      setChatHistory(newHistory);
      setStep(nextStep);
      setIsAnimating(false);

      if (nextStep === 'done') {
        const isGame = creationCategory === 'game';
        const starter = isGame
          ? getStarterTemplateById(
              (newAnswers.starterTemplateId || newAnswers.gameType || 'platformer') as StarterTemplateId,
            ) || fallbackStarter
          : fallbackStarter;

        const finalConfig: GameConfig = {
          gameType: (newAnswers.gameType || starter.id) as GameConfig['gameType'],
          engineId: newAnswers.engineId || starter.engineId,
          genreFamily: newAnswers.genreFamily || starter.genreFamily,
          starterTemplateId: (newAnswers.starterTemplateId || starter.id) as StarterTemplateId,
          selectionReason: newAnswers.selectionReason || getStarterRecommendationReason(starter, false),
          dimension: newAnswers.dimension || starter.dimension,
          theme: newAnswers.theme || starter.defaultTheme,
          character: newAnswers.character || starter.defaultCharacter,
          obstacles: newAnswers.obstacles || starter.defaultObstacle,
          visualStyle: newAnswers.visualStyle || 'neon',
          customNotes: newAnswers.customNotes || '',
        };
        setTimeout(() => onComplete(finalConfig), 400);
      }
    }, 250);

    setChatHistory(newHistory);
  };

  const handleOptionClick = (option: { icon: string; label: string; value: string }) => {
    if (isAnimating) return;

    const configKeys: Record<string, keyof GameConfig> = {
      gameType: 'gameType',
      theme: 'theme',
      character: 'character',
      obstacles: 'obstacles',
      visualStyle: 'visualStyle',
    };

    advanceStep(`${option.icon} ${option.label}`, configKeys[step], option.value);
  };

  const handleFreeTextSubmit = () => {
    if (!freeText.trim() || isAnimating) return;

    if (step === 'category') {
      handleCategoryPick('other', freeText.trim());
      setFreeText('');
      return;
    }

    const configKeys: Record<string, keyof GameConfig> = {
      gameType: 'gameType',
      theme: 'theme',
      character: 'character',
      obstacles: 'obstacles',
      visualStyle: 'visualStyle',
    };

    advanceStep(freeText.trim(), configKeys[step], freeText.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFreeTextSubmit();
    }
  };

  const getCurrentOptions = () => {
    if (step === 'category') return [];

    if (step === 'theme' && creationCategory !== 'game') {
      return NON_GAME_THEMES;
    }

    const family = selectedStarter.genreFamily;
    switch (step) {
      case 'gameType':
        return STUDIO_SURVEY_TEMPLATES.map((template) => ({
          icon: template.icon,
          label: `${template.label} (${template.dimension.toUpperCase()})`,
          value: template.id,
        }));
      case 'theme':
        return THEMES_BY_FAMILY[family];
      case 'character':
        return CHARACTERS_BY_FAMILY[family];
      case 'obstacles':
        return CHALLENGES_BY_FAMILY[family];
      case 'visualStyle':
        return VISUAL_STYLES;
      default:
        return [];
    }
  };

  const stepNumber = stepOrder.indexOf(step) + 1;
  const totalSteps = stepOrder.length - 1;

  const buildingLabel =
    creationCategory === 'game'
      ? `Building your ${answers.theme} ${selectedStarter.shortLabel} game...`
      : `Building your ${answers.theme || ''} ${creationCategory || 'creation'}...`;

  return (
    <div className="game-survey">
      {/* Progress Bar */}
      <div className="survey-progress">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(stepNumber / totalSteps) * 100}%` }} />
        </div>
        <span className="progress-text">{step === 'done' ? 'Building!' : `Step ${stepNumber} of ${totalSteps}`}</span>
      </div>

      {/* Chat-style conversation */}
      <div className="survey-chat">
        {chatHistory.map((msg, i) => (
          <div key={i} className={`survey-msg ${msg.role}`}>
            <div className="survey-msg-avatar">{msg.role === 'bot' ? '🤖' : '👤'}</div>
            <div className="survey-msg-bubble">
              {msg.text}
              {msg.role === 'bot' && (
                <button
                  className={`survey-read-aloud-btn ${speakingIndex === i ? 'speaking' : ''}`}
                  onClick={() => speakMessage(i, msg.text)}
                  title={speakingIndex === i ? 'Stop reading' : 'Read aloud'}
                >
                  {speakingIndex === i ? '⏹️' : '🔊'}
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Options area */}
      {step !== 'done' && (
        <div className="survey-options-area">
          <div className="survey-option-grid">
            {step === 'category' ? (
              <div className="survey-engine-group">
                <div className="survey-engine-heading">What do you want to create?</div>
                <div className="survey-engine-grid">
                  {CREATION_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      className="survey-option-btn survey-option-btn-engine"
                      onClick={() => handleCategoryPick(cat.id, `${cat.icon} ${cat.label}`)}
                      disabled={isAnimating}
                    >
                      <span className="survey-option-icon">{cat.icon}</span>
                      <span className="survey-option-text">
                        <span className="survey-option-label">{cat.label}</span>
                        <span className="survey-option-copy">{cat.description}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : step === 'gameType' ? (
              <>
                <div className="survey-engine-group">
                  <div className="survey-engine-heading">Vibe 2D Starters</div>
                  <div className="survey-engine-subheading">{ENGINE_SELECTION_GUIDE['vibe-2d'].runtimeSummary}</div>
                  <div className="survey-engine-guide-card">
                    <strong>{ENGINE_SELECTION_GUIDE['vibe-2d'].architectureReason}</strong>
                    <span>{ENGINE_SELECTION_GUIDE['vibe-2d'].iterationSweetSpot}</span>
                  </div>
                  <div className="survey-engine-grid">
                    {STARTERS_BY_ENGINE['vibe-2d'].map((template) => (
                      <button
                        key={template.id}
                        className="survey-option-btn survey-option-btn-engine"
                        onClick={() =>
                          handleOptionClick({ icon: template.icon, label: template.label, value: template.id })
                        }
                        disabled={isAnimating}
                      >
                        <span className="survey-option-icon">{template.icon}</span>
                        <span className="survey-option-text">
                          <span className="survey-option-label">{template.label}</span>
                          <span className="survey-option-copy">
                            {getStarterFamilyGuide(template.genreFamily).bestFor}
                          </span>
                        </span>
                        <span className="survey-option-meta">Vibe 2D</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              getCurrentOptions().map((opt) => (
                <button
                  key={opt.value}
                  className="survey-option-btn"
                  onClick={() => handleOptionClick(opt)}
                  disabled={isAnimating}
                >
                  <span className="survey-option-icon">{opt.icon}</span>
                  <span className="survey-option-label">{opt.label}</span>
                </button>
              ))
            )}
          </div>

          {/* Free text input */}
          <div className="survey-free-text">
            <input
              type="text"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Or type your own idea..."
              disabled={isAnimating}
            />
            <button
              className="survey-send-btn"
              onClick={handleFreeTextSubmit}
              disabled={!freeText.trim() || isAnimating}
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Building animation when done */}
      {step === 'done' && (
        <div className="survey-building">
          <div className="building-spinner" />
          <p>{buildingLabel}</p>
        </div>
      )}
    </div>
  );
}
