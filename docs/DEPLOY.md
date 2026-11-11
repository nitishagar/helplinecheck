# Deploy runbook — HelplineCheck on Cloud Run (us-central1)

Ordered, copy-pasteable. Budget goes on **before** anything billable.
Every stage ends with a check. Placeholders: `PROJECT_ID`, `BILLING_ACCOUNT`.

```bash
export GCP_PROJECT=PROJECT_ID REGION=us-central1 BILLING_ACCOUNT=XXXXXX-XXXXXX-XXXXXX
```

## 0. Prereqs (human, once)

- `gcloud` CLI installed, `gcloud auth login`, `gcloud config set project "$GCP_PROJECT"`.
- Project linked to a billing account. L4 GPU quota: first GPU deploy needs
  ~3000 milliGPU; if the judge deploy fails on quota, request it in the
  console (IAM & Admin → Quotas) and continue — the Gemini fallback keeps the
  demo working meanwhile.

## 1. APIs + service account

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com cloudscheduler.googleapis.com \
  pubsub.googleapis.com firestore.googleapis.com storage.googleapis.com \
  billingbudgets.googleapis.com aiplatform.googleapis.com \
  --project "$GCP_PROJECT"

gcloud iam service-accounts create helplinecheck-run \
  --project "$GCP_PROJECT" --display-name "HelplineCheck runtime"

for role in datastore.user storage.objectAdmin pubsub.publisher \
  pubsub.subscriber aiplatform.user logging.logWriter; do
  gcloud projects add-iam-policy-binding "$GCP_PROJECT" \
    --member "serviceAccount:helplinecheck-run@$GCP_PROJECT.iam.gserviceaccount.com" \
    --role "roles/$role" --condition None >/dev/null
done

gcloud artifacts repositories create helplinecheck \
  --project "$GCP_PROJECT" --location "$REGION" \
  --repository-format docker --description "HelplineCheck images"
```

Check: `gcloud artifacts repositories describe helplinecheck --location "$REGION"`.

## 2. Budget first ($5 cap)

```bash
BILLING_ACCOUNT=$BILLING_ACCOUNT GCP_PROJECT=$GCP_PROJECT ./infra/budget.sh
```

Check: `gcloud billing budgets list --billing-account "$BILLING_ACCOUNT"`.

## 3. Data plane (Pub/Sub, Firestore, GCS)

```bash
gcloud pubsub topics create helplinecheck-audit-requests --project "$GCP_PROJECT"
gcloud pubsub topics create helplinecheck-budget-alerts --project "$GCP_PROJECT" 2>/dev/null || true
gcloud pubsub subscriptions create helplinecheck-audit-worker \
  --topic helplinecheck-audit-requests --project "$GCP_PROJECT" \
  --ack-deadline 600 --max-delivery-attempts 5
gcloud firestore databases create --project "$GCP_PROJECT" --location "$REGION" 2>/dev/null || true
gcloud storage buckets create "gs://$GCP_PROJECT-helplinecheck-reports" \
  --project "$GCP_PROJECT" --location "$REGION" --uniform-bucket-level-access
```

## 4. Build images (Cloud Build, no local docker needed)

```bash
gcloud builds submit --project "$GCP_PROJECT" --tag \
  "$REGION-docker.pkg.dev/$GCP_PROJECT/helplinecheck/web:latest" \
  --dockerfile infra/Dockerfile.web .
gcloud builds submit --project "$GCP_PROJECT" --tag \
  "$REGION-docker.pkg.dev/$GCP_PROJECT/helplinecheck/worker:latest" \
  --dockerfile infra/Dockerfile.worker .
gcloud builds submit --project "$GCP_PROJECT" --tag \
  "$REGION-docker.pkg.dev/$GCP_PROJECT/helplinecheck/judge:latest" \
  --dockerfile infra/Dockerfile.judge .
```

## 5. Deploy judge (L4, scale-to-zero), web, job

```bash
mkdir -p /tmp/hc && for f in cloudrun-service-judge cloudrun-service-web cloudrun-job-audit; do
  sed -e "s/PROJECT_ID/$GCP_PROJECT/g" -e "s/REGION/$REGION/g" \
    "infra/$f.yaml" > "/tmp/hc/$f.yaml"
done

gcloud run services replace /tmp/hc/cloudrun-service-judge.yaml --region "$REGION"
export JUDGE_URL=$(gcloud run services describe helplinecheck-judge \
  --region "$REGION" --format 'value(status.url)')
sed -i "s#https://helplinecheck-judge-HASH-uc.a.run.app#$JUDGE_URL#g" \
  /tmp/hc/cloudrun-service-web.yaml /tmp/hc/cloudrun-job-audit.yaml
gcloud run services replace /tmp/hc/cloudrun-service-web.yaml --region "$REGION"
gcloud run jobs replace /tmp/hc/cloudrun-job-audit.yaml --region "$REGION"
```

Check: both services show `minScale 0`; `gcloud run jobs describe helplinecheck-audit`.

## 6. Weekly scheduler

```bash
gcloud scheduler jobs create pubsub helplinecheck-weekly \
  --project "$GCP_PROJECT" --location "$REGION" --schedule "0 9 * * MON" \
  --topic helplinecheck-audit-requests --message-body '{"bot":"flawed"}' \
  --time-zone America/New_York
```

## 7. Live verify (public URL + one Job audit)

```bash
export PUBLIC_URL=$(gcloud run services describe helplinecheck-web \
  --region "$REGION" --format 'value(status.url)')
PUBLIC_URL=$PUBLIC_URL ./scripts/e2e-phase3.sh
gcloud run jobs execute helplinecheck-audit --region "$REGION" --wait
HELPLINECHECK_LIVE=1 GCP_PROJECT=$GCP_PROJECT npm run test:live
```

Expected: e2e-phase3 green against `$PUBLIC_URL`, Job summary prints
fail-rate numbers matching the local before/after (75% → 0%), spend stays
inside the ~$0.35 envelope and under the $5 budget alerts.

Next: demo video ([DEMO_SCRIPT.md](DEMO_SCRIPT.md)), repo public,
Product Hunt schedule + opt-in ([SUBMISSION.md](SUBMISSION.md)).
