import { useEffect, useRef, useState, useCallback } from 'react';
import './CoachBubble.css';

export interface CoachBubbleProps {
  targetSelector: string;
  title: string;
  body: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  stepNumber: number;
  totalSteps: number;
  onNext: () => void;
  onBack?: () => void;
  onSkip: () => void;
  spotlightPadding?: number;
  nextLabel?: string;
  isMobile?: boolean;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function CoachBubble({
  targetSelector,
  title,
  body,
  position,
  stepNumber,
  totalSteps,
  onNext,
  onBack,
  onSkip,
  spotlightPadding = 12,
  nextLabel,
  isMobile = false,
}: CoachBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);

  const measure = useCallback(() => {
    const el = document.querySelector(targetSelector);
    if (!el) return;
    const r = el.getBoundingClientRect();
    setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [targetSelector]);

  useEffect(() => {
    const rafId = requestAnimationFrame(measure);
    const id = setInterval(measure, 400);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(id);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [measure]);

  if (!targetRect) return null;

  const pad = spotlightPadding;
  const spotTop = targetRect.top - pad;
  const spotLeft = targetRect.left - pad;
  const spotW = targetRect.width + pad * 2;
  const spotH = targetRect.height + pad * 2;

  const overlayStyle = {
    '--spot-top': `${spotTop}px`,
    '--spot-left': `${spotLeft}px`,
    '--spot-w': `${spotW}px`,
    '--spot-h': `${spotH}px`,
  } as React.CSSProperties;

  let bubbleStyle: React.CSSProperties = {};
  if (!isMobile) {
    const gap = 16;
    switch (position) {
      case 'top':
        bubbleStyle = {
          left: targetRect.left + targetRect.width / 2,
          top: targetRect.top - pad - gap,
          transform: 'translate(-50%, -100%)',
        };
        break;
      case 'bottom':
        bubbleStyle = {
          left: targetRect.left + targetRect.width / 2,
          top: targetRect.top + targetRect.height + pad + gap,
          transform: 'translate(-50%, 0)',
        };
        break;
      case 'left':
        bubbleStyle = {
          left: targetRect.left - pad - gap,
          top: targetRect.top + targetRect.height / 2,
          transform: 'translate(-100%, -50%)',
        };
        break;
      case 'right':
        bubbleStyle = {
          left: targetRect.left + targetRect.width + pad + gap,
          top: targetRect.top + targetRect.height / 2,
          transform: 'translate(0, -50%)',
        };
        break;
    }
  }

  const isFirst = stepNumber === 1;
  const isLast = stepNumber === totalSteps;

  return (
    <div className="coach-overlay" style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onSkip()}>
      <div
        ref={bubbleRef}
        className={`coach-bubble coach-pos-${position} ${isMobile ? 'coach-mobile' : ''}`}
        style={bubbleStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="coach-step-indicator">
          Step {stepNumber} of {totalSteps}
        </div>
        <h3 className="coach-title">{title}</h3>
        <p className="coach-body">{body}</p>
        <div className="coach-actions">
          <button className="coach-skip-btn" onClick={onSkip} type="button">
            Skip tutorial
          </button>
          <div className="coach-nav-btns">
            {!isFirst && onBack && (
              <button className="coach-back-btn" onClick={onBack} type="button">
                Back
              </button>
            )}
            <button className="coach-next-btn" onClick={onNext} type="button">
              {nextLabel || (isLast ? "Let's go!" : 'Next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
