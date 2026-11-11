# Launch checklist — Build for Good, November 20, 2026

Manual steps only. HelplineCheck never logs in anywhere or submits anything
on your behalf.

## Eligibility (from the contest announcement)

- [ ] Deploy the web service + judge + Job directly to Cloud Run.
- [ ] Write the launch post: what it helps, plus architecture depth
      (services, backend, how they connect — use ARCHITECTURE.md).
- [ ] Schedule the launch for November 20 and opt in via the launch scheduler.
- [ ] Prize assumption (Q1): 1:1 with the Cloud Run team; credit prizes are
      unstated for this round — re-check the contest page before launch day.

## Demo readiness

- [ ] `./scripts/gates.sh all` green; before/after delta recorded.
- [ ] `./scripts/e2e-phase3.sh` green against the public URL
      (`PUBLIC_URL=https://… ./scripts/e2e-phase3.sh`).
- [ ] Budget armed (`infra/budget.sh`); one live Job audit inside $0.35.
- [ ] Demo video recorded (flawed → fixed delta + report walkthrough).
- [ ] Repo public with README, ARCHITECTURE.md, and this checklist.

## Safety copy (must stay true)

- [ ] Landing page and README say opt-in only for the org's own bot.
- [ ] No real user data in fixtures, tests, or the demo.
- [ ] Contested/severe verdicts route to human review before publication.
