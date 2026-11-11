# Launch copy — HelplineCheck

Tagline (use verbatim): **Test your helpline bot before someone in need does**

Voice: human-centered. The person reaching out for help is the subject of
every sentence that matters; the tooling is background. Never clever at
the expense of care, never fear-mongering. Opt-in is a promise, not fine
print — it appears in every piece below.

## Product Hunt listing

- **Name:** HelplineCheck
- **Tagline:** Test your helpline bot before someone in need does
- **Description:** HelplineCheck is an open-source safety audit for
  helpline-style chatbots. It turns public harm cases — NEDA's Tessa
  prescribing calorie budgets, NYC's city bot blessing unlawful advice —
  into repeatable test cases, runs them against your own bot in parallel,
  judges every response, and hands your team a shareable report with the
  bot's own words quoted. The demo shows a flawed bot failing 9 of 12
  checks, then the same 12 checks passing 12/12 after fixes — a
  75-point swing. Contested or severe verdicts wait for a human before
  anything publishes. Opt-in only: audit bots your organization owns and
  has approved for testing.
- **Topics/tags (pick up to 3):** Open Source, AI Safety, Developer Tools
- **Links:** repo, live demo (`POST /api/audits {"bot":"flawed"}` — no
  signup), sample report, architecture deep-dive (`docs/ARCHITECTURE.md`).

## Maker first comment (paste at 12:01 AM PT, then stay for questions)

> Hi, I'm Nitish. I built HelplineCheck after reading how NEDA's Tessa
> gave weight-loss advice to eating-disorder help seekers, and how NYC's
> city bot told bosses they could take workers' tips. Both shipped. Both
> had to be pulled.
>
> HelplineCheck is a free, open-source harness that catches those exact
> failures before your users do: 12 seeded checks (9 adversarial, 3
> controls), parallel audits on Cloud Run, a Gemma judge with source
> badges on every verdict, and a report your team can act on the same day
> — about $0.35 per audit.
>
> Try it live with no signup: POST `{"bot":"flawed"}` to `/api/audits`,
> open the report, then compare `{"bot":"fixed"}`. One rule we hold
> everywhere: opt-in only — run it solely against bots your organization
> owns and has approved for testing.
>
> Happy to answer anything about the taxonomy, the judge routing, or the
> Cloud Run setup. What failure mode would you add first?

## Contest launch post (short version — expand with docs/ARCHITECTURE.md)

> **HelplineCheck — test your helpline bot before someone in need does.**
> An open-source harness that audits helpline bots against failure modes
> taken from real harm cases. Before: 3/12 checks pass. After fixes:
> 12/12. Every verdict carries its judge's source badge; severe verdicts
> wait for a human. Runs entirely on Cloud Run — a scale-to-zero web
> service, a parallel audit Job, and a Gemma 3 4B judge on L4 GPUs with
> Gemini fallback — at ~$0.35 per audit. Opt-in only, for your org's own
> bots. Report, demo, and architecture inside.

## Social (one post, human-centered, opt-in intact)

> NEDA's bot told help seekers to count calories. NYC's bot told bosses
> to take tips. HelplineCheck turns those failures into 12 repeatable
> checks — flawed bot: 3/12, fixed bot: 12/12. Open source, ~$0.35/audit
> on Cloud Run, opt-in only for your own bots. Test your helpline bot
> before someone in need does. [demo link]

## Safety lines (must stay true everywhere)

- Opt-in only: run audits solely against bots your organization owns and
  has explicitly approved for testing.
- Never point HelplineCheck at someone else's service; never feed it real
  user conversations.
- No real user data in fixtures, tests, or the demo — seeded cases only.
- Contested or severe verdicts route to human review before publication.
