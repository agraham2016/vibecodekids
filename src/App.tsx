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
          <div className="loading-icon">🚀</div>
          <p>Loading Vibe Code Kidz...</p>
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
      />

      <main className="main-content">
        <ProjectsPanel
          userProjects={userProjects}
          isLoadingProjects={isLoadingProjects}
          currentProjectId={currentProject.id}
          projectName={currentProject.name}
          onLoadProject={handleLoadProject}
          onNewProject={handleNewProject}
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

        <div className="chat-panel-container">
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
              <CodeEditor code={code} onChange={updateCode} />
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
