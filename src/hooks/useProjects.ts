/**
 * useProjects Hook
 *
 * Manages project list, CRUD, save, and version operations.
 * Extracts all project logic from App.tsx.
 * Includes auto-save: debounced 30s after last edit, plus save-on-blur.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { api, ApiError, getAuthToken } from '../lib/api';
import {
  applyEditorCommand,
  cloneEditorScene,
  createDefaultEditorScene,
  normalizeEditorScene,
} from '../lib/editorScene';
import type { EditorCommand, EditorScene, GameConfig, Project, UserProject } from '../types';

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
    <p>Your creation will appear here! Tell the AI what to make.</p>
  </div>
</body>
</html>`;

export { DEFAULT_HTML };

const DEFAULT_EDITOR_SCENE = createDefaultEditorScene();

function serializeEditorScene(scene: EditorScene | null | undefined) {
  return JSON.stringify(normalizeEditorScene(scene));
}

export function useProjects(isLoggedIn = false, userId: string | null = null, onSessionMismatch?: () => void) {
  const [code, setCode] = useState(DEFAULT_HTML);
  const [currentProject, setCurrentProject] = useState<Project>({
    id: 'new',
    name: 'My Awesome Project',
    code: DEFAULT_HTML,
    gameConfig: null,
    editorScene: cloneEditorScene(DEFAULT_EDITOR_SCENE),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const [userProjects, setUserProjects] = useState<UserProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<Date | null>(null);
  const lastSavedCode = useRef<string>(DEFAULT_HTML);
  const lastSavedEditorScene = useRef<string>(serializeEditorScene(DEFAULT_EDITOR_SCENE));
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAutoSaving = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);
  const [editorUndoStack, setEditorUndoStack] = useState<EditorScene[]>([]);
  const [editorRedoStack, setEditorRedoStack] = useState<EditorScene[]>([]);

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
        gameConfig: null,
        editorScene: cloneEditorScene(DEFAULT_EDITOR_SCENE),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      lastSavedCode.current = DEFAULT_HTML;
      lastSavedEditorScene.current = serializeEditorScene(DEFAULT_EDITOR_SCENE);
      setHasUnsavedChanges(false);
      setEditorUndoStack([]);
      setEditorRedoStack([]);
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
        gameConfig: null,
        editorScene: cloneEditorScene(DEFAULT_EDITOR_SCENE),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      setCode(DEFAULT_HTML);
      lastSavedCode.current = DEFAULT_HTML;
      lastSavedEditorScene.current = serializeEditorScene(DEFAULT_EDITOR_SCENE);
      setHasUnsavedChanges(false);
      setEditorUndoStack([]);
      setEditorRedoStack([]);
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
      const project = await api.get<{
        id: string;
        title: string;
        code: string;
        createdAt: string;
        gameConfig?: GameConfig | null;
        editorScene?: EditorScene | null;
      }>(`/api/projects/${projectId}`);
      const normalizedEditorScene = normalizeEditorScene(project.editorScene);
      setCode(project.code);
      setCurrentProject({
        id: project.id,
        name: project.title,
        code: project.code,
        gameConfig: project.gameConfig || null,
        editorScene: normalizedEditorScene,
        createdAt: new Date(project.createdAt),
        updatedAt: new Date(),
      });
      lastSavedCode.current = project.code;
      lastSavedEditorScene.current = serializeEditorScene(normalizedEditorScene);
      setHasUnsavedChanges(false);
      setEditorUndoStack([]);
      setEditorRedoStack([]);
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
      gameConfig: null,
      editorScene: cloneEditorScene(DEFAULT_EDITOR_SCENE),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    lastSavedCode.current = DEFAULT_HTML;
    lastSavedEditorScene.current = serializeEditorScene(DEFAULT_EDITOR_SCENE);
    setHasUnsavedChanges(false);
    setEditorUndoStack([]);
    setEditorRedoStack([]);
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
            gameConfig: currentProject.gameConfig ?? null,
            editorScene: normalizeEditorScene(currentProject.editorScene),
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
          lastSavedEditorScene.current = serializeEditorScene(currentProject.editorScene);
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
    [
      code,
      currentProject.editorScene,
      currentProject.gameConfig,
      currentProject.id,
      currentProject.name,
      isLoggedIn,
      isSaving,
      fetchUserProjects,
    ],
  );

  const setProjectGameConfig = useCallback((gameConfig: GameConfig | null) => {
    setCurrentProject((prev) => ({ ...prev, gameConfig }));
  }, []);

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

  const setProjectEditorScene = useCallback(
    (nextScene: EditorScene, options?: { trackHistory?: boolean }) => {
      const normalizedNextScene = normalizeEditorScene(nextScene);
      const nextSceneSerialized = serializeEditorScene(normalizedNextScene);
      let previousSceneSnapshot: EditorScene | null = null;

      setCurrentProject((prev) => {
        const previousScene = normalizeEditorScene(prev.editorScene);
        if (options?.trackHistory !== false && serializeEditorScene(previousScene) !== nextSceneSerialized) {
          previousSceneSnapshot = cloneEditorScene(previousScene);
        }
        return {
          ...prev,
          editorScene: normalizedNextScene,
          updatedAt: new Date(),
        };
      });

      if (previousSceneSnapshot) {
        setEditorUndoStack((current) => [...current.slice(-49), previousSceneSnapshot!]);
        setEditorRedoStack([]);
      }

      const dirty = code !== lastSavedCode.current || nextSceneSerialized !== lastSavedEditorScene.current;
      setHasUnsavedChanges(dirty);
      if (dirty) {
        scheduleAutoSave();
      }
    },
    [code, scheduleAutoSave],
  );

  const applyEditorSceneCommand = useCallback(
    (command: EditorCommand, options?: { trackHistory?: boolean }) => {
      let nextSceneSerialized = '';
      let previousSceneSnapshot: EditorScene | null = null;

      setCurrentProject((prev) => {
        const previousScene = normalizeEditorScene(prev.editorScene);
        const nextScene = applyEditorCommand(previousScene, command);
        nextSceneSerialized = serializeEditorScene(nextScene);
        if (options?.trackHistory !== false && serializeEditorScene(previousScene) !== nextSceneSerialized) {
          previousSceneSnapshot = cloneEditorScene(previousScene);
        }
        return {
          ...prev,
          editorScene: nextScene,
          updatedAt: new Date(),
        };
      });

      if (previousSceneSnapshot) {
        setEditorUndoStack((current) => [...current.slice(-49), previousSceneSnapshot!]);
        setEditorRedoStack([]);
      }

      if (nextSceneSerialized) {
        const dirty = code !== lastSavedCode.current || nextSceneSerialized !== lastSavedEditorScene.current;
        setHasUnsavedChanges(dirty);
        if (dirty) {
          scheduleAutoSave();
        }
      }
    },
    [code, scheduleAutoSave],
  );

  const undoEditorScene = useCallback(() => {
    const previousScene = editorUndoStack[editorUndoStack.length - 1];
    if (!previousScene) return;

    let currentSceneSnapshot: EditorScene | null = null;
    setCurrentProject((prev) => {
      currentSceneSnapshot = cloneEditorScene(prev.editorScene);
      return {
        ...prev,
        editorScene: cloneEditorScene(previousScene),
        updatedAt: new Date(),
      };
    });

    setEditorUndoStack((current) => current.slice(0, -1));
    if (currentSceneSnapshot) {
      setEditorRedoStack((current) => [...current.slice(-49), currentSceneSnapshot!]);
    }

    const dirty =
      code !== lastSavedCode.current || serializeEditorScene(previousScene) !== lastSavedEditorScene.current;
    setHasUnsavedChanges(dirty);
    if (dirty) {
      scheduleAutoSave();
    }
  }, [code, editorUndoStack, scheduleAutoSave]);

  const redoEditorScene = useCallback(() => {
    const nextScene = editorRedoStack[editorRedoStack.length - 1];
    if (!nextScene) return;

    let currentSceneSnapshot: EditorScene | null = null;
    setCurrentProject((prev) => {
      currentSceneSnapshot = cloneEditorScene(prev.editorScene);
      return {
        ...prev,
        editorScene: cloneEditorScene(nextScene),
        updatedAt: new Date(),
      };
    });

    setEditorRedoStack((current) => current.slice(0, -1));
    if (currentSceneSnapshot) {
      setEditorUndoStack((current) => [...current.slice(-49), currentSceneSnapshot!]);
    }

    const dirty = code !== lastSavedCode.current || serializeEditorScene(nextScene) !== lastSavedEditorScene.current;
    setHasUnsavedChanges(dirty);
    if (dirty) {
      scheduleAutoSave();
    }
  }, [code, editorRedoStack, scheduleAutoSave]);

  const updateCode = useCallback(
    (newCode: string) => {
      setCode(newCode);
      setCurrentProject((prev) => ({ ...prev, code: newCode, updatedAt: new Date() }));
      const dirty =
        newCode !== lastSavedCode.current ||
        serializeEditorScene(currentProject.editorScene) !== lastSavedEditorScene.current;
      setHasUnsavedChanges(dirty);
      if (dirty) {
        scheduleAutoSave();
      }
    },
    [currentProject.editorScene, scheduleAutoSave],
  );

  const restoreVersion = useCallback((restoredCode: string, restoredEditorScene?: EditorScene | null) => {
    const normalizedEditorScene = normalizeEditorScene(restoredEditorScene);
    setCode(restoredCode);
    setCurrentProject((prev) => ({
      ...prev,
      code: restoredCode,
      editorScene: normalizedEditorScene,
      updatedAt: new Date(),
    }));
    lastSavedCode.current = restoredCode;
    lastSavedEditorScene.current = serializeEditorScene(normalizedEditorScene);
    setHasUnsavedChanges(false);
    setEditorUndoStack([]);
    setEditorRedoStack([]);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
  }, []);

  /** Called when AI generates new code. */
  const setGeneratedCode = useCallback(
    (newCode: string) => {
      setCode(newCode);
      setCurrentProject((prev) => ({ ...prev, code: newCode, updatedAt: new Date() }));
      const dirty =
        newCode !== lastSavedCode.current ||
        serializeEditorScene(currentProject.editorScene) !== lastSavedEditorScene.current;
      setHasUnsavedChanges(dirty);
      if (dirty) {
        scheduleAutoSave();
      }
    },
    [currentProject.editorScene, scheduleAutoSave],
  );

  // Auto-save when the user switches away from the tab
  useEffect(() => {
    if (!isLoggedIn) return;

    const handleVisibilityChange = () => {
      const sceneDirty = serializeEditorScene(currentProject.editorScene) !== lastSavedEditorScene.current;
      if (document.hidden && (lastSavedCode.current !== code || sceneDirty)) {
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        saveProject({ autoSave: true });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isLoggedIn, code, currentProject.editorScene, saveProject]);

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
    setProjectGameConfig,
    setProjectEditorScene,
    applyEditorSceneCommand,
    undoEditorScene,
    redoEditorScene,
    canUndoEditorScene: editorUndoStack.length > 0,
    canRedoEditorScene: editorRedoStack.length > 0,
  };
}
