# Submission guide — Product Hunt + Cloud Run "Build for Good" launch

> **Agent boundary.** HelplineCheck never logs in anywhere and never submits
> anything. Every step below is performed by a human in Chromium. The agent's
> job ends at preparing these docs, the demo, and the copy.

> **Deadline warning.** The launch is scheduled for **November 20, 2026**
> (see `LAUNCH_CHECKLIST.md`). Everything in the "Before Nov 18" section must
> be finished by **end of day November 18** — Product Hunt scheduling, the
> launch post, and the demo video all need buffer for review and fixes. Do not
> leave submission-day tasks for Nov 19–20.

## Before Nov 18 (human + agent, no login needed)

- [ ] `npm run verify` green (typecheck → lint → build → test → smoke).
- [ ] `./scripts/gates.sh all` green (schema → judge → unit → e2e gates).
- [ ] Before/after numbers recorded: flawed **3/12 pass, 9 fail (75% fail
      rate, 9 queued for human review)** → fixed **12/12 pass (0%)**, delta
      **75 percentage points**. Reproduce with `./scripts/e2e-phase1.sh`.
- [ ] `./scripts/e2e-phase3.sh` green locally; then green against the public
      URL: `PUBLIC_URL=https://… ./scripts/e2e-phase3.sh`.
- [ ] Budget armed: `BILLING_ACCOUNT=… GCP_PROJECT=… ./infra/budget.sh`
      ($5 cap, alerts at 50/90/100% + forecast). One live Job audit stays
      inside the ~$0.35 envelope.
- [ ] Demo video recorded per [DEMO_SCRIPT.md](DEMO_SCRIPT.md) (60–90 s).
- [ ] Repo public with README, ARCHITECTURE.md, LAUNCH_CHECKLIST.md, and
      this `docs/` folder.
- [ ] Opt-in copy check: landing page (`web/server.ts` `LANDING`), README,
      and launch post all say **opt-in only for the org's own bot**; no real
      user data in fixtures, tests, or the demo; contested/severe verdicts
      route to human review before publication.

## Chromium steps — Product Hunt (human only)

Do these in order. Stop and take over at step 2 — that is the login handoff.

1. Open Chromium with a clean profile window and go to `producthunt.com`.
2. **LOGIN HANDOFF — the user must log in here.** Sign in with the
   founder's **personal** maker account (photo, name, short bio filled in),
   not a company page. Product Hunt limits posting for brand-new or dormant
   accounts, so this account should have a few days of genuine upvotes and
   comments before launch day. The agent cannot and will not do this step.
3. Click **Submit**, then **New Product**. Paste the live demo URL
   (`https://helplinecheck-web-….run.app`) — the demo must be tryable
   without signing up (`POST /api/audits {"bot":"flawed"}`, open
   `reportUrl`).
4. Fill the listing from [LAUNCH_COPY.md](LAUNCH_COPY.md): name
   "HelplineCheck", the tagline, description, up to 3 topics/tags, makers,
   and links (repo, live demo, report sample).
5. Upload the gallery: thumbnail, the before/after report screenshots, and
   the 60–90 s demo video (or video link). Keep the opt-in banner visible
   in at least one screenshot.
6. **Schedule** (do not launch immediately): pick **November 20, 2026**.
   Launches go live at 12:01 AM Pacific and run for 24 hours; scheduling is
   available up to ~30 days ahead. Save as scheduled and confirm the
   scheduled date on the dashboard.
7. Draft (do not post) the maker first comment from
   [LAUNCH_COPY.md](LAUNCH_COPY.md) so it is ready to paste at 12:01 AM PT
   on launch day.

Reference: Product Hunt's own guide,
[Build your product page](https://help.producthunt.com/en/articles/17834537-4-build-your-product-page).

## Chromium steps — Cloud Run contest launch post (human only)

1. Open the "Build for Good" contest page in Chromium.
2. **LOGIN HANDOFF — the user must log in here** with the account that owns
   the contest entry. The agent cannot and will not do this step.
3. Write the launch post from [LAUNCH_COPY.md](LAUNCH_COPY.md): what it
   helps, plus architecture depth (services, backends, how they connect —
   see [ARCHITECTURE.md](ARCHITECTURE.md) and `architecture.mmd`).
4. Eligibility self-check before opting in: web service + L4 judge + audit
   Job all deployed directly to Cloud Run; launch scheduled for
   November 20; opted in via the launch scheduler.
5. Opt in via the launch scheduler. Re-check the contest page for the
   current prize statement (credit prizes were unstated for this round —
   the 1:1-with-Cloud-Run-team assumption in `LAUNCH_CHECKLIST.md` must be
   re-verified on the page itself, not trusted from this doc).

## Launch day (Nov 20, human only)

- [ ] Post goes live 12:01 AM PT — paste the maker first comment immediately.
- [ ] Reply to every question within the hour, in your own words.
- [ ] Watch the budget alerts topic (`helplinecheck-budget-alerts`) and the
      Cloud Run dashboards; demo traffic should stay far under the $5 cap.
- [ ] Do not post raw leaderboard/vote links early; share the launch page.
