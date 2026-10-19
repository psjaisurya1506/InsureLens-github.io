#!/usr/bin/env bash
# One-step start for macOS / Linux: installs dependencies if needed, then runs the dev server.
set -e
cd "$(dirname "$0")"
[ -d node_modules/next ] || npm install
npm run dev
