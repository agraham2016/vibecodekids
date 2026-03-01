/**
 * Vibe Code Studio - Server Entry Point
 * 
 * Mounts middleware, routes, and starts the server.
 * All business logic lives in routes/, services/, and middleware/.
 */

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';
import { createServer } from 'http';

// Config
import { PORT, BASE_URL, PUBLIC_DIR, DIST_DIR, DATA_DIR, USE_POSTGRES, ANTHROPIC_API_KEY, XAI_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICES } from './config/index.js';

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
import adminAuthRouter from './routes/adminAuth.js';
import parentRouter from './routes/parent.js';
import parentDashboardRouter from './routes/parentDashboard.js';
import parentVerifyChargeRouter from './routes/parentVerifyCharge.js';
import createEsaRouter from './routes/esa.js';
import createFeedbackRouter from './routes/feedback.js';
import demoRouter from './routes/demo.js';
import demoAnalyticsRouter from './routes/demoAnalytics.js';
import reportRouter from './routes/report.js';
import { initMultiplayer, getRoomInfo, getActiveRooms, getAllowedChatPhrases } from './multiplayer.js';
import { startRetentionJob } from './services/dataRetention.js';

// ========== INIT ==========

const app = express();
const sessions = new SessionStore();
const startTime = Date.now();

// Ensure data directories exist, then load sessions
await ensureDataDirs();
await sessions.load();

console.log('📍 BASE_URL configured as:', JSON.stringify(BASE_URL));
console.log('📂 Data directory:', DATA_DIR, DATA_DIR.includes(os.tmpdir()) ? '(tmp — set DATA_DIR for persistence)' : '');
console.log(`💾 Storage backend: ${USE_POSTGRES ? 'PostgreSQL' : 'JSON files'}`);

// ========== MIDDLEWARE ==========

app.use(securityHeaders());
app.use(compression());
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

// Static assets with long cache (sprites, sounds rarely change)
app.use('/assets', express.static(path.join(PUBLIC_DIR, 'assets'), { maxAge: '7d' }));

// Serve static files from public folder (short cache for HTML)
app.use(express.static(PUBLIC_DIR, { maxAge: '5m', setHeaders: (res, filePath) => {
  if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
}}));

// In production, serve the built React app
if (isProduction) {
  app.use(express.static(DIST_DIR, { maxAge: '1d', setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  }}));
}

// Sitemap (dynamically generated)
app.get('/sitemap.xml', async (_req, res) => {
  try {
    const { listProjects } = await import('./services/storage.js');
    const projects = await listProjects();
    const publicProjects = projects.filter(p => p.isPublic);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    xml += `  <url><loc>${BASE_URL}/</loc><priority>1.0</priority></url>\n`;
    xml += `  <url><loc>${BASE_URL}/gallery</loc><priority>0.8</priority></url>\n`;
    xml += `  <url><loc>${BASE_URL}/esa</loc><priority>0.7</priority></url>\n`;
    xml += `  <url><loc>${BASE_URL}/privacy</loc><priority>0.3</priority></url>\n`;
    xml += `  <url><loc>${BASE_URL}/terms</loc><priority>0.3</priority></url>\n`;
    for (const p of publicProjects) {
      xml += `  <url><loc>${BASE_URL}/play/${p.id}</loc><lastmod>${p.updatedAt || p.createdAt}</lastmod></url>\n`;
    }
    xml += '</urlset>';

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    console.error('Sitemap error:', err);
    res.status(500).send('Could not generate sitemap');
  }
});

// Server-side meta injection for /play/:id (social sharing previews)
app.get('/play/:id', async (req, res) => {
  try {
    const { readProject } = await import('./services/storage.js');
    const project = await readProject(req.params.id);
    let html = await fs.readFile(path.join(PUBLIC_DIR, 'play.html'), 'utf-8');

    if (project) {
      const title = (project.title || 'Untitled Game').replace(/[<>"]/g, '');
      const creator = (project.displayName || project.username || 'a kid').replace(/[<>"]/g, '');
      const desc = `Play "${title}" by ${creator} on VibeCodeKidz — built with AI!`;

      html = html.replace(/<title>[^<]*<\/title>/, `<title>${title} - VibeCodeKidz</title>`);
      html = html.replace(
        /<meta property="og:title"[^>]*>/,
        `<meta property="og:title" content="${title} - VibeCodeKidz" />`
      );
      html = html.replace(
        /<meta property="og:description"[^>]*>/,
        `<meta property="og:description" content="${desc}" />`
      );
      html = html.replace(
        /<meta name="twitter:title"[^>]*>/,
        `<meta name="twitter:title" content="${title} - VibeCodeKidz" />`
      );
      html = html.replace(
        /<meta name="twitter:description"[^>]*>/,
        `<meta name="twitter:description" content="${desc}" />`
      );
    }

    res.send(html);
  } catch {
    res.sendFile(path.join(PUBLIC_DIR, 'play.html'));
  }
});

app.get('/gallery', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'gallery.html')));
app.get('/admin', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin.html')));
app.get('/privacy', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'privacy.html')));
app.get('/terms', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'terms.html')));
app.get('/esa', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'esa.html')));
app.get('/contact', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'contact.html')));
app.get('/parent-dashboard', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'parent-dashboard.html')));
app.get('/forgot-password/reset', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'forgot-password.html')));

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

  // Stripe check (key + webhook + price IDs)
  if (!STRIPE_SECRET_KEY) {
    checks.checks.stripe = { status: 'missing', error: 'STRIPE_SECRET_KEY not set' };
    checks.status = 'degraded';
  } else if (!STRIPE_WEBHOOK_SECRET) {
    checks.checks.stripe = { status: 'partial', error: 'STRIPE_WEBHOOK_SECRET not set' };
  } else if (!STRIPE_PRICES.creator || !STRIPE_PRICES.pro) {
    checks.checks.stripe = { status: 'partial', error: 'Price IDs not set' };
  } else {
    try {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(STRIPE_SECRET_KEY);
      await stripe.prices.retrieve(STRIPE_PRICES.creator);
      checks.checks.stripe = { status: 'ok', prices: 'valid' };
    } catch (err) {
      checks.checks.stripe = { status: 'error', error: err.message };
      checks.status = 'degraded';
    }
  }

  res.status(checks.status === 'ok' ? 200 : 503).json(checks);
});

// Contact form submissions
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const submission = {
      name, email, subject, message,
      timestamp: new Date().toISOString(),
      ip: req.ip,
    };
    const contactDir = path.join(DATA_DIR, 'contact');
    await fs.mkdir(contactDir, { recursive: true });
    const filename = `${Date.now()}-${email.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    await fs.writeFile(path.join(contactDir, filename), JSON.stringify(submission, null, 2));
    console.log(`📩 Contact form submission from ${name} <${email}> — ${subject}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('Contact form error:', err);
    res.status(500).json({ error: 'Failed to process submission' });
  }
});

app.use('/api/auth', createAuthRouter(sessions));
app.use('/api/projects', createProjectsRouter(sessions));
app.use('/api/generate', createGenerateRouter(sessions));
app.use('/api/feedback', createFeedbackRouter(sessions));
app.use('/api/gallery', galleryRouter);

// Billing routes (Stripe checkout at /api/stripe/*, membership at /api/membership/*)
const billingRouter = createBillingRouter(sessions);
app.use('/api/stripe', billingRouter);
app.use('/api/membership', billingRouter);

// ESA / ClassWallet routes (public checkout + admin order management)
const esaRouter = createEsaRouter(sessions);
app.use('/api/esa', esaRouter);

// Demo routes (unauthenticated — "Try It Now")
app.use('/api/demo', demoRouter);
app.use('/api/demo', demoAnalyticsRouter);

// Public report route (any visitor)
app.use('/api/report', reportRouter);

// Admin auth routes (login, 2FA) — before requireAdmin
app.use('/api/admin', adminAuthRouter);
// Admin routes (protected)
app.use('/api/admin', requireAdmin(sessions), adminRouter);

// Parent/COPPA routes (public -- accessed via email links)
app.use('/api/parent', parentRouter);
app.use('/api/parent/dashboard', parentDashboardRouter);
app.use('/api/parent/verify-charge', parentVerifyChargeRouter);

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

app.get('/api/multiplayer/phrases', (_req, res) => {
  res.json({ phrases: getAllowedChatPhrases() });
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

  startRetentionJob();
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
