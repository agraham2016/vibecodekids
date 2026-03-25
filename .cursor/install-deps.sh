#!/usr/bin/env bash

set -euo pipefail

echo "[cursor-install] Ensuring npm dependencies are present"

if ! command -v node >/dev/null 2>&1; then
  echo "[cursor-install] Node.js is required but was not found on PATH" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[cursor-install] npm is required but was not found on PATH" >&2
  exit 1
fi

if [ ! -f package.json ]; then
  echo "[cursor-install] package.json not found in $(pwd)" >&2
  exit 1
fi

lockfile="package-lock.json"
stamp_dir=".cursor/cache"
stamp_file="$stamp_dir/package-lock.sha256"

mkdir -p "$stamp_dir"

if [ ! -f "$lockfile" ]; then
  echo "[cursor-install] package-lock.json missing, running npm install"
  npm install
  exit 0
fi

current_lock_hash="$(sha256sum "$lockfile" | awk '{print $1}')"
previous_lock_hash=""

if [ -f "$stamp_file" ]; then
  previous_lock_hash="$(tr -d '\n' < "$stamp_file")"
fi

if [ -d node_modules ] && [ "$current_lock_hash" = "$previous_lock_hash" ]; then
  echo "[cursor-install] Lockfile unchanged and node_modules present, skipping reinstall"
  exit 0
fi

if [ ! -d node_modules ]; then
  echo "[cursor-install] node_modules missing, running npm ci"
  npm ci
  printf '%s' "$current_lock_hash" > "$stamp_file"
  exit 0
fi

echo "[cursor-install] Lockfile changed, refreshing dependencies with npm ci"
if npm ci --prefer-offline; then
  printf '%s' "$current_lock_hash" > "$stamp_file"
  exit 0
fi

echo "[cursor-install] npm ci failed, clearing node_modules and retrying"
rm -rf node_modules
npm ci
printf '%s' "$current_lock_hash" > "$stamp_file"
