# Demo script — before/after in 60–90 seconds

Audience: helpline operators, chatbot teams, hackathon judges. Tone:
human-centered — the people in need come first, the tooling second.

## Verified numbers (do not ad-lib; reproduce with `./scripts/e2e-phase1.sh`)

12 seeded cases per audit: 9 adversarial fail-seeds grounded in public harm
cases (NEDA Tessa eating-disorder advice ×3, NYC MyCity unlawful advice ×3,
unqualified chest-pain diagnosis, self-harm disclosure, crisis request with
no resources) plus 3 safe control cases (hours, appointments,
confidentiality) that must keep passing.

| Run | Pass | Fail | Fail rate | Human review queue |
|---|---|---|---|---|
| Before (`flawed`) | 3/12 | 9 | 75% | 9 (all fails are high/critical) |
| After (`fixed`) | 12/12 | 0 | 0% | 0 |
| **Delta** | — | — | **−75 pp** | — |

Every verdict carries a judge-source badge (local rule judge offline;
Gemma-on-L4 with Gemini fallback in cloud). Reports are self-contained
HTML/Markdown with zero external requests and a "Human review needed"
banner on preliminary verdicts.

## Video beats (60–90 s total)

**0:00–0:10 — The stakes (one sentence each, on screen: the two headlines).**
"NEDA's Tessa told eating-disorder help seekers to count calories. NYC's
city bot told bosses they could take workers' tips. Both shipped. Both had
to be pulled."

**0:10–0:25 — Before: run the flawed bot.**
Terminal: `curl -X POST $URL/api/audits -d '{"bot":"flawed"}'`. Open the
returned `reportUrl`. Linger ~3 s on the scoreboard: **3 pass / 9 fail**.
Scroll one Tessa case (calorie budget prescribed to a dizzy help seeker)
and one crisis case (breathing tips, no hotline). Voiceover: "Nine of
twelve checks fail — and nine verdicts queue for a human before anything
publishes."

**0:25–0:40 — The report.**
Show the shareable HTML report: source quotes, severity badges,
judge-source badges, the "Human review needed" banner. Voiceover: "Every
failure quotes the bot's own words, so the team can act on it today."

**0:40–0:55 — After: run the fixed bot.**
Same command with `{"bot":"fixed"}`. Scoreboard: **12 pass / 0 fail**.
Show the fixed crisis response (988 + Crisis Text Line) side by side with
the flawed one. Voiceover: "Same twelve checks. Zero failures. A
seventy-five-point swing the whole team can see."

**0:55–1:10 (optional to 1:30) — How it runs + opt-in close.**
One architecture glance (web → audit Job → Gemma L4 judge → report;
~$0.35 per audit, scales to zero). Close on the landing page's opt-in
line, read aloud: "Opt-in only — audit bots your organization owns and
has approved for testing." Then the tagline, verbatim:
"Test your helpline bot before someone in need does".

## Recording checklist

- [ ] Fresh terminal, font ≥ 18 pt, `PUBLIC_URL` pointing at the live demo.
- [ ] Both `reportUrl` pages loaded once before recording (warm the
      scale-to-zero services so the demo has no cold-start pause).
- [ ] No real user data anywhere on screen — seeded fixtures only.
- [ ] Captions or transcript include the crisis resources named in the fix
      (988, Crisis Text Line 741741).
