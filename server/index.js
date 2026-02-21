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
import { PORT, BASE_URL, PUBLIC_DIR, DIST_DIR, DATA_DIR, USE_POSTGRES, ANTHROPIC_API_KEY, XAI_API_KEY } from './config/index.js';

// Services
import { ensureDataDirs } from './services/storage.js';
import { SessionStore } from './services/sessions.js';

// Middleware
import { requireAdmin } from './middleware/auth.js';
import { securityHeaders } from './middleware/security.js';
import { requestLogger } from './middleware/requestLogger.js';

// Routes
import createAuthRouter from './routes/auth.js';
import createProjectsRouter from './routes/projects.js';
import createGenerateRouter from './routes/generate.js';
import createBillingRouter from './routes/billing.js';
import galleryRouter from './routes/gallery.js';
import adminRouter from './routes/admin.js';
import parentRouter from './routes/parent.js';
import { initMultiplayer, getRoomInfo, getActiveRooms } from './multiplayer.js';

// ========== INIT ==========

const app = express();
const sessions = new SessionStore();
const startTime = Date.now();

// Ensure data directories exist, then load sessions
await ensureDataDirs();
await sessions.load();

console.log('📍 BASE_URL configured as:', JSON.stringify(BASE_URL));
console.log('📂 Data directory:', DATA_DIR);
console.log(`💾 Storage backend: ${USE_POSTGRES ? 'PostgreSQL' : 'JSON files'}`);

// ========== MIDDLEWARE ==========

app.use(securityHeaders());
app.use(requestLogger());
app.use(cors());

// Stripe webhooks need the raw body for signature verification —
// must be registered BEFORE the global JSON parser
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

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
app.get('/privacy', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'privacy.html')));

// ========== API ROUTES ==========

// Health check -- quick for load balancers, detailed with ?full=1
app.get('/api/health', async (_req, res) => {
  const uptime = Math.round((Date.now() - startTime) / 1000);
  const basic = {
    status: 'ok',
    uptime,
    storage: USE_POSTGRES ? 'postgres' : 'file',
    ai: !!ANTHROPIC_API_KEY,
    grok: !!XAI_API_KEY,
    timestamp: new Date().toISOString(),
  };

  // Quick check for load balancers / uptime monitors
  if (!_req.query.full) {
    return res.json(basic);
  }

  // Detailed check (include DB connectivity)
  const checks = { ...basic, checks: {} };

  // Database check
  if (USE_POSTGRES) {
    try {
      const { getPool } = await import('./services/db.js');
      const pool = getPool();
      const result = await pool.query('SELECT 1 AS ok');
      checks.checks.database = { status: 'ok', latencyMs: 0, connections: pool.totalCount };
      void result;
    } catch (err) {
      checks.checks.database = { status: 'error', error: err.message };
      checks.status = 'degraded';
    }
  } else {
    checks.checks.database = { status: 'skipped', reason: 'Using file storage' };
  }

  // Memory usage
  const mem = process.memoryUsage();
  checks.checks.memory = {
    rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
  };

  res.status(checks.status === 'ok' ? 200 : 503).json(checks);
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

// Parent/COPPA routes (public -- accessed via email links)
app.use('/api/parent', parentRouter);

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
  console.log(`   Detailed:     http://localhost:${PORT}/api/health?full=1`);
  console.log(`   Multiplayer:  ws://localhost:${PORT}/ws/multiplayer`);
  console.log(`   Mode: ${isProduction ? 'Production' : 'Development'}`);
});

// ========== GRACEFUL SHUTDOWN ==========

async function shutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);

  // Stop accepting new connections
  server.close(() => {
    console.log('   HTTP server closed.');
  });

  // Close database pool if using Postgres
  if (USE_POSTGRES) {
    try {
      const { getPool } = await import('./services/db.js');
      const pool = getPool();
      await pool.end();
      console.log('   Database pool closed.');
    } catch {
      // Pool might not be initialized
    }
  }

  // Force exit after 10 seconds if something hangs
  setTimeout(() => {
    console.error('   Forced exit after timeout.');
    process.exit(1);
  }, 10_000).unref();

  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
