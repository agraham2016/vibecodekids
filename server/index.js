/**
 * Vibe Code Studio - Server Entry Point
 *
 * Mounts middleware, routes, and starts the server.
 * All business logic lives in routes/, services/, and middleware/.
 */

import * as Sentry from '@sentry/node';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { promises as fs } from 'fs';
import { createServer } from 'http';

// Config
import {
  PORT,
  BASE_URL,
  PUBLIC_DIR,
  DIST_DIR,
  DATA_DIR,
  USE_POSTGRES,
  IS_PRODUCTION,
  ANTHROPIC_API_KEY,
  AI_MODEL,
  XAI_API_KEY,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICES,
  SENTRY_DSN,
} from './config/index.js';

// Services
import { ensureDataDirs } from './services/storage.js';
import { SessionStore } from './services/sessions.js';
import log from './services/logger.js';
import { injectNonce } from './utils/injectNonce.js';

// Middleware
import { requireAdmin } from './middleware/auth.js';
import { securityHeaders } from './middleware/security.js';
import { wafMiddleware } from './middleware/waf.js';
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
import marketingAnalyticsRouter from './routes/marketingAnalytics.js';
import reportRouter from './routes/report.js';
import { initMultiplayer, getRoomInfo, getActiveRooms, getAllowedChatPhrases } from './multiplayer.js';
import { startRetentionSchedule } from './services/dataRetention.js';

// ========== INIT ==========

const app = express();
const sessions = new SessionStore();
const startTime = Date.now();

// ========== PRODUCTION SAFETY WARNINGS ==========
if (IS_PRODUCTION && !USE_POSTGRES) {
  log.warn('DATABASE_URL is not set — using file-based storage. Set DATABASE_URL for production use.');
}
if (!ANTHROPIC_API_KEY) {
  log.warn('ANTHROPIC_API_KEY is not set — Claude AI features will not work until configured.');
}

// Sentry is initialized early via server/instrument.js (--import flag).
// If running without --import, init here as fallback.
if (SENTRY_DSN && !Sentry.getClient()) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: IS_PRODUCTION ? 'production' : 'development',
    tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0,
  });
  log.info('Sentry error monitoring enabled (fallback init)');
}

// Ensure data directories exist, then load sessions
await ensureDataDirs();
await sessions.load();

// COPPA data retention — clean inactive child accounts on startup + daily
startRetentionSchedule();

log.info({ baseUrl: BASE_URL }, 'BASE_URL configured');
log.info({ dataDir: DATA_DIR, ephemeral: DATA_DIR.includes(os.tmpdir()) }, 'Data directory');
log.info({ backend: USE_POSTGRES ? 'postgres' : 'file' }, 'Storage backend');

// ========== MIDDLEWARE ==========

// Request ID — must be first so all downstream middleware/logs can reference it
app.use((_req, _res, next) => {
  _req.id = crypto.randomUUID();
  _res.setHeader('X-Request-Id', _req.id);
  next();
});

// CSP nonce — per-request, used by security headers and HTML injection
app.use((req, _res, next) => {
  req.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});

app.use(wafMiddleware());
app.use(securityHeaders());
app.use(compression());
app.use(requestLogger());
app.use(
  cors({
    origin: IS_PRODUCTION ? [BASE_URL] : [/localhost:\d+$/, /127\.0\.0\.1:\d+$/],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Key'],
    credentials: true,
  }),
);

// Stripe webhooks need the raw body for signature verification —
// must be registered BEFORE the global JSON parser
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// ========== STATIC FILES ==========

// Check if running in production (built frontend exists)
const isProduction = await fs
  .access(DIST_DIR)
  .then(() => true)
  .catch(() => false);

// Static assets with long cache (sprites, sounds rarely change)
app.use('/assets', express.static(path.join(PUBLIC_DIR, 'assets'), { maxAge: '7d' }));

// Serve static files from public folder (short cache for HTML)
app.use(
  express.static(PUBLIC_DIR, {
    maxAge: '5m',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    },
  }),
);

// In production, serve the built React app
if (isProduction) {
  app.use(
    express.static(DIST_DIR, {
      maxAge: '1d',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
      },
    }),
  );
}

// Sitemap (dynamically generated)
app.get('/sitemap.xml', async (_req, res) => {
  try {
    const { listProjects } = await import('./services/storage.js');
    const projects = await listProjects();
    const publicProjects = projects.filter((p) => p.isPublic);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    xml += `  <url><loc>${BASE_URL}/</loc><priority>1.0</priority></url>\n`;
    xml += `  <url><loc>${BASE_URL}/gallery</loc><priority>0.8</priority></url>\n`;
    xml += `  <url><loc>${BASE_URL}/esa</loc><priority>0.7</priority></url>\n`;
    xml += `  <url><loc>${BASE_URL}/privacy</loc><priority>0.3</priority></url>\n`;
    xml += `  <url><loc>${BASE_URL}/terms</loc><priority>0.3</priority></url>\n`;
    xml += `  <url><loc>${BASE_URL}/faq</loc><priority>0.5</priority></url>\n`;
    for (const p of publicProjects) {
      xml += `  <url><loc>${BASE_URL}/play/${p.id}</loc><lastmod>${p.updatedAt || p.createdAt}</lastmod></url>\n`;
    }
    xml += '</urlset>';

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    log.error({ err }, 'Sitemap error');
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
        `<meta property="og:title" content="${title} - VibeCodeKidz" />`,
      );
      html = html.replace(
        /<meta property="og:description"[^>]*>/,
        `<meta property="og:description" content="${desc}" />`,
      );
      html = html.replace(
        /<meta name="twitter:title"[^>]*>/,
        `<meta name="twitter:title" content="${title} - VibeCodeKidz" />`,
      );
      html = html.replace(
        /<meta name="twitter:description"[^>]*>/,
        `<meta name="twitter:description" content="${desc}" />`,
      );
    }

    html = injectNonce(html, req.cspNonce);
    res.send(html);
  } catch {
    try {
      let html = await fs.readFile(path.join(PUBLIC_DIR, 'play.html'), 'utf-8');
      html = injectNonce(html, req.cspNonce);
      res.send(html);
    } catch {
      res.sendFile(path.join(PUBLIC_DIR, 'play.html'));
    }
  }
});

async function serveHtmlWithNonce(req, res, filename) {
  try {
    let html = await fs.readFile(path.join(PUBLIC_DIR, filename), 'utf-8');
    html = injectNonce(html, req.cspNonce);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(html);
  } catch {
    res.sendFile(path.join(PUBLIC_DIR, filename));
  }
}

app.get('/gallery', (req, res) => serveHtmlWithNonce(req, res, 'gallery.html'));
app.get('/admin', (req, res) => serveHtmlWithNonce(req, res, 'admin.html'));
app.get('/privacy', (req, res) => serveHtmlWithNonce(req, res, 'privacy.html'));
app.get('/terms', (req, res) => serveHtmlWithNonce(req, res, 'terms.html'));
app.get('/esa', (req, res) => serveHtmlWithNonce(req, res, 'esa.html'));
app.get('/contact', (req, res) => serveHtmlWithNonce(req, res, 'contact.html'));
app.get('/faq', (req, res) => serveHtmlWithNonce(req, res, 'faq.html'));
app.get('/parent-dashboard', (req, res) => serveHtmlWithNonce(req, res, 'parent-dashboard.html'));
app.get('/parent-verify-charge', (req, res) => serveHtmlWithNonce(req, res, 'parent-verify-charge.html'));
app.get('/forgot-password/reset', (req, res) => serveHtmlWithNonce(req, res, 'forgot-password.html'));

// Dev-only: template preview for testing (serves raw template HTML)
if (!IS_PRODUCTION) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const TEMPLATES_DIR = path.join(__dirname, 'templates');
  const ALLOWED_TEMPLATES = [
    'pong',
    'catch',
    'whack-a-mole',
    'memory',
    'maze',
    'top-down-shooter',
    'fishing',
    'simon-says',
    'platformer',
    'shooter',
    'racing',
    'frogger',
    'puzzle',
    'clicker',
    'rpg',
    'endless-runner',
    'tower-defense',
    'fighting',
    'snake',
    'sports',
    'brick-breaker',
    'flappy',
    'bubble-shooter',
    'falling-blocks',
    'rhythm',
    'pet-sim',
    'parking',
  ];
  const devCsp =
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self';";
  app.get('/dev/template/:name', async (req, res) => {
    const name = (req.params.name || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!name || !ALLOWED_TEMPLATES.includes(name)) {
      return res.status(400).send('Invalid template name. Allowed: ' + ALLOWED_TEMPLATES.join(', '));
    }
    try {
      const html = await fs.readFile(path.join(TEMPLATES_DIR, `${name}.html`), 'utf-8');
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Security-Policy', devCsp);
      res.send(html);
    } catch {
      res.status(404).send('Template not found: ' + name);
    }
  });
  app.get('/dev/templates', (req, res) => {
    const links = ALLOWED_TEMPLATES.map((t) => `<a href="/dev/template/${t}">${t}</a>`).join('');
    const html = `<html><head><title>Template Test</title><style>
        body{font-family:system-ui;padding:24px;background:#1a1a2e;color:#eee;}
        h1{color:#a78bfa;margin-bottom:20px;}
        .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;max-width:800px;}
        .grid a{display:block;padding:10px 14px;background:rgba(139,92,246,0.2);border:1px solid rgba(139,92,246,0.4);border-radius:8px;color:#c4b5fd;text-decoration:none;transition:background .2s;}
        .grid a:hover{background:rgba(139,92,246,0.35);}
      </style></head><body><h1>Template Test Links</h1><div class="grid">${links}</div></body></html>`;
    res.setHeader('Content-Security-Policy', devCsp);
    res.send(html);
  });
}

// ========== API ROUTES ==========

// Health check -- quick for load balancers, detailed with ?full=1
app.get('/api/health', async (_req, res) => {
  const uptime = Math.round((Date.now() - startTime) / 1000);
  const basic = {
    status: 'ok',
    uptime,
    storage: USE_POSTGRES ? 'postgres' : 'file',
    ai: !!ANTHROPIC_API_KEY,
    aiModel: ANTHROPIC_API_KEY ? AI_MODEL : null,
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

// Contact form rate limiter (5 per hour per IP)
const contactLimits = new Map();
const CONTACT_WINDOW_MS = 60 * 60 * 1000;
const CONTACT_MAX = 5;
setInterval(
  () => {
    const now = Date.now();
    for (const [ip, entry] of contactLimits) {
      if (now > entry.resetAt) contactLimits.delete(ip);
    }
  },
  10 * 60 * 1000,
);

app.post('/api/contact', async (req, res) => {
  try {
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    let entry = contactLimits.get(clientIp);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + CONTACT_WINDOW_MS };
      contactLimits.set(clientIp, entry);
    }
    if (entry.count >= CONTACT_MAX) {
      return res.status(429).json({ error: 'Too many submissions. Please try again later.' });
    }
    entry.count++;

    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const submission = {
      name,
      email,
      subject,
      message,
      timestamp: new Date().toISOString(),
    };
    const contactDir = path.join(DATA_DIR, 'contact');
    await fs.mkdir(contactDir, { recursive: true });
    const filename = `${Date.now()}-${email.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    await fs.writeFile(path.join(contactDir, filename), JSON.stringify(submission, null, 2));
    log.info({ name, subject }, 'Contact form submission');
    res.json({ ok: true });
  } catch (err) {
    log.error({ err }, 'Contact form error');
    res.status(500).json({ error: 'Failed to process submission' });
  }
});

app.use('/api/auth', createAuthRouter(sessions));
app.use('/api/projects', createProjectsRouter(sessions));
app.use('/api/generate', express.json({ limit: '6mb' }), createGenerateRouter(sessions));
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
app.use('/api/marketing', marketingAnalyticsRouter);

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

// Parent dashboard (alternate path, email-token authenticated)
app.use('/api/parent-dashboard', parentDashboardRouter);

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
    let html = await fs.readFile(distIndex, 'utf-8');
    html = injectNonce(html, req.cspNonce);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-store'); // Prevent cache; nonce must match CSP each request
    res.send(html);
  } catch {
    next();
  }
});

// ========== ERROR HANDLING ==========

if (SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  log.error({ err, status }, 'Unhandled Express error');

  if (!SENTRY_DSN && IS_PRODUCTION) {
    log.warn('Sentry is not configured — set SENTRY_DSN to capture errors in production');
  }

  res.status(status).json({
    error: IS_PRODUCTION ? 'An internal error occurred.' : err.message || 'Internal Server Error',
  });
});

// ========== START SERVER ==========

const server = createServer(app);
initMultiplayer(server, sessions);

server.listen(PORT, () => {
  log.info(
    { port: PORT, mode: isProduction ? 'production' : 'development' },
    `Vibe Code Studio server running on port ${PORT}`,
  );
});

// ========== GRACEFUL SHUTDOWN ==========

async function shutdown(signal) {
  log.info({ signal }, 'Shutting down gracefully');

  server.close(() => {
    log.info('HTTP server closed');
  });

  if (USE_POSTGRES) {
    try {
      const { getPool } = await import('./services/db.js');
      const pool = getPool();
      await pool.end();
      log.info('Database pool closed');
    } catch {
      // Pool might not be initialized
    }
  }

  setTimeout(() => {
    log.error('Forced exit after timeout');
    process.exit(1);
  }, 10_000).unref();

  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  log.error({ err: reason }, 'Unhandled rejection');
  Sentry.captureException(reason);
});

process.on('uncaughtException', (err) => {
  log.fatal({ err }, 'Uncaught exception');
  Sentry.captureException(err);
  shutdown('uncaughtException');
});
