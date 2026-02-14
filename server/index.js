/**
 * Vibe Code Studio - Server Entry Point
 * 
 * Mounts middleware, routes, and starts the server.
 * All business logic lives in routes/, services/, and middleware/.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { promises as fs } from 'fs';
import { createServer } from 'http';

// Config
import { PORT, BASE_URL, PUBLIC_DIR, DIST_DIR, DATA_DIR } from './config/index.js';

// Services
import { ensureDataDirs } from './services/storage.js';
import { SessionStore } from './services/sessions.js';

// Middleware
import { requireAdmin } from './middleware/auth.js';

// Routes
import createAuthRouter from './routes/auth.js';
import createProjectsRouter from './routes/projects.js';
import createGenerateRouter from './routes/generate.js';
import createBillingRouter from './routes/billing.js';
import galleryRouter from './routes/gallery.js';
import adminRouter from './routes/admin.js';
import { initMultiplayer, getRoomInfo, getActiveRooms } from './multiplayer.js';

// ========== INIT ==========

const app = express();
const sessions = new SessionStore();

// Ensure data directories exist, then load sessions
await ensureDataDirs();
await sessions.load();

console.log('📍 BASE_URL configured as:', JSON.stringify(BASE_URL));
console.log('📂 Data directory:', DATA_DIR);

// ========== MIDDLEWARE ==========

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ========== STATIC FILES ==========

// Check if running in production (built frontend exists)
const isProduction = await fs.access(DIST_DIR).then(() => true).catch(() => false);

// Serve static files from public folder
app.use(express.static(PUBLIC_DIR));

// In production, serve the built React app
if (isProduction) {
  app.use(express.static(DIST_DIR));
}

// Serve play/gallery/admin pages
app.get('/play/:id', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'play.html')));
app.get('/gallery', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'gallery.html')));
app.get('/admin', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin.html')));

// ========== API ROUTES ==========

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Vibe Code Studio server is running! 🚀' });
});

app.use('/api/auth', createAuthRouter(sessions));
app.use('/api/projects', createProjectsRouter(sessions));
app.use('/api/generate', createGenerateRouter(sessions));
app.use('/api/gallery', galleryRouter);

// Billing routes (Stripe checkout at /api/stripe/*, membership at /api/membership/*)
const billingRouter = createBillingRouter(sessions);
app.use('/api/stripe', billingRouter);
app.use('/api/membership', billingRouter);

// Admin routes (protected)
app.use('/api/admin', requireAdmin(sessions), adminRouter);

// Multiplayer REST endpoints
app.get('/api/rooms/:code', (req, res) => {
  const room = getRoomInfo(req.params.code);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room);
});

app.get('/api/projects/:id/rooms', (req, res) => {
  res.json(getActiveRooms(req.params.id));
});

app.get('/api/rooms', (req, res) => {
  res.json(getActiveRooms(req.query.projectId));
});

// ========== SPA CATCH-ALL ==========

app.get('*', async (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();

  const distIndex = path.join(DIST_DIR, 'index.html');
  try {
    await fs.access(distIndex);
    res.sendFile(distIndex);
  } catch {
    next();
  }
});

// ========== START SERVER ==========

const server = createServer(app);
initMultiplayer(server);

server.listen(PORT, () => {
  console.log(`🚀 Vibe Code Studio server running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
  console.log(`   Multiplayer WebSocket: ws://localhost:${PORT}/ws/multiplayer`);
  console.log(`   Mode: ${isProduction ? 'Production' : 'Development'}`);
});
