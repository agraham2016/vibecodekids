import { useState, useEffect, useRef, useCallback } from 'react';
import PlanSelector from './PlanSelector';
import type { User, MembershipUsage, TierInfo } from '../types';
import { trackCheckoutStart, trackFormSubmit, trackMetaLead } from '../lib/marketingEvents';
import './AuthModal.css';

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

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

const NAME_ADJECTIVES = [
  'Cosmic',
  'Neon',
  'Pixel',
  'Turbo',
  'Ultra',
  'Super',
  'Mega',
  'Epic',
  'Shadow',
  'Star',
  'Blaze',
  'Thunder',
  'Crystal',
  'Hyper',
  'Rocket',
  'Astro',
  'Magic',
  'Ninja',
  'Mystic',
  'Brave',
  'Swift',
  'Lucky',
];
const NAME_NOUNS = [
  'Panda',
  'Dragon',
  'Wizard',
  'Fox',
  'Phoenix',
  'Tiger',
  'Wolf',
  'Falcon',
  'Spark',
  'Comet',
  'Racer',
  'Knight',
  'Gamer',
  'Coder',
  'Hero',
  'Builder',
  'Explorer',
  'Pirate',
  'Bot',
  'Ninja',
  'Hawk',
];

function generateNameSuggestions(): string[] {
  const results: string[] = [];
  const usedAdj = new Set<number>();
  const usedNoun = new Set<number>();
  while (results.length < 3) {
    let ai = Math.floor(Math.random() * NAME_ADJECTIVES.length);
    let ni = Math.floor(Math.random() * NAME_NOUNS.length);
    while (usedAdj.has(ai)) ai = Math.floor(Math.random() * NAME_ADJECTIVES.length);
    while (usedNoun.has(ni)) ni = Math.floor(Math.random() * NAME_NOUNS.length);
    usedAdj.add(ai);
    usedNoun.add(ni);
    const num = Math.floor(Math.random() * 90) + 10;
    results.push(`${NAME_ADJECTIVES[ai]}${NAME_NOUNS[ni]}${num}`);
  }
  return results;
}

export default function AuthModal({ onClose, onLogin, initialMode = 'login' }: AuthModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [signupStep, setSignupStep] = useState<SignupStep>('plan');
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'creator' | 'pro'>('free');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [canResendConsentEmail, setCanResendConsentEmail] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | null>(null);
  const [recaptchaSiteKey, setRecaptchaSiteKey] = useState<string | null>(null);
  const [nameSuggestions, setNameSuggestions] = useState<string[]>(() => generateNameSuggestions());
  const refreshNames = useCallback(() => setNameSuggestions(generateNameSuggestions()), []);

  // Load reCAPTCHA site key and script
  useEffect(() => {
    fetch('/api/auth/recaptcha-key')
      .then((r) => r.json())
      .then((data) => {
        if (data.siteKey) {
          setRecaptchaSiteKey(data.siteKey);
          if (!document.getElementById('recaptcha-script')) {
            const script = document.createElement('script');
            script.id = 'recaptcha-script';
            script.src = `https://www.google.com/recaptcha/api.js?render=${data.siteKey}`;
            document.head.appendChild(script);
          }
        }
      })
      .catch(() => {});
  }, []);

  const getRecaptchaToken = useCallback(async (): Promise<string | undefined> => {
    if (!recaptchaSiteKey || !window.grecaptcha) return undefined;
    try {
      return await new Promise<string>((resolve) => {
        window.grecaptcha!.ready(() => {
          window.grecaptcha!.execute(recaptchaSiteKey, { action: 'signup' }).then(resolve);
        });
      });
    } catch {
      return undefined;
    }
  }, [recaptchaSiteKey]);

  const computedAge = (() => {
    if (!birthMonth || !birthDay || !birthYear) return null;
    const today = new Date();
    const bday = new Date(parseInt(birthYear), parseInt(birthMonth) - 1, parseInt(birthDay));
    if (isNaN(bday.getTime())) return null;
    let a = today.getFullYear() - bday.getFullYear();
    const monthDiff = today.getMonth() - bday.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < bday.getDate())) a--;
    return a;
  })();

  const hasBirthday = computedAge !== null;
  const isUnder13 = hasBirthday && computedAge < 13;
  const isUnder18 = hasBirthday && computedAge < 18;
  const isAdult = hasBirthday && computedAge >= 18;

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
    setCanResendConsentEmail(false);
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        if (selectedPlan === 'free') {
          if (computedAge === null || computedAge < 5 || computedAge > 120) {
            throw new Error("Hmm, that birthday doesn't look right. Try again?");
          }

          if (computedAge < 18 && !parentEmail) {
            throw new Error("We need a parent's email to keep you safe. Ask a grown-up to type theirs!");
          }

          if (!privacyAccepted) {
            throw new Error('One more thing — check the box to agree to the rules!');
          }

          const recaptchaToken = await getRecaptchaToken();

          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username,
              password,
              displayName,
              age: computedAge,
              birthdate: `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`,
              parentEmail: computedAge < 18 ? parentEmail : undefined,
              recoveryEmail: computedAge >= 18 && recoveryEmail ? recoveryEmail : undefined,
              privacyAccepted,
              recaptchaToken,
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

          trackFormSubmit();
          trackMetaLead({
            content_name: 'Free Signup',
            content_category: 'signup',
            value: 0,
            currency: 'USD',
          });
          setSuccess(data.message);
          setUsername('');
          setPassword('');
          setDisplayName('');
          setBirthMonth('');
          setBirthDay('');
          setBirthYear('');
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
          if (computedAge === null || computedAge < 5 || computedAge > 120) {
            throw new Error("Hmm, that birthday doesn't look right. Try again?");
          }
          if (computedAge < 18 && !parentEmail) {
            throw new Error("We need a parent's email to keep you safe. Ask a grown-up to type theirs!");
          }
          if (!privacyAccepted) {
            throw new Error('One more thing — check the box to agree to the rules!');
          }

          const recaptchaTokenPaid = await getRecaptchaToken();

          const response = await fetch('/api/stripe/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tier: selectedPlan,
              username,
              password,
              displayName,
              age: computedAge,
              birthdate: `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`,
              parentEmail: computedAge < 18 ? parentEmail : undefined,
              recoveryEmail: computedAge >= 18 && recoveryEmail ? recoveryEmail : undefined,
              privacyAccepted,
              recaptchaToken: recaptchaTokenPaid,
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

          if (selectedPlan === 'creator') {
            trackMetaLead({
              content_name: 'Creator',
              content_category: 'subscription',
              value: 13,
              currency: 'USD',
            });
          } else if (selectedPlan === 'pro') {
            trackMetaLead({
              content_name: 'Pro',
              content_category: 'subscription',
              value: 21,
              currency: 'USD',
            });
          }
          trackCheckoutStart(selectedPlan);
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
          setCanResendConsentEmail(!!data.canResendConsentEmail);
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
    setCanResendConsentEmail(false);
  };

  const handleResendConsentEmail = async () => {
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/resend-consent-email', {
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
        throw new Error(data.error || 'Could not resend the approval email right now. Please try again.');
      }

      setSuccess(data.message || 'We sent a fresh approval email to your parent. Ask them to check again!');
      setCanResendConsentEmail(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not resend the approval email right now. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
            {selectedPlan === 'creator' && '🚀 Creator Plan - $13/mo'}
            {selectedPlan === 'pro' && '👑 Pro Plan - $21/mo'}
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
                    placeholder="e.g. CosmicPanda42"
                    maxLength={30}
                    required
                  />
                  <span className="input-hint">Pick a fun nickname — don't use your real name!</span>
                  <div className="name-suggestions">
                    <span className="suggestion-label">Try one:</span>
                    {nameSuggestions.map((name) => (
                      <button key={name} type="button" className="suggestion-chip" onClick={() => setDisplayName(name)}>
                        {name}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="suggestion-chip suggestion-refresh"
                      onClick={refreshNames}
                      title="More ideas"
                    >
                      🔄
                    </button>
                  </div>
                </div>
              )}

              {mode === 'signup' && (
                <div className="form-group">
                  <label>When is your birthday?</label>
                  <div className="birthday-selects">
                    <select
                      value={birthMonth}
                      onChange={(e) => setBirthMonth(e.target.value)}
                      required
                      aria-label="Month"
                    >
                      <option value="">Month</option>
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={String(i + 1)}>
                          {new Date(2000, i).toLocaleString('en-US', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                    <select value={birthDay} onChange={(e) => setBirthDay(e.target.value)} required aria-label="Day">
                      <option value="">Day</option>
                      {Array.from({ length: 31 }, (_, i) => (
                        <option key={i + 1} value={String(i + 1)}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                    <select value={birthYear} onChange={(e) => setBirthYear(e.target.value)} required aria-label="Year">
                      <option value="">Year</option>
                      {Array.from({ length: 100 }, (_, i) => {
                        const y = new Date().getFullYear() - i;
                        return (
                          <option key={y} value={String(y)}>
                            {y}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <span className="input-hint">We use this to keep everyone safe</span>
                </div>
              )}

              {mode === 'signup' && isUnder18 && (
                <div className="form-group coppa-parent-field">
                  <label>Parent or guardian's email</label>
                  <input
                    type="email"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    placeholder="your.parent@email.com"
                    required
                  />
                  <span className="input-hint">
                    {isUnder13
                      ? "We'll send one email to ask their permission. That's the only time we use it."
                      : "We'll give your parent access to their Parent Portal to manage your account."}
                  </span>
                </div>
              )}

              {mode === 'signup' && isAdult && (
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
              {mode === 'login' && canResendConsentEmail && (
                <button
                  type="button"
                  className="auth-secondary-btn"
                  onClick={handleResendConsentEmail}
                  disabled={isLoading || !username.trim() || !password}
                >
                  {isLoading ? '⏳ Sending...' : '📧 Resend Parent Email'}
                </button>
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

        {mode === 'signup' && selectedPlan === 'free' && isUnder18 && !isUnder13 && (
          <div className="auth-note auth-note-coppa">
            <span className="note-icon">👨‍👩‍👧</span>
            <span>Your account will be ready right away. We'll send your parent a link to their Parent Portal.</span>
          </div>
        )}

        {mode === 'signup' && selectedPlan === 'free' && isAdult && (
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
