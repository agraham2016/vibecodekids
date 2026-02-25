import { useState, useCallback, useEffect } from 'react'
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
  const [shareThumbnail, setShareThumbnail] = useState<string | null>(null)

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

  const capturePreviewThumbnail = useCallback((): string | null => {
    try {
      const iframe = document.querySelector('.preview-iframe') as HTMLIFrameElement | null
      if (!iframe?.contentDocument) return null

      const canvas = iframe.contentDocument.querySelector('canvas') as HTMLCanvasElement | null
      if (!canvas || canvas.width === 0) return null

      const thumbW = 320
      const thumbH = Math.round((canvas.height / canvas.width) * thumbW)
      const thumb = document.createElement('canvas')
      thumb.width = thumbW
      thumb.height = thumbH
      const ctx = thumb.getContext('2d')
      if (!ctx) return null
      ctx.drawImage(canvas, 0, 0, thumbW, thumbH)
      return thumb.toDataURL('image/jpeg', 0.65)
    } catch {
      return null
    }
  }, [])

  const handleOpenShare = useCallback(() => {
    const thumb = capturePreviewThumbnail()
    setShareThumbnail(thumb)
    setShowShareModal(true)
  }, [capturePreviewThumbnail])

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
          thumbnail={shareThumbnail}
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
            onShare={handleOpenShare}
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
