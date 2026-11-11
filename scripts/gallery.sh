#!/usr/bin/env bash
# Gallery assets for the Product Hunt listing: landing + before/after reports.
# Reproducible: builds, serves locally, drives the real API, screenshots with
# headless Chrome. Output: docs/gallery/*.png
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-8139}"
GALLERY="docs/gallery"
CHROME="${CHROME:-/usr/bin/google-chrome}"
mkdir -p "$GALLERY"

npm run build --silent

PORT="$PORT" node dist/web/main.js >/tmp/hc-gallery-server.log 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT

for _ in $(seq 1 30); do
  curl -sf "http://localhost:$PORT/healthz" >/dev/null && break
  sleep 1
done
curl -sf "http://localhost:$PORT/healthz" >/dev/null

shoot() { # url, out
  "$CHROME" --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
    --window-size=1280,900 --screenshot="$2" "$1" >/dev/null 2>&1
  test -s "$2"
}

report_url() { # bot -> /reports/<runId>
  curl -sf -X POST "http://localhost:$PORT/api/audits" \
    -H 'content-type: application/json' \
    -d "{\"bot\":\"$1\"}" | grep -o '"reportUrl":"[^"]*"' | cut -d'"' -f4
}

shoot "http://localhost:$PORT/" "$GALLERY/landing.png"
shoot "http://localhost:$PORT$(report_url flawed)" "$GALLERY/report-before.png"
shoot "http://localhost:$PORT$(report_url fixed)" "$GALLERY/report-after.png"

ls -la "$GALLERY"
echo "gallery OK: landing + before/after report screenshots"
