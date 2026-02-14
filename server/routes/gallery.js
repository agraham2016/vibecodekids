/**
 * Gallery Route
 * 
 * GET /api/gallery - Public game gallery listing.
 */

import { Router } from 'express';
import { listProjects } from '../services/storage.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { category, limit = 50 } = req.query;

    const allProjects = await listProjects();
    const publicProjects = allProjects
      .filter(p => p.isPublic)
      .filter(p => !category || p.category === category)
      .map(p => ({
        id: p.id,
        title: p.title,
        creatorName: p.creatorName,
        ageMode: p.ageMode,
        category: p.category,
        multiplayer: p.multiplayer || false,
        createdAt: p.createdAt,
        views: p.views || 0,
        likes: p.likes || 0
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, parseInt(limit));

    res.json(publicProjects);
  } catch (error) {
    console.error('Gallery error:', error);
    res.status(500).json({ error: 'Could not load gallery' });
  }
});

export default router;
