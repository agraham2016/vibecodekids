-- VibeCodeKidz Database Schema
-- Run this once against your Postgres database to set up all tables.
-- Compatible with: Neon, Supabase, Railway Postgres, or any standard Postgres 14+.

-- ========== USERS ==========

CREATE TABLE IF NOT EXISTS users (
    id                      TEXT PRIMARY KEY,
    username                TEXT UNIQUE NOT NULL,
    display_name            TEXT NOT NULL,
    password_hash           TEXT NOT NULL,
    status                  TEXT NOT NULL DEFAULT 'pending',
    is_admin                BOOLEAN NOT NULL DEFAULT false,
    membership_tier         TEXT NOT NULL DEFAULT 'free',
    membership_expires      TIMESTAMPTZ,
    stripe_customer_id      TEXT,
    stripe_subscription_id  TEXT,
    games_created_month     INT NOT NULL DEFAULT 0,
    ai_covers_used_month    INT NOT NULL DEFAULT 0,
    ai_sprites_used_month   INT NOT NULL DEFAULT 0,
    monthly_reset_date      TIMESTAMPTZ,
    prompts_today           INT NOT NULL DEFAULT 0,
    plays_today             INT NOT NULL DEFAULT 0,
    daily_reset_date        TIMESTAMPTZ,
    rate_limited_until      TIMESTAMPTZ,
    has_seen_upgrade_prompt BOOLEAN NOT NULL DEFAULT false,
    project_count           INT NOT NULL DEFAULT 0,
    -- COPPA fields
    age_bracket             TEXT NOT NULL DEFAULT 'unknown',  -- 'under13', '13to17', '18plus', 'unknown'
    parent_email            TEXT,
    parental_consent_status TEXT NOT NULL DEFAULT 'not_required', -- 'not_required', 'pending', 'granted', 'denied', 'revoked'
    parental_consent_at     TIMESTAMPTZ,
    data_deletion_requested BOOLEAN NOT NULL DEFAULT false,
    data_deletion_at        TIMESTAMPTZ,
    privacy_accepted_at     TIMESTAMPTZ,
    approved_at             TIMESTAMPTZ,
    denied_at               TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at           TIMESTAMPTZ
);

-- ========== SESSIONS ==========

CREATE TABLE IF NOT EXISTS sessions (
    token       TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username    TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at  BIGINT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ========== PROJECTS ==========

CREATE TABLE IF NOT EXISTS projects (
    id              TEXT PRIMARY KEY,
    user_id         TEXT REFERENCES users(id) ON DELETE SET NULL,
    title           TEXT NOT NULL,
    code            TEXT NOT NULL,
    creator_name    TEXT NOT NULL DEFAULT 'Anonymous',
    category        TEXT NOT NULL DEFAULT 'other',
    is_public       BOOLEAN NOT NULL DEFAULT false,
    is_draft        BOOLEAN NOT NULL DEFAULT false,
    multiplayer     BOOLEAN NOT NULL DEFAULT false,
    views           INT NOT NULL DEFAULT 0,
    likes           INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_public ON projects(is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category) WHERE is_public = true;

-- ========== PROJECT VERSIONS ==========

CREATE TABLE IF NOT EXISTS project_versions (
    id              SERIAL PRIMARY KEY,
    project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_id      TEXT NOT NULL,
    code            TEXT NOT NULL,
    title           TEXT,
    auto_save       BOOLEAN NOT NULL DEFAULT false,
    saved_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_versions_project ON project_versions(project_id, saved_at DESC);

-- ========== RATE LIMITING ==========
-- Stores recent request timestamps for per-user rate limiting.

CREATE TABLE IF NOT EXISTS rate_limit_requests (
    id          SERIAL PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_user_time ON rate_limit_requests(user_id, requested_at DESC);

-- ========== PARENTAL CONSENT TOKENS ==========

CREATE TABLE IF NOT EXISTS parental_consents (
    id              SERIAL PRIMARY KEY,
    token           TEXT UNIQUE NOT NULL,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_email    TEXT NOT NULL,
    action          TEXT NOT NULL DEFAULT 'consent',  -- 'consent', 'data_access', 'data_delete'
    status          TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'granted', 'denied', 'expired'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    responded_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_consent_token ON parental_consents(token);
CREATE INDEX IF NOT EXISTS idx_consent_user ON parental_consents(user_id);

-- ========== CLEANUP ==========
-- Automatic cleanup of expired sessions and old rate limit entries.
-- Run these periodically via a cron job or scheduled task.

-- Delete expired sessions:
-- DELETE FROM sessions WHERE expires_at < NOW();

-- Delete rate limit entries older than 1 hour:
-- DELETE FROM rate_limit_requests WHERE requested_at < NOW() - INTERVAL '1 hour';
