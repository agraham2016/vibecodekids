/**
 * useProjects Hook
 *
 * Manages project list, CRUD, save, and version operations.
 * Extracts all project logic from App.tsx.
 * Includes auto-save: debounced 30s after last edit, plus save-on-blur.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { api, ApiError, getAuthToken } from '../lib/api';
import type { Project, UserProject } from '../types';

const AUTO_SAVE_DELAY_MS = 30_000; // 30 seconds after last edit

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Nunito', -apple-system, sans-serif;
      background: #1a1a2e;
      background-image: linear-gradient(135deg, #1a1a2e 0%, #2d1b69 50%, #1a1a2e 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .welcome {
      text-align: center;
      color: #e0e7ff;
      padding: 40px;
    }
    h1 {
      font-size: 2.5rem;
      margin-bottom: 16px;
      color: #e0e7ff;
    }
    p {
      font-size: 1.25rem;
      opacity: 0.9;
      color: rgba(224, 231, 255, 0.9);
    }
    .welcome-logo {
      height: 80px;
      width: auto;
      filter: drop-shadow(0 0 16px rgba(139, 92, 246, 0.5));
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="welcome">
    <img src="/images/logo.png?v=3" alt="VibeCode Kidz" class="welcome-logo" />
    <h1>Vibe Code Studio</h1>
    <p>Your game will appear here! Tell the AI what to make.</p>
  </div>
</body>
</html>`;

export { DEFAULT_HTML };

export function useProjects(isLoggedIn = false, userId: string | null = null, onSessionMismatch?: () => void) {
  const [code, setCode] = useState(DEFAULT_HTML);
  const [currentProject, setCurrentProject] = useState<Project>({
    id: 'new',
    name: 'My Awesome Project',
    code: DEFAULT_HTML,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const [userProjects, setUserProjects] = useState<UserProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<Date | null>(null);
  const lastSavedCode = useRef<string>(DEFAULT_HTML);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAutoSaving = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  // Clear projects, editor, and pending auto-save when user logs out or switches accounts
  useEffect(() => {
    if (!isLoggedIn || !userId) {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = null;
      }
      setUserProjects([]);
      setCode(DEFAULT_HTML);
      setCurrentProject({
        id: 'new',
        name: 'My Awesome Project',
        code: DEFAULT_HTML,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      lastSavedCode.current = DEFAULT_HTML;
      setHasUnsavedChanges(false);
      lastUserIdRef.current = null;
    } else if (userId !== lastUserIdRef.current) {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = null;
      }
      setUserProjects([]);
      setCurrentProject({
        id: 'new',
        name: 'My Awesome Project',
        code: DEFAULT_HTML,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      setCode(DEFAULT_HTML);
      lastSavedCode.current = DEFAULT_HTML;
      setHasUnsavedChanges(false);
      lastUserIdRef.current = userId;
    }
  }, [isLoggedIn, userId]);

  const fetchUserProjects = useCallback(
    async (expectedUserId?: string | null): Promise<UserProject[]> => {
      const tokenAtCall = getAuthToken();
      setIsLoadingProjects(true);
      setUserProjects([]); // Clear immediately to avoid showing previous user's projects
      try {
        const headers: Record<string, string> = {};
        if (expectedUserId) headers['X-Expected-User'] = expectedUserId;
        const projects = await api.get<UserProject[]>(
          `/api/auth/my-projects?t=${Date.now()}`,
          Object.keys(headers).length ? headers : undefined,
        );
        // Ignore stale response if user logged in as someone else while fetch was in flight
        if (getAuthToken() !== tokenAtCall) {
          return [];
        }
        setUserProjects(projects);
        return projects;
      } catch (err) {
        setUserProjects([]);
        // Session mismatch or expired — force re-login so user gets fresh token
        if (err instanceof ApiError && err.status === 401 && onSessionMismatch) {
          onSessionMismatch();
        }
        return [];
      } finally {
        setIsLoadingProjects(false);
      }
    },
    [onSessionMismatch],
  );

  const loadProject = useCallback(async (projectId: string) => {
    try {
      const project = await api.get<{ id: string; title: string; code: string; createdAt: string }>(
        `/api/projects/${projectId}`,
      );
      setCode(project.code);
      setCurrentProject({
        id: project.id,
        name: project.title,
        code: project.code,
        createdAt: new Date(project.createdAt),
        updatedAt: new Date(),
      });
      lastSavedCode.current = project.code;
      setHasUnsavedChanges(false);
      return project;
    } catch (error) {
      console.error('Failed to load project:', error);
      return null;
    }
  }, []);

  const newProject = useCallback(() => {
    setCode(DEFAULT_HTML);
    setCurrentProject({
      id: 'new',
      name: 'My Awesome Project',
      code: DEFAULT_HTML,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    lastSavedCode.current = DEFAULT_HTML;
    setHasUnsavedChanges(false);
  }, []);

  const deleteProject = useCallback(
    async (projectId: string) => {
      if (!window.confirm('Delete this project? It will be removed from the Arcade too.')) return false;

      try {
        await api.delete(`/api/projects/${projectId}`);
        fetchUserProjects(userId ?? undefined);
        if (currentProject.id === projectId) {
          newProject();
        }
        return true;
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Could not delete project. Please try again.';
        alert(msg);
        return false;
      }
    },
    [currentProject.id, fetchUserProjects, newProject, userId],
  );

  const saveProject = useCallback(
    async (options?: { autoSave?: boolean }) => {
      const isAuto = options?.autoSave ?? false;
      if (isSaving || isAutoSaving.current) return false;

      // Block auto-save if user changed since it was scheduled
      if (isAuto && (!isLoggedIn || !getAuthToken())) return false;

      if (isAuto) {
        isAutoSaving.current = true;
      } else {
        setIsSaving(true);
      }

      try {
        const data = await api.post<{ success: boolean; project?: { id: string }; error?: string }>(
          '/api/projects/save',
          {
            projectId: currentProject.id,
            title: currentProject.name,
            code,
            category: 'other',
            autoSave: isAuto,
          },
        );

        if (data.success) {
          if (currentProject.id === 'new' && data.project?.id) {
            const newId = data.project.id;
            setCurrentProject((prev) => ({ ...prev, id: newId }));
          }
          lastSavedCode.current = code;
          setHasUnsavedChanges(false);
          if (isAuto) {
            setLastAutoSavedAt(new Date());
          }
          fetchUserProjects();
          return true;
        } else {
          if (!isAuto) alert(data.error || 'Could not save project');
          return false;
        }
      } catch (err) {
        if (!isAuto) {
          const msg = err instanceof ApiError ? err.message : 'Could not save project. Please try again.';
          alert(msg);
        }
        return false;
      } finally {
        if (isAuto) {
          isAutoSaving.current = false;
        } else {
          setIsSaving(false);
        }
      }
    },
    [code, currentProject.id, currentProject.name, isSaving, fetchUserProjects, userId],
  );

  // Helper to reset the auto-save debounce timer.
  // Captures userId at schedule time so a stale timer can't save under a different account.
  const scheduleAutoSave = useCallback(() => {
    if (!isLoggedIn || !userId) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    const scheduledForUser = userId;
    autoSaveTimer.current = setTimeout(() => {
      if (lastUserIdRef.current !== scheduledForUser) return;
      saveProject({ autoSave: true });
    }, AUTO_SAVE_DELAY_MS);
  }, [isLoggedIn, userId, saveProject]);

  const updateCode = useCallback(
    (newCode: string) => {
      setCode(newCode);
      setCurrentProject((prev) => ({ ...prev, code: newCode, updatedAt: new Date() }));
      if (newCode !== lastSavedCode.current) {
        setHasUnsavedChanges(true);
        scheduleAutoSave();
      }
    },
    [scheduleAutoSave],
  );

  const restoreVersion = useCallback((restoredCode: string) => {
    setCode(restoredCode);
    setCurrentProject((prev) => ({ ...prev, code: restoredCode, updatedAt: new Date() }));
    lastSavedCode.current = restoredCode;
    setHasUnsavedChanges(false);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
  }, []);

  /** Called when AI generates new code. */
  const setGeneratedCode = useCallback(
    (newCode: string) => {
      setCode(newCode);
      setCurrentProject((prev) => ({ ...prev, code: newCode, updatedAt: new Date() }));
      if (newCode !== lastSavedCode.current) {
        setHasUnsavedChanges(true);
        scheduleAutoSave();
      }
    },
    [scheduleAutoSave],
  );

  // Auto-save when the user switches away from the tab
  useEffect(() => {
    if (!isLoggedIn) return;

    const handleVisibilityChange = () => {
      if (document.hidden && lastSavedCode.current !== code) {
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        saveProject({ autoSave: true });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isLoggedIn, code, saveProject]);

  // Warn before closing the tab with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  return {
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
  };
}
