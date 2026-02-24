import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from './context/AuthContext'
import { useProjects } from './hooks/useProjects'
import { useChat } from './hooks/useChat'
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
import './App.css'

function App() {
  // Auth from context (no more prop drilling)
  const { user, token, membership, tiers, isCheckingAuth, login, logout, setMembership } = useAuth()

  // Project management (pass isLoggedIn to enable auto-save)
  const {
    code,
    currentProject,
    userProjects,
    isLoadingProjects,
    isSaving,
    hasUnsavedChanges,
    lastAutoSavedAt,
    fetchUserProjects,
    loadProject,
    newProject,
    deleteProject,
    saveProject,
    updateCode,
    restoreVersion,
    setGeneratedCode,
  } = useProjects(!!user)

  // UI state
  const [showShareModal, setShowShareModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [isWelcomeUpgrade, setIsWelcomeUpgrade] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [showVersionHistory, setShowVersionHistory] = useState(false)

  // Mobile/tablet navigation
  const [mobileTab, setMobileTab] = useState<'chat' | 'game' | 'projects'>('chat')
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Splash video intro
  const splashSeen = sessionStorage.getItem('vck-splash-seen')
  const [showSplash, setShowSplash] = useState(!splashSeen && !user)
  const splashVideoRef = useRef<HTMLVideoElement>(null)

  const endSplash = useCallback(() => {
    setShowSplash(false)
    sessionStorage.setItem('vck-splash-seen', '1')
    if (splashVideoRef.current) splashVideoRef.current.pause()
  }, [])

  useEffect(() => {
    if (!showSplash) return
    const timer = setTimeout(endSplash, 15000)
    return () => clearTimeout(timer)
  }, [showSplash, endSplash])

  // Chat with AI generation callbacks (dual-model)
  const { 
    messages, isLoading, sendMessage, clearMessages,
    activeModel, switchModel, grokAvailable, lastModelUsed 
  } = useChat({
    onCodeGenerated: setGeneratedCode,
    onUsageUpdate: setMembership,
    onUpgradeNeeded: () => setShowUpgradeModal(true),
  })

  // Fetch projects when user logs in
  useEffect(() => {
    if (token) {
      fetchUserProjects()
    }
  }, [token, fetchUserProjects])

  // Login handler
  const handleLogin = useCallback((loggedInUser: any, newToken: string, loginData?: any) => {
    login({
      success: true,
      token: newToken,
      user: loggedInUser,
      membership: loginData?.membership,
      showUpgradePrompt: loginData?.showUpgradePrompt,
      tiers: loginData?.tiers,
    })
    setShowAuthModal(false)

    if (loginData?.showUpgradePrompt) {
      setIsWelcomeUpgrade(true)
      setTimeout(() => setShowUpgradeModal(true), 500)
    }
  }, [login])

  const handleLogout = useCallback(() => {
    logout()
    clearMessages()
  }, [logout, clearMessages])

  const handleSendMessage = useCallback(async (content: string, image?: string, modeOverride?: any) => {
    await sendMessage(content, image, code, null, modeOverride)
  }, [sendMessage, code])

  // Handle using alternate code from critic/side-by-side view
  const handleUseAlternateCode = useCallback((altCode: string) => {
    setGeneratedCode(altCode)
  }, [setGeneratedCode])

  const handleLoadProject = useCallback(async (projectId: string) => {
    const project = await loadProject(projectId)
    if (project) clearMessages()
  }, [loadProject, clearMessages])

  const handleNewProject = useCallback(() => {
    newProject()
    clearMessages()
  }, [newProject, clearMessages])

  const handleStartOver = useCallback(() => {
    newProject()
    clearMessages()
  }, [newProject, clearMessages])

  const handleUpgradeClick = useCallback(() => {
    setIsWelcomeUpgrade(false)
    setShowUpgradeModal(true)
  }, [])

  // Loading screen
  if (isCheckingAuth) {
    return (
      <div className="app loading-screen">
        <div className="loading-content">
          <img src="/images/logo.png" alt="VibeCode Kids" className="loading-logo" />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  // Landing page for unauthenticated users
  if (!user) {
    return (
      <div className="app">
        {showSplash && (
          <>
            <div className="splash-overlay" style={{
              position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
              zIndex: 10000, background: '#0d0221', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              transition: 'opacity 0.8s ease',
            }}>
              <video
                ref={splashVideoRef}
                autoPlay muted playsInline
                onEnded={endSplash}
                onError={endSplash}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              >
                <source src="/videos/intro.mp4" type="video/mp4" />
              </video>
            </div>
            <button onClick={endSplash} style={{
              position: 'fixed', bottom: 40, right: 40, zIndex: 10001,
              padding: '12px 28px', background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.25)', borderRadius: 50,
              color: 'rgba(255,255,255,0.85)', fontFamily: "'Nunito', sans-serif",
              fontSize: '0.85rem', fontWeight: 700, letterSpacing: '1.5px',
              textTransform: 'uppercase' as const, cursor: 'pointer',
              animation: 'splashSkipFadeIn 0.6s ease 1.5s forwards', opacity: 0,
            }}>
              Skip Intro
            </button>
          </>
        )}
        {showAuthModal && (
          <AuthModal
            onClose={() => setShowAuthModal(false)}
            onLogin={handleLogin}
            initialMode={authMode}
          />
        )}
        <LandingPage
          onLoginClick={() => { setAuthMode('login'); setShowAuthModal(true) }}
          onSignupClick={() => { setAuthMode('signup'); setShowAuthModal(true) }}
        />
      </div>
    )
  }

  // Main 3-panel IDE layout
  return (
    <div className="app">
      {showShareModal && (
        <ShareModal
          code={code}
          onClose={() => setShowShareModal(false)}
          authToken={token}
          userDisplayName={user.displayName}
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
          onClose={() => { setShowUpgradeModal(false); setIsWelcomeUpgrade(false) }}
          currentTier={user.membershipTier || 'free'}
          tiers={tiers}
          isWelcomePrompt={isWelcomeUpgrade}
        />
      )}

      {showVersionHistory && (
        <VersionHistoryModal
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
          projectId={currentProject.id}
          authToken={token}
          onRestoreVersion={restoreVersion}
        />
      )}

      <Header
        user={user}
        membership={membership}
        onLogout={handleLogout}
        onUpgradeClick={handleUpgradeClick}
        onDrawerToggle={() => setDrawerOpen(prev => !prev)}
      />

      {/* Drawer overlay for tablet/mobile */}
      {drawerOpen && <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} />}

      <main className={`main-content ${drawerOpen ? 'drawer-open' : ''}`}>
        <div className={`projects-drawer ${drawerOpen ? 'open' : ''}`}>
          <ProjectsPanel
            userProjects={userProjects}
            isLoadingProjects={isLoadingProjects}
            currentProjectId={currentProject.id}
            projectName={currentProject.name}
            onLoadProject={(id) => { handleLoadProject(id); setDrawerOpen(false); }}
            onNewProject={() => { handleNewProject(); setDrawerOpen(false); }}
            onSave={saveProject}
            onShare={() => setShowShareModal(true)}
            onOpenVersionHistory={() => setShowVersionHistory(true)}
            onStartOver={handleStartOver}
            onDeleteProject={deleteProject}
            isSaving={isSaving}
            hasUnsavedChanges={hasUnsavedChanges}
            isLoggedIn={!!user}
            lastAutoSavedAt={lastAutoSavedAt}
          />
        </div>

        <div className={`chat-panel-container mobile-panel ${mobileTab === 'chat' ? 'mobile-active' : ''}`}>
          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            activeModel={activeModel}
            onSwitchModel={switchModel}
            grokAvailable={grokAvailable}
            lastModelUsed={lastModelUsed}
            onUseAlternateCode={handleUseAlternateCode}
          />
        </div>

        <div className={`preview-code-container mobile-panel ${mobileTab === 'game' ? 'mobile-active' : ''}`}>
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
              <CodeEditor code={code} onChange={updateCode} />
            ) : (
              <PreviewPanel code={code} />
            )}
          </div>
        </div>
      </main>

      {/* Bottom tab bar for mobile */}
      <nav className="mobile-tab-bar">
        <button className={`mobile-tab ${mobileTab === 'chat' ? 'active' : ''}`} onClick={() => setMobileTab('chat')}>
          <span className="mobile-tab-icon">💬</span>
          <span className="mobile-tab-label">Chat</span>
        </button>
        <button className={`mobile-tab ${mobileTab === 'game' ? 'active' : ''}`} onClick={() => setMobileTab('game')}>
          <span className="mobile-tab-icon">🎮</span>
          <span className="mobile-tab-label">Game</span>
        </button>
        <button className={`mobile-tab ${mobileTab === 'projects' ? 'active' : ''}`} onClick={() => { setMobileTab('projects'); setDrawerOpen(true); }}>
          <span className="mobile-tab-icon">📁</span>
          <span className="mobile-tab-label">Projects</span>
        </button>
      </nav>
    </div>
  )
}

export default App
