import { useState, useCallback, useEffect } from 'react'
import Header from './components/Header'
import ChatPanel from './components/ChatPanel'
import CodeEditor from './components/CodeEditor'
import PreviewPanel from './components/PreviewPanel'
import ShareModal from './components/ShareModal'
import AuthModal from './components/AuthModal'
import UpgradeModal from './components/UpgradeModal'
import LandingPage from './components/LandingPage'
import { Message, Project, MembershipUsage, TierInfo } from './types'
import './App.css'

interface User {
  id: string
  username: string
  displayName: string
  status: string
  membershipTier?: 'free' | 'creator' | 'pro'
}

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: 'Nunito', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0;
    }
    .welcome {
      text-align: center;
      color: white;
      padding: 40px;
    }
    h1 {
      font-size: 3rem;
      margin-bottom: 20px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    p {
      font-size: 1.5rem;
      opacity: 0.9;
    }
    .rocket {
      font-size: 4rem;
      animation: bounce 1s ease infinite;
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-20px); }
    }
  </style>
</head>
<body>
  <div class="welcome">
    <div class="rocket">🚀</div>
    <h1>Vibe Code Studio</h1>
    <p>Tell me what you want to create and I'll help you make it!</p>
  </div>
</body>
</html>`

function App() {
  const [showShareModal, setShowShareModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const [code, setCode] = useState(DEFAULT_HTML)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [membership, setMembership] = useState<MembershipUsage | null>(null)
  const [tiers, setTiers] = useState<Record<string, TierInfo>>({})
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [isWelcomeUpgrade, setIsWelcomeUpgrade] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true) // Check session on load
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [currentProject, setCurrentProject] = useState<Project>({
    id: 'new',
    name: 'My Awesome Project',
    code: DEFAULT_HTML,
    createdAt: new Date(),
    updatedAt: new Date()
  })

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken')
    if (token) {
      // Verify session
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setUser(data.user)
            setAuthToken(token)
            if (data.membership) {
              setMembership(data.membership)
            }
          } else {
            // Invalid token, clear it
            localStorage.removeItem('authToken')
          }
        })
        .catch(() => {
          localStorage.removeItem('authToken')
        })
        .finally(() => {
          setIsCheckingAuth(false)
        })
    } else {
      setIsCheckingAuth(false)
    }
    
    // Fetch tier info (public endpoint)
    fetch('/api/membership/tiers')
      .then(res => res.json())
      .then(data => {
        if (data.tiers) {
          setTiers(data.tiers)
        }
      })
      .catch(() => {})
  }, [])

  const handleLogin = (loggedInUser: User, token: string, loginData?: { membership?: MembershipUsage, showUpgradePrompt?: boolean, tiers?: Record<string, TierInfo> }) => {
    setUser(loggedInUser)
    setAuthToken(token)
    setShowAuthModal(false)
    
    // Set membership info if provided
    if (loginData?.membership) {
      setMembership(loginData.membership)
    }
    
    // Set tiers if provided
    if (loginData?.tiers) {
      setTiers(loginData.tiers)
    }
    
    // Show upgrade prompt for new/free users (the sale opportunity!)
    if (loginData?.showUpgradePrompt) {
      setIsWelcomeUpgrade(true)
      setTimeout(() => {
        setShowUpgradeModal(true)
      }, 500) // Small delay for better UX
    }
  }

  const handleLogout = () => {
    if (authToken) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      })
    }
    setUser(null)
    setAuthToken(null)
    setMembership(null)
    localStorage.removeItem('authToken')
  }

  const handleUpgradeClick = () => {
    setIsWelcomeUpgrade(false)
    setShowUpgradeModal(true)
  }

  const handleSendMessage = useCallback(async (content: string, image?: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      image,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      // Build headers with auth token if available
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`
      }
      
      // Call our API
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: content,
          image,
          currentCode: code,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content,
            image: m.image
          }))
        })
      })

      const data = await response.json()
      
      // Handle rate limiting or tier limits
      if (response.status === 429 || response.status === 403) {
        const limitMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message || "You've reached your limit. Consider upgrading for more! ✨",
          timestamp: new Date()
        }
        setMessages(prev => [...prev, limitMessage])
        
        // Show upgrade modal if needed
        if (data.upgradeRequired) {
          setTimeout(() => setShowUpgradeModal(true), 1000)
        }
        return
      }

      if (!response.ok) {
        throw new Error('Failed to generate code')
      }
      
      // Update membership usage if provided
      if (data.usage) {
        setMembership(data.usage)
      }
      
      // Add assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])

      // Update code if provided
      if (data.code) {
        setCode(data.code)
        setCurrentProject(prev => ({
          ...prev,
          code: data.code,
          updatedAt: new Date()
        }))
      }
    } catch (error) {
      console.error('Error:', error)
      // Add error message in kid-friendly way
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Oops! Something went wrong on my end. 😅 Can you try asking me again? Sometimes I need a second try!",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [code, messages, authToken])

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode)
    setCurrentProject(prev => ({
      ...prev,
      code: newCode,
      updatedAt: new Date()
    }))
  }, [])

  const handleStartOver = useCallback(() => {
    setCode(DEFAULT_HTML)
    setMessages([])
    setCurrentProject({
      id: 'new',
      name: 'My Awesome Project',
      code: DEFAULT_HTML,
      createdAt: new Date(),
      updatedAt: new Date()
    })
  }, [])

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="app loading-screen">
        <div className="loading-content">
          <div className="loading-icon">🚀</div>
          <p>Loading Vibe Code Kidz...</p>
        </div>
      </div>
    )
  }

  // Show landing page if not logged in
  if (!user) {
    return (
      <div className="app">
        {showAuthModal && (
          <AuthModal
            onClose={() => setShowAuthModal(false)}
            onLogin={handleLogin}
            initialMode={authMode}
          />
        )}
        <LandingPage 
          onLoginClick={() => {
            setAuthMode('login')
            setShowAuthModal(true)
          }}
          onSignupClick={() => {
            setAuthMode('signup')
            setShowAuthModal(true)
          }}
        />
      </div>
    )
  }

  // Show main app for logged-in users
  return (
    <div className="app">
      {showShareModal && (
        <ShareModal
          code={code}
          onClose={() => setShowShareModal(false)}
          authToken={authToken}
          userDisplayName={user?.displayName}
        />
      )}

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onLogin={handleLogin}
        />
      )}

      {showUpgradeModal && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => {
            setShowUpgradeModal(false)
            setIsWelcomeUpgrade(false)
          }}
          currentTier={user?.membershipTier || 'free'}
          tiers={tiers}
          isWelcomePrompt={isWelcomeUpgrade}
        />
      )}
      
      <Header 
        projectName={currentProject.name}
        onStartOver={handleStartOver}
        onShare={() => setShowShareModal(true)}
        showCode={showCode}
        onToggleCode={() => setShowCode(!showCode)}
        user={user}
        membership={membership}
        onLoginClick={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        onUpgradeClick={handleUpgradeClick}
      />
      
      <main className={`main-content ${showCode ? 'with-code' : ''}`}>
        <ChatPanel 
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
        
        {showCode && (
          <CodeEditor 
            code={code}
            onChange={handleCodeChange}
          />
        )}
        
        <PreviewPanel code={code} />
      </main>
    </div>
  )
}

export default App
