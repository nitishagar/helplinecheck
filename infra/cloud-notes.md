# Cloud wiring notes: Pub/Sub, Firestore, GCS (plan I3/I5/I6)

All commands assume `GCP_PROJECT` is set and the region is `us-central1`
(cost math below uses us-central1 list prices).

## Pub/Sub (first 10 GiB/mo free, then $40/TiB)

```bash
gcloud pubsub topics create helplinecheck-audit-requests --project "$GCP_PROJECT"
gcloud pubsub topics create helplinecheck-budget-alerts --project "$GCP_PROJECT"
gcloud pubsub subscriptions create helplinecheck-audit-worker \
  --topic helplinecheck-audit-requests --project "$GCP_PROJECT" \
  --ack-deadline 600 --max-delivery-attempts 5
```

The web service publishes `{bot, cases?}` to `helplinecheck-audit-requests`
(cloud path); a small launcher (or Scheduler, see below) executes the Job.
Budget alerts publish to `helplinecheck-budget-alerts` (see `budget.sh`).

## Firestore (Std: $0.03/100k reads, $0.09/100k writes; 50k/20k daily free)

Collections (written by the Job; read by the web service):

- `auditRuns/{runId}` — summary document: `{bot, total, pass, fail,
  contested, failRate, humanReviewCount, sources, reportUrl, createdAt}`.
- `auditRuns/{runId}/records/{caseId}` — one `AuditRecord` per test case.
- `reviewQueue/{runId}-{caseId}` — contested/high/critical records awaiting a
  human; deleted on resolution with `{resolution, reviewer, resolvedAt}`.

```bash
gcloud firestore databases create --project "$GCP_PROJECT" --location us-central1 2>/dev/null || true
```

## GCS reports ($0.020/GB-mo Std regional)

One immutable, self-contained HTML artifact per run plus its Markdown twin:

```bash
gcloud storage buckets create "gs://$GCP_PROJECT-helplinecheck-reports" \
  --project "$GCP_PROJECT" --location us-central1 --uniform-bucket-level-access
```

Object layout: `reports/{runId}/report.html`, `reports/{runId}/report.md`,
`reports/{runId}/summary.json`. Serve reports with
`Cache-Control: public, max-age=31536000, immutable`.

## Cost envelope (one 15–30 min audit ≈ $0.35)

Min L4 instance = $0.0001867 (GPU) + 4×$0.000018 (CPU) + 16×$0.000002 (mem)
= $0.0002907/s ≈ $1.05/hr. $0.35 ≈ 20 min full-instance runtime.
GPU services idle ~10 min post-request (~$0.17/wake), so batch audits run as
Jobs and the judge service scales to zero between verdict calls.
