import { useState } from 'react'
import './AuthModal.css'

interface LoginData {
  membership?: any
  showUpgradePrompt?: boolean
  tiers?: any
}

interface AuthModalProps {
  onClose: () => void
  onLogin: (user: any, token: string, loginData?: LoginData) => void
  initialMode?: 'login' | 'signup'
}

type AuthMode = 'login' | 'signup'

export default function AuthModal({ onClose, onLogin, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      if (mode === 'signup') {
        // Register
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, displayName })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Could not create account')
        }

        setSuccess(data.message)
        // Clear form and switch to login
        setUsername('')
        setPassword('')
        setDisplayName('')
        setTimeout(() => {
          setMode('login')
          setSuccess('')
        }, 3000)

      } else {
        // Login
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Could not log in')
        }

        // Store token and notify parent
        localStorage.setItem('authToken', data.token)
        onLogin(data.user, data.token, {
          membership: data.membership,
          showUpgradePrompt: data.showUpgradePrompt,
          tiers: data.tiers
        })
      }

    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>✕</button>

        <div className="auth-header">
          <h2>{mode === 'login' ? '👋 Welcome Back!' : '🚀 Join Vibe Code Studio'}</h2>
          <p>
            {mode === 'login' 
              ? 'Log in to save and share your creations' 
              : 'Create an account to start building'
            }
          </p>
        </div>

        <div className="auth-tabs">
          <button 
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
          >
            Log In
          </button>
          <button 
            className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
          >
            Sign Up
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="form-group">
              <label>Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="What should we call you?"
                maxLength={30}
                required
              />
              <span className="input-hint">This is shown on your creations</span>
            </div>
          )}

          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Choose a username"
              maxLength={20}
              required
            />
            {mode === 'signup' && (
              <span className="input-hint">3-20 characters, letters & numbers only</span>
            )}
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Create a password' : 'Enter your password'}
              required
            />
            {mode === 'signup' && (
              <span className="input-hint">At least 4 characters</span>
            )}
          </div>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <button 
            type="submit" 
            className="auth-submit-btn"
            disabled={isLoading}
          >
            {isLoading 
              ? '⏳ Please wait...' 
              : mode === 'login' 
                ? '🚀 Log In' 
                : '✨ Create Account'
            }
          </button>
        </form>

        {mode === 'signup' && (
          <div className="auth-note">
            <span className="note-icon">ℹ️</span>
            <span>New accounts need admin approval before you can log in.</span>
          </div>
        )}
      </div>
    </div>
  )
}
