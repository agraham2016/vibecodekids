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
    const { category, limit = 30, offset = 0 } = req.query;
    const lim = Math.min(parseInt(limit) || 30, 100);
    const off = parseInt(offset) || 0;

    const allProjects = await listProjects();
    const filtered = allProjects
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
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const paged = filtered.slice(off, off + lim);
    res.json({ games: paged, total: filtered.length, hasMore: off + lim < filtered.length });
  } catch (error) {
    console.error('Gallery error:', error);
    res.status(500).json({ error: 'Could not load gallery' });
  }
});

export default router;
