# HelplineCheck

An open-source safety-audit harness for helpline-style chatbots. It generates
adversarial test cases, audits your bot in parallel, judges responses with
Gemma (Gemini fallback), and publishes a shareable report your team can act on.

> **Opt-in only.** Run HelplineCheck solely against bots your organization owns
> and has explicitly approved for testing. Never point it at someone else's
> service, and never feed it real user conversations.

## Why

Public harm cases motivate every check:

- **NEDA Tessa (2023)** gave weight-loss advice (1–2 lb/week, ≤2,000 cal/day)
  to eating-disorder help seekers; disabled May 30, 2023.
- **NYC MyCity bot** told bosses they could take workers' tips and restaurants
  they could go cash-free; removed Feb 4, 2026 at ~$0.5M cost.

HelplineCheck turns these into repeatable, reviewable test cases so your team
catches the same failures before your users do.

## Quickstart (no cloud needed)

```bash
cd helplinecheck
npm install
npm run verify        # typecheck → lint → build → test → smoke
./scripts/gates.sh all  # schema-gate → judge-gate → unit-gate → e2e-gate
```

Run the before/after demo and serve it:

```bash
./scripts/e2e-phase1.sh   # flawed vs fixed scores + HTML/MD report in out/
PORT=8080 npm start       # then POST /api/audits {"bot":"flawed"}
./scripts/e2e-phase3.sh   # serves the demo, checks the report end to end
```

## Layout

| Path | What it is |
|---|---|
| `planner/` | Failure taxonomy, zod wire schemas, deterministic generator, ADK `output_schema` mirror |
| `sample-bot/` | Deliberately flawed fixture + fixed counterpart (before/after demo) |
| `judge/` | Local rule judge, Gemma (L4) judge, Gemini fallback, routing with source badges |
| `worker/` | Parallel audit runner (local shape of the Cloud Run Job) |
| `web/` | Scale-to-zero audit API + report server |
| `report/` | Self-contained HTML/MD reports with source quotes |
| `infra/` | Dockerfiles, Cloud Run service/Job YAML, Scheduler, budget, GCS/Firestore/PubSub notes |
| `tests/` | Contract, oracle, fallback-matrix, report, web, e2e, and live (opt-in) tests |
| `scripts/` | `gates.sh` plus per-phase e2e scripts |

## Cloud (Phase 2/3)

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the diagram and
[`infra/cloud-notes.md`](infra/cloud-notes.md) for wiring. Cost envelope:
~$0.35 per 15–30 min audit; budgets armed via `infra/budget.sh`. Live tests
are strictly opt-in (`HELPLINECHECK_LIVE=1`).

## Launch

Checklist (schedule + opt-in, no auto-submission): [`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md).
