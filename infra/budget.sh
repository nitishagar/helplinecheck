#!/usr/bin/env bash
# Billing budget with Pub/Sub notifications (plan I6; Exodus v0.2.10 pattern).
# Budget at estimate rounded up (min $5), email alerts at 50/90/100% + forecast.
# Usage: BILLING_ACCOUNT=XXXXXX-XXXXXX-XXXXXX ./infra/budget.sh
set -euo pipefail

BILLING_ACCOUNT="${BILLING_ACCOUNT:?set BILLING_ACCOUNT to your billing account id}"
PROJECT_ID="${GCP_PROJECT:?set GCP_PROJECT}"
TOPIC="projects/$PROJECT_ID/topics/helplinecheck-budget-alerts"

gcloud pubsub topics create helplinecheck-budget-alerts --project "$PROJECT_ID" 2>/dev/null || true

gcloud billing budgets create \
  --billing-account "$BILLING_ACCOUNT" \
  --display-name "helplinecheck-monthly-cap" \
  --budget-amount 5 \
  --threshold-rule percent=50,basis=CURRENT_SPEND \
  --threshold-rule percent=90,basis=CURRENT_SPEND \
  --threshold-rule percent=100,basis=CURRENT_SPEND \
  --threshold-rule percent=100,basis=FORECASTED_SPEND \
  --notifications-rule-pubsub-topic "$TOPIC" \
  --all-updates-rule-pubsub-topic "$TOPIC"

echo "budget armed: \$5 cap on $BILLING_ACCOUNT with alerts to $TOPIC"
echo "per-audit envelope: ~\$0.35 for a 15-30 min audit (L4 min instance ~\$1.05/hr; Jobs avoid idle billing)"
