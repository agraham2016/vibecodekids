/**
 * Request Logger Middleware
 *
 * Structured JSON logging for HTTP requests via Pino.
 * Logs method, path, status, duration, and userId.
 * Skips noisy paths (static assets, health checks).
 */

import log from '../services/logger.js';
import { hashIp } from '../utils/ipHash.js';

const SKIP_PATHS = ['/api/health', '/favicon.ico'];

const SKIP_EXTENSIONS = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf'];

export function requestLogger() {
  return (req, res, next) => {
    const path = req.path;
    if (SKIP_PATHS.includes(path)) return next();
    if (SKIP_EXTENSIONS.some((ext) => path.endsWith(ext))) return next();

    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const status = res.statusCode;
      const entry = {
        reqId: req.id,
        method: req.method,
        path,
        status,
        durationMs: duration,
        userId: req.userId || undefined,
        ipHash: hashIp(req.ip || req.connection?.remoteAddress),
      };

      if (status >= 500) {
        log.error(entry, `${req.method} ${path} ${status}`);
      } else if (status >= 400) {
        log.warn(entry, `${req.method} ${path} ${status}`);
      } else {
        log.info(entry, `${req.method} ${path} ${status}`);
      }
    });

    next();
  };
}
