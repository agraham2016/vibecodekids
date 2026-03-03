import { useState, useEffect, useRef } from 'react';
import PlanSelector from './PlanSelector';
import type { User, MembershipUsage, TierInfo } from '../types';
import './AuthModal.css';

interface LoginData {
  membership?: MembershipUsage;
  showUpgradePrompt?: boolean;
  tiers?: Record<string, TierInfo>;
}

interface AuthModalProps {
  onClose: () => void;
  onLogin: (user: User, token: string, loginData?: LoginData) => void;
  initialMode?: 'login' | 'signup';
}

type AuthMode = 'login' | 'signup';
type SignupStep = 'plan' | 'details';

export default function AuthModal({ onClose, onLogin, initialMode = 'login' }: AuthModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [signupStep, setSignupStep] = useState<SignupStep>('plan');
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'creator' | 'pro'>('free');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | null>(null);

  const isUnder13 = age !== '' && parseInt(age) < 13;
  const is13Plus = age !== '' && parseInt(age) >= 13;

  useEffect(() => {
    const closeBtn = modalRef.current?.querySelector('.close-btn') as HTMLElement | null;
    if (closeBtn) closeBtn.focus();

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        if (selectedPlan === 'free') {
          // Validate age
          const ageNum = parseInt(age);
          if (!age || isNaN(ageNum) || ageNum < 5 || ageNum > 120) {
            throw new Error("Hmm, that age doesn't look right. Try again?");
          }

          if (ageNum < 13 && !parentEmail) {
            throw new Error("We need a parent's email to keep you safe. Ask a grown-up to type theirs!");
          }

          if (!privacyAccepted) {
            throw new Error('One more thing — check the box to agree to the rules!');
          }

          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username,
              password,
              displayName,
              age: ageNum,
              parentEmail: ageNum < 13 ? parentEmail : undefined,
              recoveryEmail: ageNum >= 13 && recoveryEmail ? recoveryEmail : undefined,
              privacyAccepted,
            }),
          });

          const contentType = response.headers.get('content-type');
          if (!contentType?.includes('application/json')) {
            throw new Error('Our robots are taking a break. Try again in a minute!');
          }
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Oops! Something went wrong. Try again?');
          }

          setSuccess(data.message);
          setUsername('');
          setPassword('');
          setDisplayName('');
          setAge('');
          setParentEmail('');
          setPrivacyAccepted(false);
          setTimeout(
            () => {
              setMode('login');
              setSignupStep('plan');
              setSuccess('');
            },
            data.requiresParentalConsent ? 8000 : 3000,
          );
        } else {
          // Paid plan: Create Stripe checkout with COPPA fields
          const ageNum = parseInt(age);
          if (!age || isNaN(ageNum) || ageNum < 5 || ageNum > 120) {
            throw new Error("Hmm, that age doesn't look right. Try again?");
          }
          if (ageNum < 13 && !parentEmail) {
            throw new Error("We need a parent's email to keep you safe. Ask a grown-up to type theirs!");
          }
          if (!privacyAccepted) {
            throw new Error('One more thing — check the box to agree to the rules!');
          }

          const response = await fetch('/api/stripe/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tier: selectedPlan,
              username,
              password,
              displayName,
              age: ageNum,
              parentEmail: ageNum < 13 ? parentEmail : undefined,
              recoveryEmail: ageNum >= 13 && recoveryEmail ? recoveryEmail : undefined,
              privacyAccepted,
            }),
          });

          const contentType = response.headers.get('content-type');
          if (!contentType?.includes('application/json')) {
            throw new Error('Our robots are taking a break. Try again in a minute!');
          }
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Oops! Something went wrong. Try again?');
          }

          // Redirect to Stripe Checkout
          window.location.href = data.checkoutUrl;
        }
      } else if (forgotStep === 'request') {
        // Forgot password: request reset link
        const response = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.trim() }),
        });
        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          throw new Error('Our robots are taking a break. Try again in a minute!');
        }
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Oops! Something went wrong. Try again?');
        }
        setSuccess("If an account exists and has a recovery email on file, we've sent reset instructions.");
        setForgotStep(null);
        setUsername('');
      } else {
        // Login
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });

        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          throw new Error('Our robots are taking a break. Try again in a minute!');
        }
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Oops! Something went wrong. Try again?');
        }

        localStorage.setItem('authToken', data.token);
        onLogin(data.user, data.token, {
          membership: data.membership,
          showUpgradePrompt: data.showUpgradePrompt,
          tiers: data.tiers,
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Oops! Something went wrong. Try again?');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeSwitch = (newMode: AuthMode) => {
    setMode(newMode);
    setSignupStep('plan');
    setForgotStep(null);
    setError('');
    setSuccess('');
  };

  // Show plan selector for signup
  if (mode === 'signup' && signupStep === 'plan') {
    return (
      <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Choose a plan">
        <div className="auth-modal auth-modal-wide" onClick={(e) => e.stopPropagation()} ref={modalRef}>
          <button className="close-btn" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>

          <PlanSelector
            selectedPlan={selectedPlan}
            onSelectPlan={setSelectedPlan}
            onContinue={() => setSignupStep('details')}
            onBack={() => handleModeSwitch('login')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <div className="auth-modal" onClick={(e) => e.stopPropagation()} ref={modalRef}>
        <button className="close-btn" onClick={onClose} aria-label="Close dialog">
          ✕
        </button>

        <div className="auth-header">
          <h2 id="auth-modal-title">{mode === 'login' ? '👋 Welcome Back!' : '🚀 Create Your Account'}</h2>
          <p>
            {mode === 'login'
              ? 'Log in to save and share your creations'
              : selectedPlan === 'free'
                ? 'Sign up for free to get started'
                : `Sign up for the ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} plan`}
          </p>
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => handleModeSwitch('login')}>
            Log In
          </button>
          <button
            className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => handleModeSwitch('signup')}
          >
            Sign Up
          </button>
        </div>

        {mode === 'signup' && (
          <div className="selected-plan-badge">
            {selectedPlan === 'free' && '⭐ Free Plan'}
            {selectedPlan === 'creator' && '🚀 Creator Plan - $7/mo'}
            {selectedPlan === 'pro' && '👑 Pro Plan - $14/mo'}
            <button className="change-plan-btn" onClick={() => setSignupStep('plan')}>
              Change
            </button>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'login' && forgotStep === 'request' && (
            <>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  maxLength={20}
                  required
                />
                <span className="input-hint">We'll send reset instructions to the email on file.</span>
              </div>
              {error && (
                <div className="auth-error" id="auth-error-forgot" role="alert">
                  {error}
                </div>
              )}
              {success && <div className="auth-success">{success}</div>}
              <button type="submit" className="auth-submit-btn" disabled={isLoading}>
                {isLoading ? '⏳ Sending...' : '📧 Send Reset Link'}
              </button>
              <button
                type="button"
                className="auth-forgot-back"
                onClick={() => {
                  setForgotStep(null);
                  setError('');
                  setSuccess('');
                  setUsername('');
                }}
              >
                ← Back to Login
              </button>
            </>
          )}
          {!forgotStep && (
            <>
              {mode === 'signup' && (
                <div className="form-group">
                  <label>Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="What should we call you?"
                    maxLength={30}
                    required
                  />
                  <span className="input-hint">This is shown on your creations</span>
                </div>
              )}

              {mode === 'signup' && (
                <div className="form-group">
                  <label>How old are you?</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Enter your age"
                    min={5}
                    max={120}
                    required
                  />
                  <span className="input-hint">We ask to keep everyone safe — we don't save your exact age</span>
                </div>
              )}

              {mode === 'signup' && isUnder13 && (
                <div className="form-group coppa-parent-field">
                  <label>Your parent or guardian's email</label>
                  <input
                    type="email"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    placeholder="your.parent@email.com"
                    required
                  />
                  <span className="input-hint">
                    We'll send one email to ask their permission. That's the only time we use it.
                  </span>
                </div>
              )}

              {mode === 'signup' && is13Plus && (
                <div className="form-group">
                  <label>Recovery Email (optional)</label>
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                  <span className="input-hint">
                    Add an email to recover your password if you forget it. We never use it for anything else.
                  </span>
                </div>
              )}

              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  maxLength={20}
                  required
                />
                {mode === 'signup' && (
                  <span className="input-hint">Don't use your real name — pick something fun!</span>
                )}
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Create a password' : 'Enter your password'}
                  required
                />
                {mode === 'signup' && (
                  <span className="input-hint">At least 8 characters — or try a fun passphrase!</span>
                )}
              </div>

              {mode === 'signup' && (
                <div className="form-group privacy-checkbox">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={privacyAccepted}
                      onChange={(e) => setPrivacyAccepted(e.target.checked)}
                      required
                    />
                    <span>
                      I agree to the{' '}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer">
                        Privacy Policy
                      </a>{' '}
                      and{' '}
                      <a href="/terms" target="_blank" rel="noopener noreferrer">
                        Terms of Service
                      </a>
                    </span>
                  </label>
                </div>
              )}

              {error && (
                <div className="auth-error" id="auth-error-main" role="alert">
                  {error}
                </div>
              )}
              {success && <div className="auth-success">{success}</div>}

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={isLoading}
                aria-describedby={error ? 'auth-error-main' : undefined}
              >
                {isLoading
                  ? '⏳ Please wait...'
                  : mode === 'login'
                    ? '🚀 Log In'
                    : selectedPlan === 'free'
                      ? "✨ Let's Go!"
                      : '💳 Continue to Payment'}
              </button>
              {mode === 'login' && (
                <button type="button" className="auth-forgot-link" onClick={() => setForgotStep('request')}>
                  Forgot password?
                </button>
              )}
            </>
          )}
        </form>

        {mode === 'signup' && selectedPlan === 'free' && isUnder13 && (
          <div className="auth-note auth-note-coppa">
            <span className="note-icon">👨‍👩‍👧</span>
            <span>Almost there! Ask your parent to check their email and tap 'Approve.' Then you can log in!</span>
          </div>
        )}

        {mode === 'signup' && selectedPlan === 'free' && !isUnder13 && (
          <div className="auth-note">
            <span className="note-icon">ℹ️</span>
            <span>Your account will be ready to use right away.</span>
          </div>
        )}

        {mode === 'signup' && selectedPlan !== 'free' && (
          <div className="auth-note auth-note-payment">
            <span className="note-icon">🔒</span>
            <span>Secure payment powered by Stripe. Cancel anytime.</span>
          </div>
        )}
      </div>
    </div>
  );
}
