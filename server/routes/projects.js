/**
 * Project Routes
 * 
 * CRUD operations, sharing, gallery, versions, likes.
 */

import { Router } from 'express';
import { randomBytes } from 'crypto';
import { readProject, writeProject, deleteProject as removeProject, listProjects, readUser } from '../services/storage.js';
import { filterContent } from '../middleware/contentFilter.js';
import { checkTierLimits, incrementUsage, calculateUsageRemaining } from '../middleware/rateLimit.js';

function generateProjectId() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let id = '';
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    id += chars[bytes[i] % chars.length];
  }
  return id;
}

const PROJECT_ID_REGEX = /^[a-z0-9]{6}$/;

export default function createProjectsRouter(sessions) {
  const router = Router();

  // Save/publish a project
  router.post('/', async (req, res) => {
    try {
      const { title, code, creatorName, isPublic = false, category = 'other', multiplayer = false, thumbnail } = req.body;

      if (!code || !title) {
        return res.status(400).json({ error: 'Title and code are required' });
      }

      const titleCheck = filterContent(title, { source: 'projects' });
      if (titleCheck.blocked) {
        return res.status(400).json({ error: 'Please choose a different title' });
      }

      const token = req.headers.authorization?.replace('Bearer ', '');
      let userId = null;
      let displayName = creatorName || 'Anonymous';

      if (token) {
        const session = await sessions.get(token);
        if (session) {
          userId = session.userId;
          displayName = session.displayName;

          const tierCheck = await checkTierLimits(userId, 'save_game');
          if (!tierCheck.allowed) {
            return res.status(403).json({ error: tierCheck.message, upgradeRequired: tierCheck.upgradeRequired });
          }
        }
      }

      // COPPA: Enforce parent publishing toggle for under-13
      let allowPublic = Boolean(isPublic);
      let allowMultiplayer = Boolean(multiplayer);
      if (userId) {
        try {
          const ownerUser = await readUser(userId);
          if (ownerUser.ageBracket === 'under13') {
            if (allowPublic && !ownerUser.publishingEnabled) {
              allowPublic = false;
            }
            if (allowMultiplayer && !ownerUser.multiplayerEnabled) {
              allowMultiplayer = false;
            }
          }
        } catch { /* user read failed — default to safe */ }
      }

      const id = generateProjectId();
      let validThumb = null;
      if (thumbnail && typeof thumbnail === 'string' && thumbnail.startsWith('data:image/') && thumbnail.length < 100000) {
        validThumb = thumbnail;
      }

      const project = {
        id,
        title: title.slice(0, 50),
        code,
        creatorName: displayName.slice(0, 30),
        userId,
        isPublic: allowPublic,
        multiplayer: allowMultiplayer,
        category: category || 'other',
        thumbnail: validThumb,
        createdAt: new Date().toISOString(),
        views: 0,
        likes: 0
      };

      await writeProject(id, project);

      if (userId) await incrementUsage(userId, 'save_game');

      let usage = null;
      if (userId) {
        try {
          const user = await readUser(userId);
          usage = calculateUsageRemaining(user);
        } catch { /* ignore */ }
      }

      res.json({ success: true, id, shareUrl: `/play/${id}`, usage });
    } catch (error) {
      console.error('Save project error:', error);
      res.status(500).json({ error: 'Could not save project' });
    }
  });

  // Save draft (create or update)
  router.post('/save', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'Please log in to save your project' });

      const session = await sessions.get(token);
      if (!session) return res.status(401).json({ error: 'Session expired. Please log in again.' });

      const { projectId, title, code, category = 'other', autoSave = false } = req.body;
      if (!code) return res.status(400).json({ error: 'No code to save' });

      const projectTitle = title || 'My Project';
      const now = new Date().toISOString();

      // Update existing
      if (projectId && projectId !== 'new' && PROJECT_ID_REGEX.test(projectId)) {
        try {
          const existing = await readProject(projectId);

          if (existing.userId !== session.userId) {
            return res.status(403).json({ error: 'You can only save your own projects' });
          }

          if (!existing.versions) existing.versions = [];

          if (existing.code !== code) {
            if (autoSave) {
              // For auto-saves, replace the last version entry if it was also an auto-save
              // to avoid flooding history with incremental auto-save snapshots
              const lastVersion = existing.versions[existing.versions.length - 1];
              if (lastVersion?.autoSave) {
                existing.versions[existing.versions.length - 1] = {
                  versionId: Date.now().toString(),
                  code: existing.code,
                  title: existing.title,
                  savedAt: now,
                  autoSave: true
                };
              } else {
                existing.versions.push({
                  versionId: Date.now().toString(),
                  code: existing.code,
                  title: existing.title,
                  savedAt: now,
                  autoSave: true
                });
              }
            } else {
              existing.versions.push({
                versionId: Date.now().toString(),
                code: existing.code,
                title: existing.title,
                savedAt: existing.updatedAt || existing.createdAt,
                autoSave: false
              });
            }
            if (existing.versions.length > 20) {
              existing.versions = existing.versions.slice(-20);
            }
          }

          existing.title = projectTitle;
          existing.code = code;
          existing.category = category;
          existing.updatedAt = now;

          await writeProject(projectId, existing);

          return res.json({
            success: true,
            message: 'Project saved!',
            project: { id: existing.id, title: existing.title, updatedAt: existing.updatedAt, versionsCount: existing.versions.length }
          });
        } catch (err) {
          if (err.code !== 'ENOENT') throw err;
        }
      }

      // Create new
      const id = randomBytes(3).toString('hex');
      const newProject = {
        id,
        title: projectTitle,
        code,
        category,
        creatorName: session.displayName,
        userId: session.userId,
        isPublic: false,
        isDraft: true,
        createdAt: now,
        updatedAt: now,
        views: 0,
        likes: 0,
        versions: []
      };

      await writeProject(id, newProject);

      res.json({
        success: true,
        message: 'Project created!',
        project: { id: newProject.id, title: newProject.title, createdAt: newProject.createdAt, versionsCount: 0 }
      });
    } catch (error) {
      console.error('Save project error:', error);
      res.status(500).json({ error: 'Could not save project' });
    }
  });

  // Get single project — strips internal fields for unauthenticated/public requests
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!PROJECT_ID_REGEX.test(id)) return res.status(400).json({ error: 'Invalid project ID' });

      const project = await readProject(id);
      project.views = (project.views || 0) + 1;
      await writeProject(id, project);

      const token = req.headers.authorization?.replace('Bearer ', '');
      const session = token ? await sessions.get(token) : null;
      const isOwner = session && project.userId === session.userId;

      if (!isOwner) {
        const { userId, ageMode, parentEmail, ...safeProject } = project;
        return res.json(safeProject);
      }

      res.json(project);
    } catch (error) {
      if (error.code === 'ENOENT') return res.status(404).json({ error: 'Project not found' });
      console.error('Get project error:', error);
      res.status(500).json({ error: 'Could not load project' });
    }
  });

  // Delete own project
  router.delete('/:id', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'Please log in to delete projects' });

      const session = await sessions.get(token);
      if (!session) return res.status(401).json({ error: 'Session expired. Please log in again.' });

      const { id } = req.params;
      if (!PROJECT_ID_REGEX.test(id)) return res.status(400).json({ error: 'Invalid project ID' });

      const project = await readProject(id);
      if (project.userId !== session.userId) {
        return res.status(403).json({ error: 'You can only delete your own projects' });
      }

      await removeProject(id);
      res.json({ success: true, message: 'Project deleted' });
    } catch (error) {
      if (error.code === 'ENOENT') return res.status(404).json({ error: 'Project not found' });
      console.error('Delete project error:', error);
      res.status(500).json({ error: 'Could not delete project' });
    }
  });

  // Like a project
  router.post('/:id/like', async (req, res) => {
    try {
      const { id } = req.params;
      if (!PROJECT_ID_REGEX.test(id)) return res.status(400).json({ error: 'Invalid project ID' });

      const project = await readProject(id);
      project.likes = Math.max(0, (project.likes || 0) + 1);
      await writeProject(id, project);

      res.json({ likes: project.likes });
    } catch (error) {
      if (error.code === 'ENOENT') return res.status(404).json({ error: 'Project not found' });
      res.status(500).json({ error: 'Could not like project' });
    }
  });

  // Unlike a project (toggle - removes one like)
  router.delete('/:id/like', async (req, res) => {
    try {
      const { id } = req.params;
      if (!PROJECT_ID_REGEX.test(id)) return res.status(400).json({ error: 'Invalid project ID' });

      const project = await readProject(id);
      project.likes = Math.max(0, (project.likes || 0) - 1);
      await writeProject(id, project);

      res.json({ likes: project.likes });
    } catch (error) {
      if (error.code === 'ENOENT') return res.status(404).json({ error: 'Project not found' });
      res.status(500).json({ error: 'Could not unlike project' });
    }
  });

  // Version history
  router.get('/:id/versions', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const { id } = req.params;
      if (!PROJECT_ID_REGEX.test(id)) return res.status(400).json({ error: 'Invalid project ID' });

      const project = await readProject(id);

      if (token) {
        const session = await sessions.get(token);
        if (!session || project.userId !== session.userId) {
          return res.status(403).json({ error: 'You can only view versions of your own projects' });
        }
      } else {
        return res.status(401).json({ error: 'Please log in to view version history' });
      }

      const versions = (project.versions || []).map((v, index) => ({
        versionId: v.versionId,
        title: v.title,
        savedAt: v.savedAt,
        versionNumber: index + 1
      }));

      versions.push({
        versionId: 'current',
        title: project.title + ' (Current)',
        savedAt: project.updatedAt || project.createdAt,
        versionNumber: versions.length + 1,
        isCurrent: true
      });

      res.json({ projectId: project.id, projectTitle: project.title, versions: versions.reverse() });
    } catch (error) {
      if (error.code === 'ENOENT') return res.status(404).json({ error: 'Project not found' });
      console.error('Get versions error:', error);
      res.status(500).json({ error: 'Could not load version history' });
    }
  });

  // Load specific version
  router.get('/:id/versions/:versionId', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const { id, versionId } = req.params;
      if (!PROJECT_ID_REGEX.test(id)) return res.status(400).json({ error: 'Invalid project ID' });

      const project = await readProject(id);

      if (token) {
        const session = await sessions.get(token);
        if (!session || project.userId !== session.userId) {
          return res.status(403).json({ error: 'You can only access versions of your own projects' });
        }
      } else {
        return res.status(401).json({ error: 'Please log in to access version history' });
      }

      if (versionId === 'current') {
        return res.json({ versionId: 'current', title: project.title, code: project.code, savedAt: project.updatedAt || project.createdAt, isCurrent: true });
      }

      const version = (project.versions || []).find(v => v.versionId === versionId);
      if (!version) return res.status(404).json({ error: 'Version not found' });

      res.json({ versionId: version.versionId, title: version.title, code: version.code, savedAt: version.savedAt });
    } catch (error) {
      if (error.code === 'ENOENT') return res.status(404).json({ error: 'Project not found' });
      console.error('Get version error:', error);
      res.status(500).json({ error: 'Could not load version' });
    }
  });

  // Restore version
  router.post('/:id/versions/:versionId/restore', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const { id, versionId } = req.params;

      if (!token) return res.status(401).json({ error: 'Please log in to restore versions' });
      const session = await sessions.get(token);
      if (!session) return res.status(401).json({ error: 'Session expired' });
      if (!PROJECT_ID_REGEX.test(id)) return res.status(400).json({ error: 'Invalid project ID' });

      const project = await readProject(id);
      if (project.userId !== session.userId) {
        return res.status(403).json({ error: 'You can only restore your own projects' });
      }

      if (versionId === 'current') {
        return res.json({ success: true, message: 'Already on current version' });
      }

      const version = (project.versions || []).find(v => v.versionId === versionId);
      if (!version) return res.status(404).json({ error: 'Version not found' });

      if (!project.versions) project.versions = [];
      project.versions.push({
        versionId: Date.now().toString(),
        code: project.code,
        title: project.title,
        savedAt: project.updatedAt || project.createdAt,
        autoSave: false
      });
      if (project.versions.length > 20) project.versions = project.versions.slice(-20);

      project.code = version.code;
      project.updatedAt = new Date().toISOString();

      await writeProject(id, project);

      res.json({ success: true, message: 'Version restored!', code: project.code });
    } catch (error) {
      if (error.code === 'ENOENT') return res.status(404).json({ error: 'Project not found' });
      console.error('Restore version error:', error);
      res.status(500).json({ error: 'Could not restore version' });
    }
  });

  return router;
}
