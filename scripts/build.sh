#!/usr/bin/env bash
#
# build.sh — produce a runnable Next.js standalone bundle.
#
# This is reused verbatim by CI in Phase 3, so it must stay reproducible and
# platform-neutral (bash + Linux). It BUILDS and ASSEMBLES only; it does not
# inject env vars. Build-time NEXT_PUBLIC_* come from the environment
# (.env.local when run locally, injected secrets in CI) — Next loads those itself.

set -euo pipefail
# -e            abort on the first command that fails (no ploughing ahead in CI)
# -u            using an unset variable is an error, not an empty string
# -o pipefail   a pipeline fails if ANY stage fails, not just the last

# Always run from the repo root, regardless of where the script was invoked from.
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.."

echo "==> Cleaning previous build"
# Start clean so a stale .next/standalone can't cause the asset-copy nesting bug.
rm -rf .next

echo "==> Installing dependencies (clean, lockfile-exact)"
# npm ci (not install): wipes node_modules and installs EXACTLY what the lockfile
# pins, failing if package.json and the lock disagree. Reproducibility is the whole
# point of build-once-ship-the-artifact — this is also what avoids a cross-platform
# node_modules getting reused.
npm ci

echo "==> Building (output: standalone)"
npm run build

# The standalone tree deliberately EXCLUDES static assets — without this copy the
# site serves HTML while every CSS/JS/image 404s.
if [ ! -d .next/standalone ]; then
  echo "ERROR: .next/standalone not found — is output:'standalone' set in next.config?" >&2
  exit 1
fi

echo "==> Copying static assets into standalone"
cp -r .next/static .next/standalone/.next/
cp -r public        .next/standalone/

echo "==> Done. Run with:  node .next/standalone/server.js"
