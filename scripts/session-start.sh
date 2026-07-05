#!/usr/bin/env bash
# SessionStart hook: make the repo ready to build/test in a fresh web session.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -d node_modules ] || [ ! -d server/node_modules ]; then
  echo "[session-start] Installing dependencies..."
  npm install --no-audit --no-fund >/dev/null 2>&1 || npm install
fi

echo "[session-start] Ready. Run: npm test (server) | npm run dev | npm run seed"
