/**
 * Structured Logger (Pino)
 *
 * Central logger for the server. Outputs newline-delimited JSON
 * in production and pretty-prints in development.
 *
 * Usage:
 *   import log from '../services/logger.js';
 *   log.info({ userId, action: 'login' }, 'User logged in');
 *   log.warn({ token: '***' }, 'Session UA mismatch');
 *   log.error({ err }, 'Database query failed');
 */

import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  ...(isDev
    ? {
        transport: {
          target: 'pino/file',
          options: { destination: 1 },
        },
        formatters: {
          level(label) {
            return { level: label };
          },
        },
      }
    : {
        formatters: {
          level(label) {
            return { level: label };
          },
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }),
});

export default logger;
