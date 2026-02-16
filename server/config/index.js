/**
 * Application Configuration
 * 
 * Centralizes all environment variables, constants, and tier definitions.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========== SERVER ==========

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';
export const PORT = process.env.PORT || 3001;
export const BASE_URL = (process.env.BASE_URL || 'https://vibecodekidz.org').trim().replace(/\/+$/, '');

// ========== PATHS ==========

export const SERVER_DIR = path.join(__dirname, '..');
export const ROOT_DIR = path.join(SERVER_DIR, '..');
export const DATA_DIR = process.env.DATA_DIR || path.join(ROOT_DIR, 'data');
export const PROJECTS_DIR = path.join(DATA_DIR, 'projects');
export const USERS_DIR = path.join(DATA_DIR, 'users');
export const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
export const DIST_DIR = path.join(ROOT_DIR, 'dist');
export const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

// ========== DATABASE ==========
// Set DATABASE_URL to enable Postgres. Without it, falls back to JSON file storage.

export const DATABASE_URL = process.env.DATABASE_URL || null;
export const USE_POSTGRES = !!DATABASE_URL;

// ========== COPPA ==========

export const COPPA_AGE_THRESHOLD = 13;
export const CONSENT_TOKEN_EXPIRY_MS = 72 * 60 * 60 * 1000; // 72 hours for parent to respond
export const DATA_RETENTION_DAYS = 365; // Max days to retain inactive child data
export const SITE_NAME = 'VibeCodeKidz';
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@vibecodekidz.org';

// ========== AUTH ==========

export const BCRYPT_ROUNDS = 10;
export const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
export const ADMIN_SECRET = process.env.ADMIN_SECRET || null;

// ========== AI ==========

export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
export const AI_MODEL = process.env.AI_MODEL || 'claude-sonnet-4-20250514';
export const AI_BASE_TOKENS = 16384;
export const AI_MAX_TOKENS = 32768;
export const AI_RETRY_COUNT = 2;
export const AI_RETRY_DELAY_MS = 1000;

// ========== GROK (xAI) ==========

export const XAI_API_KEY = process.env.XAI_API_KEY;
export const GROK_MODEL = process.env.GROK_MODEL || 'grok-3-fast';
export const GROK_BASE_URL = 'https://api.x.ai/v1';

// ========== DUAL-MODEL SETTINGS ==========

export const SESSION_TOKEN_CAP = parseInt(process.env.SESSION_TOKEN_CAP || '200000', 10);
export const DEBUG_MAX_CLAUDE_ATTEMPTS = 2;   // How many Claude tries before auto-routing to Grok for debugging
export const RESPONSE_CACHE_TTL = 60 * 60 * 1000; // 1 hour TTL for response cache
export const RESPONSE_CACHE_MAX_SIZE = 500;         // Max entries in response cache

// ========== REFERENCE CODE SYSTEM ==========

export const GITHUB_TOKEN = process.env.GITHUB_TOKEN || null; // Optional — raises rate limit from 60 to 5000 req/hr
export const REFERENCE_MAX_CHARS = parseInt(process.env.REFERENCE_MAX_CHARS || '30000', 10);
export const GITHUB_CACHE_TTL = 24 * 60 * 60 * 1000;  // 24 hours
export const GITHUB_MAX_FILE_SIZE = 100000;              // Skip files larger than 100KB
export const GITHUB_MAX_FETCHES_PER_SESSION = 3;

// ========== STRIPE ==========

export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
export const STRIPE_PRICES = {
  creator: process.env.STRIPE_CREATOR_PRICE_ID || 'price_1Swp0yFORYWq7U9VvV0bCabA',
  pro: process.env.STRIPE_PRO_PRICE_ID || 'price_1Swp2cFORYWq7U9VF15M6NY8'
};

// ========== MEMBERSHIP TIERS ==========

export const MEMBERSHIP_TIERS = {
  free: {
    name: "Free",
    price: 0,
    gamesPerMonth: 3,
    promptsPerDay: 30,
    playsPerDay: 50,
    aiCoversPerMonth: 0,
    aiSpritesPerMonth: 0,
    canAccessPremiumAssets: false
  },
  creator: {
    name: "Creator",
    price: 7,
    gamesPerMonth: 25,
    promptsPerDay: 150,
    playsPerDay: Infinity,
    aiCoversPerMonth: 5,
    aiSpritesPerMonth: 0,
    canAccessPremiumAssets: true,
    stripePriceId: STRIPE_PRICES.creator
  },
  pro: {
    name: "Pro",
    price: 14,
    gamesPerMonth: 50,
    promptsPerDay: 300,
    playsPerDay: Infinity,
    aiCoversPerMonth: 20,
    aiSpritesPerMonth: 10,
    canAccessPremiumAssets: true,
    stripePriceId: STRIPE_PRICES.pro
  }
};

// ========== RATE LIMITS ==========

export const RATE_LIMITS = {
  promptsPerMinute: 5,
  promptsPerHour: 30,
  cooldownMinutes: 5
};
