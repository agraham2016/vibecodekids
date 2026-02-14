/**
 * Request Logger Middleware
 * 
 * Structured logging for HTTP requests with timing.
 * Logs method, path, status, and duration.
 * Skips noisy paths (static assets, health checks).
 */

const SKIP_PATHS = [
  '/api/health',
  '/favicon.ico',
];

const SKIP_EXTENSIONS = [
  '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf',
];

export function requestLogger() {
  return (req, res, next) => {
    // Skip static assets and health pings
    const path = req.path;
    if (SKIP_PATHS.includes(path)) return next();
    if (SKIP_EXTENSIONS.some(ext => path.endsWith(ext))) return next();

    const start = Date.now();

    // Capture response finish
    res.on('finish', () => {
      const duration = Date.now() - start;
      const status = res.statusCode;
      const method = req.method;

      // Color-code by status
      let statusIcon = '✅';
      if (status >= 500) statusIcon = '🔴';
      else if (status >= 400) statusIcon = '🟡';
      else if (status >= 300) statusIcon = '🔵';

      const userId = req.userId || '-';
      const line = `${statusIcon} ${method} ${path} → ${status} (${duration}ms) [user:${userId}]`;

      if (status >= 500) {
        console.error(line);
      } else if (status >= 400) {
        console.warn(line);
      } else {
        console.log(line);
      }
    });

    next();
  };
}
