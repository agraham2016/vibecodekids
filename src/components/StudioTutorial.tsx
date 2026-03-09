import { useState, useEffect, useCallback, useRef } from 'react';
import CoachBubble from './CoachBubble';
import { tutorialKey } from './tutorialUtils';

interface StudioTutorialProps {
  active: boolean;
  messageCount: number;
  isLoading: boolean;
  startAtStep?: number;
  userId?: string | null;
  onComplete: () => void;
  onSkip: () => void;
  onSwitchMobileTab?: (tab: 'chat' | 'game') => void;
}

interface TutorialStep {
  targetSelector: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  title: string;
  body: string;
  nextLabel?: string;
  mobileTab: 'chat' | 'game';
}

const STEPS: TutorialStep[] = [
  {
    targetSelector: '.game-starters-grid',
    position: 'right',
    title: 'Pick Your Game',
    body: 'Start by choosing a game type! Each one gives the AI a head start. Tap one that looks fun to you.',
    nextLabel: 'Next',
    mobileTab: 'chat',
  },
  {
    targetSelector: '.chat-input-area',
    position: 'top',
    title: 'Tell the AI What You Want',
    body: "Start simple! Try: 'make me a space racing game'. Once it's built, ask for changes one at a time like 'add asteroids' or 'make it faster'. Small steps = awesome games.",
    mobileTab: 'chat',
  },
  {
    targetSelector: '.preview-iframe-wrapper',
    position: 'left',
    title: 'Watch the Magic',
    body: "The AI is writing your game right now! When it's done, you'll see it appear here. Click 'Play My Creation!' to try it out.",
    mobileTab: 'game',
  },
  {
    targetSelector: '.chat-input-area',
    position: 'top',
    title: 'Make It Yours',
    body: "Don't like something? Just ask! Try: 'change the player to a dragon' or 'make it faster'. One change at a time works best.",
    mobileTab: 'chat',
  },
  {
    targetSelector: '.quick-actions',
    position: 'top',
    title: 'Power Moves',
    body: "These buttons level up your game: 'Make It Fun' adds creative surprises. 'Team Up' has two AIs work together to make something amazing. Try them!",
    nextLabel: "Let's go!",
    mobileTab: 'chat',
  },
];

export default function StudioTutorial({
  active,
  messageCount,
  isLoading,
  startAtStep = 1,
  userId,
  onComplete,
  onSkip,
  onSwitchMobileTab,
}: StudioTutorialProps) {
  const [step, setStep] = useState(startAtStep);
  const prevMessageCountRef = useRef(messageCount);
  const prevLoadingRef = useRef(isLoading);

  useEffect(() => {
    if (active) {
      localStorage.setItem(tutorialKey(userId), `in_progress:${step}`);
    }
  }, [step, active, userId]);

  useEffect(() => {
    if (!active) {
      prevMessageCountRef.current = messageCount;
      prevLoadingRef.current = isLoading;
      return;
    }

    const prev = prevMessageCountRef.current;
    const prevLoad = prevLoadingRef.current;

    const handle = requestAnimationFrame(() => {
      if (step === 1 && messageCount > prev) {
        setStep(2);
      } else if (step === 2 && isLoading && !prevLoad) {
        setStep(3);
        onSwitchMobileTab?.('game');
      } else if (step === 3 && !isLoading && prevLoad && messageCount > prev) {
        setStep(4);
        onSwitchMobileTab?.('chat');
      } else if (step === 4 && messageCount > prev) {
        setTimeout(() => {
          if (document.querySelector('.quick-actions')) setStep(5);
        }, 500);
      }
    });

    prevMessageCountRef.current = messageCount;
    prevLoadingRef.current = isLoading;

    return () => cancelAnimationFrame(handle);
  }, [active, step, messageCount, isLoading, onSwitchMobileTab]);

  // Switch mobile tab when step changes
  useEffect(() => {
    if (!active) return;
    const s = STEPS[step - 1];
    if (s) onSwitchMobileTab?.(s.mobileTab);
  }, [step, active, onSwitchMobileTab]);

  const handleNext = useCallback(() => {
    if (step >= STEPS.length) {
      localStorage.setItem(tutorialKey(userId), 'completed');
      onComplete();
    } else {
      setStep(step + 1);
    }
  }, [step, onComplete, userId]);

  const handleBack = useCallback(() => {
    if (step > 1) setStep(step - 1);
  }, [step]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(tutorialKey(userId), 'skipped');
    onSkip();
  }, [onSkip, userId]);

  if (!active || step < 1 || step > STEPS.length) return null;

  const currentStep = STEPS[step - 1];
  const isMobile = window.innerWidth < 768;

  // If the target doesn't exist yet (e.g. quick-actions not rendered), show the bubble
  // anchored to chat-input-area as a fallback
  const targetExists = !!document.querySelector(currentStep.targetSelector);
  const fallbackSelector = '.chat-input-area';

  return (
    <CoachBubble
      targetSelector={targetExists ? currentStep.targetSelector : fallbackSelector}
      title={currentStep.title}
      body={currentStep.body}
      position={targetExists ? currentStep.position : 'top'}
      stepNumber={step}
      totalSteps={STEPS.length}
      onNext={handleNext}
      onBack={step > 1 ? handleBack : undefined}
      onSkip={handleSkip}
      nextLabel={currentStep.nextLabel}
      isMobile={isMobile}
    />
  );
}
