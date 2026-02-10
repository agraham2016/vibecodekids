import { useState, useCallback, useEffect, useRef } from 'react'
import Header from './components/Header'
import ProjectsPanel from './components/ProjectsPanel'
import ChatPanel from './components/ChatPanel'
import CodeEditor from './components/CodeEditor'
import PreviewPanel from './components/PreviewPanel'
import ShareModal from './components/ShareModal'
import AuthModal from './components/AuthModal'
import UpgradeModal from './components/UpgradeModal'
import VersionHistoryModal from './components/VersionHistoryModal'
import LandingPage from './components/LandingPage'
import { Message, Project, MembershipUsage, TierInfo, UserProject, GameConfig } from './types'
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
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [currentProject, setCurrentProject] = useState<Project>({
    id: 'new',
    name: 'My Awesome Project',
    code: DEFAULT_HTML,
    createdAt: new Date(),
    updatedAt: new Date()
  })
  const [userProjects, setUserProjects] = useState<UserProject[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null)
  const lastSavedCode = useRef<string>(DEFAULT_HTML)

  // Fetch user's projects
  const fetchUserProjects = useCallback(async (token: string) => {
    setIsLoadingProjects(true)
    try {
      const response = await fetch('/api/auth/my-projects', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const projects = await response.json()
        setUserProjects(projects)
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setIsLoadingProjects(false)
    }
  }, [])

  // Load a project by ID
  const handleLoadProject = useCallback(async (projectId: string) => {
    if (!authToken) return
    
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (response.ok) {
        const project = await response.json()
        setCode(project.code)
        setCurrentProject({
          id: project.id,
          name: project.title,
          code: project.code,
          createdAt: new Date(project.createdAt),
          updatedAt: new Date()
        })
        setMessages([])
        lastSavedCode.current = project.code
        setHasUnsavedChanges(false)
      }
    } catch (error) {
      console.error('Failed to load project:', error)
    }
  }, [authToken])

  // Create a new project (reset to default)
  const handleNewProject = useCallback(() => {
    setCode(DEFAULT_HTML)
    setMessages([])
    setCurrentProject({
      id: 'new',
      name: 'My Awesome Project',
      code: DEFAULT_HTML,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    lastSavedCode.current = DEFAULT_HTML
    setHasUnsavedChanges(false)
  }, [])

  // Delete a project (removes from studio and arcade)
  const handleDeleteProject = useCallback(async (projectId: string) => {
    if (!authToken) return
    if (!window.confirm('Delete this project? It will be removed from the Arcade too.')) return

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      })
      const data = await response.json()
      if (!response.ok) {
        alert(data.error || 'Could not delete project')
        return
      }
      fetchUserProjects(authToken)
      if (currentProject.id === projectId) {
        setCode(DEFAULT_HTML)
        setMessages([])
        setCurrentProject({
          id: 'new',
          name: 'My Awesome Project',
          code: DEFAULT_HTML,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        lastSavedCode.current = DEFAULT_HTML
        setHasUnsavedChanges(false)
      }
    } catch (err) {
      console.error('Delete project error:', err)
      alert('Could not delete project. Please try again.')
    }
  }, [authToken, currentProject.id, fetchUserProjects])

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken')
    if (token) {
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
            fetchUserProjects(token)
          } else {
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
    
    fetch('/api/membership/tiers')
      .then(res => res.json())
      .then(data => {
        if (data.tiers) {
          setTiers(data.tiers)
        }
      })
      .catch(() => {})
  }, [fetchUserProjects])

  const handleLogin = (loggedInUser: User, token: string, loginData?: { membership?: MembershipUsage, showUpgradePrompt?: boolean, tiers?: Record<string, TierInfo> }) => {
    setUser(loggedInUser)
    setAuthToken(token)
    setShowAuthModal(false)
    
    if (loginData?.membership) {
      setMembership(loginData.membership)
    }
    if (loginData?.tiers) {
      setTiers(loginData.tiers)
    }
    
    fetchUserProjects(token)
    
    if (loginData?.showUpgradePrompt) {
      setIsWelcomeUpgrade(true)
      setTimeout(() => {
        setShowUpgradeModal(true)
      }, 500)
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
    setUserProjects([])
    localStorage.removeItem('authToken')
  }

  const handleUpgradeClick = () => {
    setIsWelcomeUpgrade(false)
    setShowUpgradeModal(true)
  }

  const handleSendMessage = useCallback(async (content: string, image?: string) => {
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
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`
      }
      
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
          })),
          gameConfig: gameConfig
        })
      })

      const data = await response.json()
      
      if (response.status === 429 || response.status === 403) {
        const limitMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message || "You've reached your limit. Consider upgrading for more! ✨",
          timestamp: new Date()
        }
        setMessages(prev => [...prev, limitMessage])
        
        if (data.upgradeRequired) {
          setTimeout(() => setShowUpgradeModal(true), 1000)
        }
        return
      }

      if (!response.ok) {
        throw new Error('Failed to generate code')
      }
      
      if (data.usage) {
        setMembership(data.usage)
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])

      if (data.code) {
        setCode(data.code)
        setCurrentProject(prev => ({
          ...prev,
          code: data.code,
          updatedAt: new Date()
        }))
        if (data.code !== lastSavedCode.current) {
          setHasUnsavedChanges(true)
        }
      }
    } catch (error) {
      console.error('Error:', error)
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
  }, [code, messages, authToken, gameConfig])

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode)
    setCurrentProject(prev => ({
      ...prev,
      code: newCode,
      updatedAt: new Date()
    }))
    if (newCode !== lastSavedCode.current) {
      setHasUnsavedChanges(true)
    }
  }, [])

  // Save project handler
  const handleSave = useCallback(async () => {
    if (!authToken || isSaving) return
    
    setIsSaving(true)
    
    try {
      const response = await fetch('/api/projects/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          projectId: currentProject.id,
          title: currentProject.name,
          code: code,
          category: 'other'
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        if (currentProject.id === 'new' && data.project?.id) {
          setCurrentProject(prev => ({
            ...prev,
            id: data.project.id
          }))
        }
        
        lastSavedCode.current = code
        setHasUnsavedChanges(false)
        fetchUserProjects(authToken)
      } else {
        console.error('Save failed:', data.error)
        alert(data.error || 'Could not save project')
      }
    } catch (error) {
      console.error('Save error:', error)
      alert('Could not save project. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }, [authToken, code, currentProject.id, currentProject.name, isSaving, fetchUserProjects])

  // Handle version restore
  const handleRestoreVersion = useCallback((restoredCode: string) => {
    setCode(restoredCode)
    setCurrentProject(prev => ({
      ...prev,
      code: restoredCode,
      updatedAt: new Date()
    }))
    lastSavedCode.current = restoredCode
    setHasUnsavedChanges(false)
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
    lastSavedCode.current = DEFAULT_HTML
    setHasUnsavedChanges(false)
    setGameConfig(null) // Reset to show survey again
  }, [])

  // When the survey is completed, store the config and auto-generate the first game
  const handleSurveyComplete = useCallback((config: GameConfig) => {
    setGameConfig(config)
    // Build a descriptive prompt from the survey answers
    const buildPrompt = `Build me a ${config.theme} ${config.gameType} game where I play as a ${config.character}. The obstacles/enemies should be ${config.obstacles}. Make it look ${config.visualStyle}.${config.customNotes ? ` Also: ${config.customNotes}` : ''}`
    // Auto-send this as the first message to start building
    handleSendMessage(buildPrompt)
  }, [handleSendMessage])

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

  // Show main app for logged-in users - 3-panel IDE layout
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

      {showVersionHistory && (
        <VersionHistoryModal
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
          projectId={currentProject.id}
          authToken={authToken}
          onRestoreVersion={handleRestoreVersion}
        />
      )}
      
      <Header 
        user={user}
        membership={membership}
        onLogout={handleLogout}
        onUpgradeClick={handleUpgradeClick}
      />
      
      <main className="main-content">
        {/* Left Panel: Projects */}
        <ProjectsPanel
          userProjects={userProjects}
          isLoadingProjects={isLoadingProjects}
          currentProjectId={currentProject.id}
          projectName={currentProject.name}
          onLoadProject={handleLoadProject}
          onNewProject={handleNewProject}
          onSave={handleSave}
          onShare={() => setShowShareModal(true)}
          onOpenVersionHistory={() => setShowVersionHistory(true)}
          onStartOver={handleStartOver}
          onDeleteProject={handleDeleteProject}
          isSaving={isSaving}
          hasUnsavedChanges={hasUnsavedChanges}
          isLoggedIn={!!user}
        />
        
        {/* Middle Panel: Chat */}
        <div className="chat-panel-container">
          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            gameConfig={gameConfig}
            onSurveyComplete={handleSurveyComplete}
            currentProjectId={currentProject.id}
          />
        </div>
        
        {/* Right Panel: Preview / Code Toggle */}
        <div className="preview-code-container">
          <div className="view-toggle-bar">
            <button
              className={`view-toggle-btn ${!showCode ? 'active' : ''}`}
              onClick={() => setShowCode(false)}
            >
              <span>👁️</span> Preview
            </button>
            <button
              className={`view-toggle-btn ${showCode ? 'active' : ''}`}
              onClick={() => setShowCode(true)}
            >
              <span>👨‍💻</span> Code
            </button>
          </div>
          <div className="view-content">
            {showCode ? (
              <CodeEditor 
                code={code}
                onChange={handleCodeChange}
              />
            ) : (
              <PreviewPanel code={code} />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
