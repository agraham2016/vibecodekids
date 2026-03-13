import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useProjects } from './hooks/useProjects';
import { useChat } from './hooks/useChat';
import Header from './components/Header';
import ProjectsPanel from './components/ProjectsPanel';
import ChatPanel from './components/ChatPanel';
import CodeEditor from './components/CodeEditor';
import PreviewPanel from './components/PreviewPanel';
import ShareModal from './components/ShareModal';
import AuthModal from './components/AuthModal';
import UpgradeModal from './components/UpgradeModal';
import VersionHistoryModal from './components/VersionHistoryModal';
import LandingPage from './components/LandingPage';
import LandingPageB from './components/LandingPageB';
import GameSurvey from './components/GameSurvey';
import StudioTutorial from './components/StudioTutorial';
import { getTutorialStatus, welcomedKey } from './components/tutorialUtils';
import TipsModal from './components/TipsModal';
import { getVariant } from './lib/abVariant';
import type { User, MembershipUsage, TierInfo, AIMode, GameConfig } from './types';
import { getStarterTemplateById } from './config/gameCatalog';
import './App.css';

function App() {
  // Auth from context (no more prop drilling)
  const { user, token, membership, tiers, isCheckingAuth, login, logout, setMembership } = useAuth();

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
  } = useProjects(!!user, user?.id ?? null, logout);

  // UI state
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isWelcomeUpgrade, setIsWelcomeUpgrade] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(false);
  const [showGameSurvey, setShowGameSurvey] = useState(false);
  const [tutorialActive, setTutorialActive] = useState(false);
  const [tutorialStartStep, setTutorialStartStep] = useState(1);
  const [showLearnModal, setShowLearnModal] = useState(false);

  // Mobile/tablet navigation
  const [mobileTab, setMobileTab] = useState<'chat' | 'game' | 'projects'>('chat');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shareThumbnail, setShareThumbnail] = useState<string | null>(null);

  // Chat with AI generation callbacks (dual-model)
  const {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    sendFeedback,
    activeModel,
    switchModel,
    openaiAvailable,
    lastModelUsed,
  } = useChat({
    onCodeGenerated: (newCode) => {
      setGeneratedCode(newCode);
      setMobileTab('game'); // Switch to game tab so user sees the preview
    },
    onUsageUpdate: setMembership,
    onUpgradeNeeded: () => setShowUpgradeModal(true),
  });

  // Fetch projects when user logs in; show welcome overlay or resume tutorial
  useEffect(() => {
    if (token && user?.id) {
      fetchUserProjects(user.id).then(() => {
        if (messages.length === 0) {
          const { status, step } = getTutorialStatus(user?.id);
          if (status === 'in_progress') {
            setTutorialStartStep(step);
            setTutorialActive(true);
          } else {
            setShowWelcomeOverlay(true);
          }
        }
      });
    }
  }, [token, user?.id, fetchUserProjects, messages.length]);

  // Login handler
  const handleLogin = useCallback(
    (
      loggedInUser: User,
      newToken: string,
      loginData?: { membership?: MembershipUsage; showUpgradePrompt?: boolean; tiers?: Record<string, TierInfo> },
    ) => {
      login({
        success: true,
        token: newToken,
        user: loggedInUser,
        membership: loginData?.membership ?? ({} as MembershipUsage),
        showUpgradePrompt: loginData?.showUpgradePrompt ?? false,
        tiers: loginData?.tiers ?? {},
      });
      setShowAuthModal(false);

      // Restore demo draft if present (from "Try It Now" landing page)
      const draftCode = localStorage.getItem('vck_draft_code');
      const draftTs = localStorage.getItem('vck_draft_ts');
      if (draftCode && draftTs && Date.now() - Number(draftTs) < 3600000) {
        setGeneratedCode(draftCode);
        localStorage.removeItem('vck_draft_code');
        localStorage.removeItem('vck_draft_prompt');
        localStorage.removeItem('vck_draft_ts');
      }

      if (loginData?.showUpgradePrompt) {
        setIsWelcomeUpgrade(true);
        setTimeout(() => setShowUpgradeModal(true), 500);
      }
    },
    [login, setGeneratedCode],
  );

  const handleLogout = useCallback(() => {
    logout();
    clearMessages();
  }, [logout, clearMessages]);

  const handleSendMessage = useCallback(
    async (content: string, image?: string, modeOverride?: AIMode, gameConfig?: GameConfig | null) => {
      await sendMessage(content, image, code, gameConfig ?? null, modeOverride);
    },
    [sendMessage, code],
  );

  // Handle using alternate code from critic/side-by-side view
  const handleUseAlternateCode = useCallback(
    (altCode: string) => {
      setGeneratedCode(altCode);
    },
    [setGeneratedCode],
  );

  const handleLoadProject = useCallback(
    async (projectId: string) => {
      const project = await loadProject(projectId);
      if (project) clearMessages();
    },
    [loadProject, clearMessages],
  );

  const handleNewProject = useCallback(() => {
    newProject();
    clearMessages();
  }, [newProject, clearMessages]);

  const handleStartOver = useCallback(() => {
    newProject();
    clearMessages();
  }, [newProject, clearMessages]);

  const handleGameSurveyComplete = useCallback(
    (config: GameConfig) => {
      const starter = getStarterTemplateById(config.starterTemplateId || config.gameType);
      const dimensionLabel = config.dimension === '3d' ? '3D' : '2D';
      const engineLabel = config.engineId === 'vibe-3d' ? 'Vibe 3D' : 'Vibe 2D';
      const starterLabel = starter?.label || config.gameType;
      const notes = config.customNotes ? ` Extra idea: ${config.customNotes}.` : '';
      const prompt = `Make me a ${dimensionLabel} ${config.theme} ${starterLabel} game with the ${engineLabel} engine style. I control a ${config.character}. The main challenge is ${config.obstacles}. Use a ${config.visualStyle} visual style.${notes}`;
      setShowGameSurvey(false);
      localStorage.setItem(welcomedKey(user?.id), '1');
      handleSendMessage(prompt, undefined, undefined, config);
      setTutorialStartStep(4);
      setTutorialActive(true);
    },
    [handleSendMessage, user?.id],
  );

  const handleWelcomeFreeChat = useCallback(() => {
    setShowWelcomeOverlay(false);
    setShowGameSurvey(false);
    localStorage.setItem(welcomedKey(user?.id), '1');
    setTutorialActive(false);
  }, [user?.id]);

  const handleStartTutorial = useCallback(() => {
    setShowWelcomeOverlay(false);
    localStorage.setItem(welcomedKey(user?.id), '1');
    setTutorialStartStep(1);
    setTutorialActive(true);
  }, [user?.id]);

  const handleTutorialComplete = useCallback(() => {
    setTutorialActive(false);
  }, []);

  const handleTutorialSkip = useCallback(() => {
    setTutorialActive(false);
  }, []);

  const handleWelcomeGuided = useCallback(() => {
    setShowWelcomeOverlay(false);
    setShowGameSurvey(true);
  }, []);

  const handleUpgradeClick = useCallback(() => {
    setIsWelcomeUpgrade(false);
    setShowUpgradeModal(true);
  }, []);

  const capturePreviewThumbnail = useCallback((): string | null => {
    try {
      const iframe = document.querySelector('.preview-iframe') as HTMLIFrameElement | null;
      if (!iframe?.contentDocument) return null;

      const canvas = iframe.contentDocument.querySelector('canvas') as HTMLCanvasElement | null;
      if (!canvas || canvas.width === 0) return null;

      const thumbW = 320;
      const thumbH = Math.round((canvas.height / canvas.width) * thumbW);
      const thumb = document.createElement('canvas');
      thumb.width = thumbW;
      thumb.height = thumbH;
      const ctx = thumb.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(canvas, 0, 0, thumbW, thumbH);
      return thumb.toDataURL('image/jpeg', 0.65);
    } catch {
      return null;
    }
  }, []);

  const handleOpenShare = useCallback(() => {
    const thumb = capturePreviewThumbnail();
    setShareThumbnail(thumb);
    setShowShareModal(true);
  }, [capturePreviewThumbnail]);

  // Loading screen
  if (isCheckingAuth) {
    return (
      <div className="app loading-screen">
        <div className="loading-content">
          <img src="/images/logo.png?v=3" alt="VibeCode Kidz" className="loading-logo" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Landing page for unauthenticated users
  if (!user) {
    const variant = getVariant();
    const LandingComponent = variant === 'b' ? LandingPageB : LandingPage;
    return (
      <div className="app">
        {showAuthModal && (
          <AuthModal onClose={() => setShowAuthModal(false)} onLogin={handleLogin} initialMode={authMode} />
        )}
        <LandingComponent
          onLoginClick={() => {
            setAuthMode('login');
            setShowAuthModal(true);
          }}
          onSignupClick={() => {
            setAuthMode('signup');
            setShowAuthModal(true);
          }}
        />
      </div>
    );
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

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onLogin={handleLogin} />}

      {showUpgradeModal && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => {
            setShowUpgradeModal(false);
            setIsWelcomeUpgrade(false);
          }}
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

      {/* Welcome overlay — shown every login */}
      {showWelcomeOverlay &&
        (() => {
          const tutStatus = getTutorialStatus(user?.id);
          const isReturning =
            userProjects.length > 0 || tutStatus.status === 'completed' || tutStatus.status === 'skipped';
          return (
            <div className="modal-overlay welcome-overlay" role="dialog" aria-modal="true" aria-label="Welcome">
              <div className="welcome-card" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="welcome-close-btn"
                  onClick={handleWelcomeFreeChat}
                  aria-label="Close welcome"
                >
                  ✕
                </button>
                <h2>🎮 {isReturning ? `Welcome back, ${user.displayName}!` : `Welcome, ${user.displayName}!`}</h2>
                <p>{isReturning ? 'What do you want to build today?' : 'Ready to make your first game?'}</p>
                <div className="welcome-actions">
                  <button className="welcome-btn guided" onClick={handleWelcomeGuided} type="button">
                    🧙 Help Me Pick!
                  </button>
                  <button className="welcome-btn tutorial" onClick={handleStartTutorial} type="button">
                    📖 {isReturning ? 'Replay Tutorial' : 'Show Me How!'}
                  </button>
                </div>
                <button className="welcome-skip-link" onClick={handleWelcomeFreeChat} type="button">
                  {isReturning ? 'Jump right in' : "Skip, I've got this"}
                </button>
              </div>
            </div>
          );
        })()}

      {/* Coach-bubble tutorial */}
      <StudioTutorial
        active={tutorialActive}
        messageCount={messages.length}
        isLoading={isLoading}
        startAtStep={tutorialStartStep}
        userId={user?.id}
        onComplete={handleTutorialComplete}
        onSkip={handleTutorialSkip}
        onSwitchMobileTab={setMobileTab}
      />

      {/* Guided game builder survey */}
      {showGameSurvey && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Game builder wizard">
          <div className="game-survey-modal">
            <button className="close-btn" onClick={handleWelcomeFreeChat} aria-label="Close wizard">
              ✕
            </button>
            <GameSurvey onComplete={handleGameSurveyComplete} />
          </div>
        </div>
      )}

      {/* Learn modal (opened from sidebar Learn button) */}
      {showLearnModal && (
        <TipsModal
          isOpen={showLearnModal}
          userId={user?.id}
          onClose={() => setShowLearnModal(false)}
          onReplayTutorial={() => {
            setShowLearnModal(false);
            setTutorialStartStep(1);
            setTutorialActive(true);
          }}
        />
      )}

      <Header
        user={user}
        membership={membership}
        onLogout={handleLogout}
        onUpgradeClick={handleUpgradeClick}
        onDrawerToggle={() => setDrawerOpen((prev) => !prev)}
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
            onLoadProject={(id) => {
              handleLoadProject(id);
              setDrawerOpen(false);
            }}
            onNewProject={() => {
              handleNewProject();
              setDrawerOpen(false);
            }}
            onSave={saveProject}
            onShare={handleOpenShare}
            onOpenVersionHistory={() => setShowVersionHistory(true)}
            onStartOver={handleStartOver}
            onDeleteProject={deleteProject}
            isSaving={isSaving}
            hasUnsavedChanges={hasUnsavedChanges}
            isLoggedIn={!!user}
            lastAutoSavedAt={lastAutoSavedAt}
            username={user?.username}
            onOpenLearn={() => setShowLearnModal(true)}
          />
        </div>

        <div className={`chat-panel-container mobile-panel ${mobileTab === 'chat' ? 'mobile-active' : ''}`}>
          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            onFeedback={sendFeedback}
            isLoading={isLoading}
            activeModel={activeModel}
            onSwitchModel={switchModel}
            openaiAvailable={openaiAvailable}
            lastModelUsed={lastModelUsed}
            onUseAlternateCode={handleUseAlternateCode}
            onReplayTutorial={() => {
              setTutorialStartStep(1);
              setTutorialActive(true);
            }}
          />
        </div>

        <div className={`preview-code-container mobile-panel ${mobileTab === 'game' ? 'mobile-active' : ''}`}>
          <div className="view-toggle-bar">
            <button className={`view-toggle-btn ${!showCode ? 'active' : ''}`} onClick={() => setShowCode(false)}>
              <span>🎮</span> Play Your Game
            </button>
            <button className={`view-toggle-btn ${showCode ? 'active' : ''}`} onClick={() => setShowCode(true)}>
              <span>🔧</span> Peek at the Code
            </button>
          </div>
          <div className="view-content">
            {showCode ? <CodeEditor code={code} onChange={updateCode} /> : <PreviewPanel code={code} />}
          </div>
        </div>
      </main>

      {/* Bottom tab bar for mobile */}
      <nav className="mobile-tab-bar" aria-label="Main navigation">
        <button
          className={`mobile-tab ${mobileTab === 'chat' ? 'active' : ''}`}
          onClick={() => setMobileTab('chat')}
          aria-current={mobileTab === 'chat' ? 'page' : undefined}
        >
          <span className="mobile-tab-icon" aria-hidden="true">
            💬
          </span>
          <span className="mobile-tab-label">Chat</span>
        </button>
        <button
          className={`mobile-tab ${mobileTab === 'game' ? 'active' : ''}`}
          onClick={() => setMobileTab('game')}
          aria-current={mobileTab === 'game' ? 'page' : undefined}
        >
          <span className="mobile-tab-icon" aria-hidden="true">
            🎮
          </span>
          <span className="mobile-tab-label">Game</span>
        </button>
        <button
          className={`mobile-tab ${mobileTab === 'projects' ? 'active' : ''}`}
          onClick={() => {
            setMobileTab('projects');
            setDrawerOpen(true);
          }}
          aria-current={mobileTab === 'projects' ? 'page' : undefined}
        >
          <span className="mobile-tab-icon" aria-hidden="true">
            📁
          </span>
          <span className="mobile-tab-label">Projects</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
