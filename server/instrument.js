/**
 * Sentry Instrumentation — must be loaded before all other modules.
 *
 * Use: node --import=./server/instrument.js server/index.js
 *
 * This ensures Sentry hooks into require/import to auto-instrument
 * Express, pg, http, and other libraries before they're loaded.
 */

import * as Sentry from '@sentry/node';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const dsn = process.env.SENTRY_DSN || null;
const isProduction = process.env.NODE_ENV === 'production';

if (dsn) {
  Sentry.init({
    dsn,
    release: `vibecodekidz@${version}`,
    environment: isProduction ? 'production' : 'development',
    tracesSampleRate: isProduction ? 0.1 : 1.0,
    profilesSampleRate: isProduction ? 0.25 : 0,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      return event;
    },
  });
  console.log(`📡 Sentry enabled (release: vibecodekidz@${version})`);
}
