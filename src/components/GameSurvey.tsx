import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GameConfig, StarterTemplateId } from '../types';
import {
  STARTER_TEMPLATES,
  THEMES_BY_FAMILY,
  CHARACTERS_BY_FAMILY,
  CHALLENGES_BY_FAMILY,
  VISUAL_STYLES,
  getStarterTemplateById,
} from '../config/gameCatalog';
import './GameSurvey.css';

interface GameSurveyProps {
  onComplete: (config: GameConfig) => void;
}

// ========== SURVEY DATA ==========

// ========== SURVEY STEPS ==========

type SurveyStep = 'gameType' | 'theme' | 'character' | 'obstacles' | 'visualStyle' | 'done';

const STEP_ORDER: SurveyStep[] = ['gameType', 'theme', 'character', 'obstacles', 'visualStyle', 'done'];

const BOT_MESSAGES: Record<string, string> = {
  gameType:
    'Hey there! Pick a starter game and I will build around it, or type your own idea and I will choose a great engine path!',
  theme: 'Awesome choice! Where does your game take place?',
  character: 'Cool! Who or what do you control in the game?',
  obstacles: 'Nice! What do you have to dodge or fight?',
  visualStyle: 'Last one! What style should your game look like?',
  done: 'Got it! Let me build your game now!',
};

// ========== COMPONENT ==========

export default function GameSurvey({ onComplete }: GameSurveyProps) {
  const [step, setStep] = useState<SurveyStep>('gameType');
  const [answers, setAnswers] = useState<Partial<GameConfig>>({});
  const [freeText, setFreeText] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'bot' | 'user'; text: string }[]>([
    { role: 'bot', text: BOT_MESSAGES.gameType },
  ]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Text-to-speech for bot messages
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

  // Cancel speech on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const selectedStarter = useMemo(
    () =>
      getStarterTemplateById((answers.starterTemplateId || 'platformer') as StarterTemplateId) || STARTER_TEMPLATES[0],
    [answers.starterTemplateId],
  );

  const pickStarterFromText = useCallback((value: string) => {
    const lower = value.toLowerCase();
    return (
      STARTER_TEMPLATES.find((template) => {
        const haystack =
          `${template.label} ${template.shortLabel} ${template.description} ${template.promptHint}`.toLowerCase();
        return (
          haystack.includes(lower) ||
          lower.includes(template.id.replace(/-/g, ' ')) ||
          lower.includes(template.shortLabel.toLowerCase())
        );
      }) ||
      (/\b3d\b|\broblox\b|\bobby\b/.test(lower)
        ? getStarterTemplateById('obby')
        : /\bsurvival\b|\bcraft\b|\bbuild\b/.test(lower)
          ? getStarterTemplateById('survival-crafting-game')
          : /\bpet\b|\banimal\b/.test(lower)
            ? getStarterTemplateById('pet-care-simulator')
            : /\brace\b|\bracing\b|\bcar\b/.test(lower)
              ? getStarterTemplateById('simple-racing')
              : /\bmaze\b|\bescape\b|\bdetective\b|\bmystery\b/.test(lower)
                ? getStarterTemplateById('maze-escape')
                : STARTER_TEMPLATES[0])
    );
  }, []);

  const fallbackStarter = STARTER_TEMPLATES[0]!;

  const advanceStep = (userAnswer: string, configKey: keyof GameConfig, configValue: string) => {
    // Add user answer to chat
    const newHistory = [...chatHistory, { role: 'user' as const, text: userAnswer }];

    // Update answers
    let newAnswers: Partial<GameConfig> = { ...answers, [configKey]: configValue };
    if (configKey === 'gameType') {
      const starter =
        getStarterTemplateById(configValue as StarterTemplateId) || pickStarterFromText(userAnswer) || fallbackStarter;
      newAnswers = {
        ...newAnswers,
        gameType: starter.id,
        engineId: starter.engineId,
        genreFamily: starter.genreFamily,
        starterTemplateId: starter.id,
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

    // Find next step
    const currentIndex = STEP_ORDER.indexOf(step);
    const nextStep = STEP_ORDER[currentIndex + 1];

    // Add bot response after a brief delay
    setTimeout(() => {
      newHistory.push({ role: 'bot', text: BOT_MESSAGES[nextStep] });
      setChatHistory(newHistory);
      setStep(nextStep);
      setIsAnimating(false);

      // If we reached 'done', complete the survey
      if (nextStep === 'done') {
        const starter =
          getStarterTemplateById(
            (newAnswers.starterTemplateId || newAnswers.gameType || 'platformer') as StarterTemplateId,
          ) || fallbackStarter;
        const finalConfig: GameConfig = {
          gameType: (newAnswers.gameType || starter.id) as GameConfig['gameType'],
          engineId: newAnswers.engineId || starter.engineId,
          genreFamily: newAnswers.genreFamily || starter.genreFamily,
          starterTemplateId: (newAnswers.starterTemplateId || starter.id) as StarterTemplateId,
          dimension: newAnswers.dimension || starter.dimension,
          theme: newAnswers.theme || starter.defaultTheme,
          character: newAnswers.character || starter.defaultCharacter,
          obstacles: newAnswers.obstacles || starter.defaultObstacle,
          visualStyle: newAnswers.visualStyle || 'neon',
          customNotes: newAnswers.customNotes || '',
        };
        // Small delay so the kid sees the "building" message
        setTimeout(() => onComplete(finalConfig), 1000);
      }
    }, 600);

    // Update chat immediately with user message
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

  // Get options for current step
  const getCurrentOptions = () => {
    const family = selectedStarter.genreFamily;
    switch (step) {
      case 'gameType':
        return STARTER_TEMPLATES.map((template) => ({
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

  const stepNumber = STEP_ORDER.indexOf(step) + 1;
  const totalSteps = STEP_ORDER.length - 1; // Exclude 'done'

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
            {getCurrentOptions().map((opt) => (
              <button
                key={opt.value}
                className="survey-option-btn"
                onClick={() => handleOptionClick(opt)}
                disabled={isAnimating}
              >
                <span className="survey-option-icon">{opt.icon}</span>
                <span className="survey-option-label">{opt.label}</span>
              </button>
            ))}
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
          <p>
            Building your {answers.theme} {selectedStarter.shortLabel} with{' '}
            {selectedStarter.engineId === 'vibe-3d' ? 'Vibe 3D' : 'Vibe 2D'}...
          </p>
        </div>
      )}
    </div>
  );
}
