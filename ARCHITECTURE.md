# HelplineCheck Architecture

Every user-facing component deploys directly to Cloud Run (plan I8).

```
                    ┌─────────────────────────┐
                    │  Cloud Scheduler        │  weekly: helplinecheck-weekly
                    │  (3 jobs free)          │  → Pub/Sub helplinecheck-audit-requests
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
   browser ────────▶│  web service            │  minScale 0, request billing
   POST /api/audits │  helplinecheck-web      │  POST runs inline (demo) or
   GET /reports/:id │  infra/Dockerfile.web   │  publishes to Pub/Sub (cloud)
                    └────────────┬────────────┘
                                 │ execute job
                    ┌────────────▼────────────┐
                    │  audit Job              │  parallelism 8, off serving path
                    │  helplinecheck-audit    │  fan-out over corpus (worker/)
                    │  infra/Dockerfile.worker│
                    └─┬────────┬──────────┬───┘
                      │        │          │
        ┌─────────────▼─┐ ┌────▼──────┐ ┌─▼──────────────────┐
        │ target bot    │ │ judge     │ │ stores             │
        │ (org's own,   │ │ service   │ │ Firestore: runs +  │
        │ opt-in only)  │ │ L4 GPU    │ │  records + review  │
        └───────────────┘ │ minScale 0│ │ queue; GCS: HTML/  │
                          │ Gemma 3 4B│ │ MD reports         │
                          └─────┬─────┘ └────────────────────┘
                                │ fallback
                          ┌─────▼─────────────────────────┐
                          │ Gemini (Developer API key, or │
                          │ Vertex AI enterprise path)    │
                          └───────────────────────────────┘

   Billing budget ($5 cap, 50/90/100% + forecast) → Pub/Sub
   helplinecheck-budget-alerts → email + log sink (infra/budget.sh)
```

## Key decisions

- **Jobs for batch, service for verdicts.** GPU services idle ~10 min
  post-request (~$0.17/wake), so audits run as Jobs; only verdict calls wake
  the L4 judge service, which scales to zero.
- **Judge sizing (Q2).** Gemma 3 4B (E4B) via Ollama fits the L4 24GB config
  (1 GPU, 4 vCPU, 16 GiB) comfortably; 27B-class models need quantization.
- **One contract, two paths (Q3/Q4).** zod `strictObject` schemas mirror the
  ADK planner `output_schema` 1:1; vitest chain (`verify` + `gates.sh`).
- **Human review (I7).** Contested or high/critical verdicts queue in
  Firestore before publication; reports banner them as preliminary.
- **Cost envelope (I6).** ~$0.35 per 15–30 min audit; see
  `infra/cloud-notes.md` for the math.
