# Sprite RAG Setup Guide

Quick steps to enable tag-based sprite retrieval for the 60K sprite catalog.

## Prerequisites

- `DATABASE_URL` set (Railway Postgres or local Postgres)
- Node 18+

## Step 1: Apply Schema

Ensures the `sprites` table exists. Run once per database.

```bash
npm run db:schema
```

Uses `DATABASE_URL` from `.env`. Or pass it explicitly:

```bash
DATABASE_URL="postgres://user:pass@host:5432/db" node scripts/run-schema.js
```

## Step 2: Seed Sample Sprites

Inserts 15 sample sprites (platformer, shooter, racing, RPG) for testing RAG search.

```bash
npm run db:seed-sprites
```

Safe to run multiple times (uses `ON CONFLICT DO UPDATE`).

## Step 3: Deploy

Atlas commits, pushes, and deploys. After deploy, the app will use sprite search when the `sprites` table has rows.

## Verify

- With Postgres + seeded sprites: "dinosaur platformer" should retrieve dino sprites
- Without seeding: app falls back to the original asset manifest (no regression)

## Step 4: Bulk Ingest Kenney Assets (Optional)

If you have the Kenney Game Assets pack extracted locally:

```bash
# Dry-run first (scan only, no copy/insert)
npm run db:ingest-kenney -- --dry-run

# Ingest (requires DATABASE_URL and KENNEY_SOURCE_DIR or default Downloads path)
npm run db:ingest-kenney
```

Options:
- `KENNEY_SOURCE_DIR` - Path to extracted Kenney folder (e.g. `.../Kenney-Assets-Raw`)
- `--dry-run` - Scan and log only
- `--limit=N` - Ingest at most N sprites
- `--skip-copy` - Insert metadata only (files already in place)
