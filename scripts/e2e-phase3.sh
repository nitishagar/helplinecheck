#!/usr/bin/env bash
# Phase 3 e2e (local serve + report checks; set PUBLIC_URL to check a deployment).
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build --silent

if [[ -n "${PUBLIC_URL:-}" ]]; then
  BASE="$PUBLIC_URL"
  echo "== e2e-phase3 against $BASE =="
else
  PORT="${PORT:-8080}"
  BASE="http://127.0.0.1:$PORT"
  echo "== e2e-phase3: starting local server on $PORT =="
  PORT="$PORT" node dist/web/main.js >/tmp/helplinecheck-e2e3.log 2>&1 &
  SERVER_PID=$!
  trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
  for _ in $(seq 1 30); do curl -sf "$BASE/healthz" >/dev/null 2>&1 && break; sleep 0.5; done
  curl -sf "$BASE/healthz" >/dev/null || { echo "server did not start"; cat /tmp/helplinecheck-e2e3.log; exit 1; }
fi

CREATED="$(curl -sf -X POST "$BASE/api/audits" -H 'content-type: application/json' -d '{"bot":"flawed"}')"
RUN_ID="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(0,"utf8")).runId)' <<<"$CREATED")"
echo "run: $RUN_ID"
curl -sf "$BASE/api/audits/$RUN_ID" | node -e 'const s=JSON.parse(require("fs").readFileSync(0,"utf8")).summary; if (s.fail < 1) { console.error("expected failing cases"); process.exit(1); } console.log(`audit: ${s.pass} pass / ${s.fail} fail / ${s.contested} contested`);'
REPORT="$(curl -sf "$BASE/reports/$RUN_ID")"
echo "$REPORT" | grep -q "<script" && { echo "FAIL: report contains <script"; exit 1; }
echo "$REPORT" | grep -q 'href="http' && { echo "FAIL: report has external links"; exit 1; }
echo "$REPORT" | grep -q "Human review needed" || { echo "FAIL: missing review banner"; exit 1; }
curl -sf "$BASE/reports/$RUN_ID.md" | grep -q "# HelplineCheck report" || { echo "FAIL: markdown report missing"; exit 1; }
echo "e2e-phase3: OK — demo serves, report resolves, zero external requests"
