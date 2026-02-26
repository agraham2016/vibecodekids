/**
 * useProjects Hook
 * 
 * Manages project list, CRUD, save, and version operations.
 * Extracts all project logic from App.tsx.
 * Includes auto-save: debounced 30s after last edit, plus save-on-blur.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { api, ApiError } from '../lib/api'
import type { Project, UserProject } from '../types'

const AUTO_SAVE_DELAY_MS = 30_000 // 30 seconds after last edit

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
    .welcome-logo {
      height: 80px;
      width: auto;
      filter: drop-shadow(0 0 16px rgba(167, 139, 250, 0.5));
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
    <img src="/images/logo.png" alt="VibeCode Kids" class="welcome-logo" />
    <h1>Vibe Code Studio</h1>
    <p>Tell me what you want to create and I'll help you make it!</p>
  </div>
</body>
</html>`

export { DEFAULT_HTML }

export function useProjects(isLoggedIn = false) {
  const [code, setCode] = useState(DEFAULT_HTML)
  const [currentProject, setCurrentProject] = useState<Project>({
    id: 'new',
    name: 'My Awesome Project',
    code: DEFAULT_HTML,
    createdAt: new Date(),
    updatedAt: new Date()
  })
  const [userProjects, setUserProjects] = useState<UserProject[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<Date | null>(null)
  const lastSavedCode = useRef<string>(DEFAULT_HTML)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isAutoSaving = useRef(false)

  const fetchUserProjects = useCallback(async () => {
    setIsLoadingProjects(true)
    try {
      const projects = await api.get<UserProject[]>('/api/auth/my-projects')
      setUserProjects(projects)
    } catch {
      // Silently fail
    } finally {
      setIsLoadingProjects(false)
    }
  }, [])

  const loadProject = useCallback(async (projectId: string) => {
    try {
      const project = await api.get(`/api/projects/${projectId}`)
      setCode(project.code)
      setCurrentProject({
        id: project.id,
        name: project.title,
        code: project.code,
        createdAt: new Date(project.createdAt),
        updatedAt: new Date()
      })
      lastSavedCode.current = project.code
      setHasUnsavedChanges(false)
      return project
    } catch (error) {
      console.error('Failed to load project:', error)
      return null
    }
  }, [])

  const newProject = useCallback(() => {
    setCode(DEFAULT_HTML)
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

  const deleteProject = useCallback(async (projectId: string) => {
    if (!window.confirm('Delete this project? It will be removed from the Arcade too.')) return false

    try {
      await api.delete(`/api/projects/${projectId}`)
      fetchUserProjects()
      if (currentProject.id === projectId) {
        newProject()
      }
      return true
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not delete project. Please try again.'
      alert(msg)
      return false
    }
  }, [currentProject.id, fetchUserProjects, newProject])

  const saveProject = useCallback(async (options?: { autoSave?: boolean }) => {
    const isAuto = options?.autoSave ?? false
    if (isSaving || isAutoSaving.current) return false

    if (isAuto) {
      isAutoSaving.current = true
    } else {
      setIsSaving(true)
    }

    try {
      const data = await api.post('/api/projects/save', {
        projectId: currentProject.id,
        title: currentProject.name,
        code,
        category: 'other',
        autoSave: isAuto
      })

      if (data.success) {
        if (currentProject.id === 'new' && data.project?.id) {
          setCurrentProject(prev => ({ ...prev, id: data.project.id }))
        }
        lastSavedCode.current = code
        setHasUnsavedChanges(false)
        if (isAuto) {
          setLastAutoSavedAt(new Date())
        }
        fetchUserProjects()
        return true
      } else {
        if (!isAuto) alert(data.error || 'Could not save project')
        return false
      }
    } catch (err) {
      if (!isAuto) {
        const msg = err instanceof ApiError ? err.message : 'Could not save project. Please try again.'
        alert(msg)
      }
      return false
    } finally {
      if (isAuto) {
        isAutoSaving.current = false
      } else {
        setIsSaving(false)
      }
    }
  }, [code, currentProject.id, currentProject.name, isSaving, fetchUserProjects])

  // Helper to reset the auto-save debounce timer
  const scheduleAutoSave = useCallback(() => {
    if (!isLoggedIn) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      saveProject({ autoSave: true })
    }, AUTO_SAVE_DELAY_MS)
  }, [isLoggedIn, saveProject])

  const updateCode = useCallback((newCode: string) => {
    setCode(newCode)
    setCurrentProject(prev => ({ ...prev, code: newCode, updatedAt: new Date() }))
    if (newCode !== lastSavedCode.current) {
      setHasUnsavedChanges(true)
      scheduleAutoSave()
    }
  }, [scheduleAutoSave])

  const restoreVersion = useCallback((restoredCode: string) => {
    setCode(restoredCode)
    setCurrentProject(prev => ({ ...prev, code: restoredCode, updatedAt: new Date() }))
    lastSavedCode.current = restoredCode
    setHasUnsavedChanges(false)
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
  }, [])

  /** Called when AI generates new code. */
  const setGeneratedCode = useCallback((newCode: string) => {
    setCode(newCode)
    setCurrentProject(prev => ({ ...prev, code: newCode, updatedAt: new Date() }))
    if (newCode !== lastSavedCode.current) {
      setHasUnsavedChanges(true)
      scheduleAutoSave()
    }
  }, [scheduleAutoSave])

  // Auto-save when the user switches away from the tab
  useEffect(() => {
    if (!isLoggedIn) return

    const handleVisibilityChange = () => {
      if (document.hidden && lastSavedCode.current !== code) {
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
        saveProject({ autoSave: true })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isLoggedIn, code, saveProject])

  // Warn before closing the tab with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    }
  }, [])

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
  }
}
