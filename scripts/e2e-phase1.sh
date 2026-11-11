#!/usr/bin/env bash
# Phase 1 e2e (local): seeded corpus fails the expected checks; report renders.
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build --silent
node scripts/run-local-audit.mjs
