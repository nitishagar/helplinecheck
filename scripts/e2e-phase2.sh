#!/usr/bin/env bash
# Phase 2 e2e (cloud, costs money): one Job audit inside the $0.35 envelope.
# Skips unless HELPLINECHECK_LIVE=1 and GCP_PROJECT are set. Never runs by default.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ "${HELPLINECHECK_LIVE:-}" != "1" || -z "${GCP_PROJECT:-}" ]]; then
  echo "e2e-phase2: SKIP (set HELPLINECHECK_LIVE=1 and GCP_PROJECT to run the live Job audit)"
  exit 0
fi

if ! command -v gcloud >/dev/null 2>&1; then
  echo "e2e-phase2: SKIP (gcloud not installed)" >&2
  exit 3
fi

REGION="${GCP_LOCATION:-us-central1}"
JOB="helplinecheck-audit"

echo "== e2e-phase2: executing Cloud Run Job $JOB in $GCP_PROJECT/$REGION =="
EXEC="$(gcloud run jobs execute "$JOB" --region "$REGION" --project "$GCP_PROJECT" --wait --format='value(metadata.name)')"
echo "execution: $EXEC"
gcloud logging read "resource.labels.job_name=$JOB AND labels.execution_name=$EXEC" \
  --project "$GCP_PROJECT" --limit 20 --format='value(textPayload)' | tail -20
echo "e2e-phase2: OK — record observed cost against the \$0.35 envelope and confirm budget alerts are armed"
