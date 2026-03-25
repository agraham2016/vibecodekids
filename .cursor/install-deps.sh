#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "$script_dir/.." && pwd)"

cd "$repo_root"

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

node_major="$(node -p "process.versions.node.split('.')[0]")"
if [ "$node_major" -lt 18 ]; then
  echo "[cursor-install] Node.js 18+ is required. Found $(node -v)" >&2
  exit 1
fi

if [ "$node_major" -ne 20 ]; then
  echo "[cursor-install] Note: CI runs on Node 20, current runtime is $(node -v)"
fi

lockfile="package-lock.json"
manifest="package.json"
stamp_dir="node_modules/.cache/cursor"
stamp_file="$stamp_dir/install-state.env"

if [ -f "$lockfile" ]; then
  install_source="$lockfile"
  install_source_name="package-lock.json"
else
  install_source="$manifest"
  install_source_name="package.json"
fi

current_install_hash="$(sha256sum "$install_source" | awk '{print $1}')"
current_node_major="$node_major"
current_platform="$(node -p "process.platform + '-' + process.arch")"

previous_install_hash=""
previous_node_major=""
previous_platform=""

if [ -f "$stamp_file" ]; then
  while IFS='=' read -r key value; do
    case "$key" in
      install_hash) previous_install_hash="$value" ;;
      node_major) previous_node_major="$value" ;;
      platform) previous_platform="$value" ;;
    esac
  done < "$stamp_file"
fi

write_stamp() {
  mkdir -p "$stamp_dir"
  {
    printf 'install_hash=%s\n' "$current_install_hash"
    printf 'node_major=%s\n' "$current_node_major"
    printf 'platform=%s\n' "$current_platform"
  } > "$stamp_file"
}

if [ -d node_modules ] \
  && [ "$current_install_hash" = "$previous_install_hash" ] \
  && [ "$current_node_major" = "$previous_node_major" ] \
  && [ "$current_platform" = "$previous_platform" ]; then
  echo "[cursor-install] Dependency cache is current for $install_source_name on Node $current_node_major"
  exit 0
fi

if [ ! -d node_modules ]; then
  echo "[cursor-install] node_modules missing, installing dependencies"
elif [ "$current_install_hash" != "$previous_install_hash" ]; then
  echo "[cursor-install] $install_source_name changed, refreshing dependencies"
elif [ "$current_node_major" != "$previous_node_major" ]; then
  echo "[cursor-install] Node major changed ($previous_node_major -> $current_node_major), refreshing native modules"
elif [ "$current_platform" != "$previous_platform" ]; then
  echo "[cursor-install] Platform changed ($previous_platform -> $current_platform), refreshing dependencies"
fi

if [ ! -f "$lockfile" ]; then
  echo "[cursor-install] package-lock.json missing, running npm install"
  npm install
  write_stamp
  exit 0
fi

echo "[cursor-install] Running npm ci"
if npm ci --prefer-offline; then
  write_stamp
  exit 0
fi

echo "[cursor-install] npm ci failed, clearing node_modules and retrying"
rm -rf node_modules
npm ci
write_stamp
