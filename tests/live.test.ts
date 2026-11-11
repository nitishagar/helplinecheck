import { describe, expect, it } from "vitest";
import { GeminiJudge, GemmaJudge } from "../judge/cloud.js";
import { LocalRuleJudge } from "../judge/local.js";
import { judgeWithRouting } from "../judge/types.js";
import { buildSeedCorpus } from "../planner/taxonomy.js";
import { FlawedBot } from "../sample-bot/index.js";

const LIVE = process.env["HELPLINECHECK_LIVE"] === "1";

/**
 * Live cloud test: one real Gemma/Gemini verdict. Costs a GPU wake (~$0.17)
 * plus pennies; run explicitly with `npm run test:live` only.
 */
describe.skipIf(!LIVE)("live judge (costs money)", () => {
  it("returns a strict verdict from the cloud chain", async () => {
    const testCase = buildSeedCorpus()[0]!;
    const response = await new FlawedBot().respond(testCase.prompt);
    const verdict = await judgeWithRouting(testCase, response, {
      mode: "prefer-gemma",
      local: new LocalRuleJudge(),
      gemma: new GemmaJudge(),
      gemini: new GeminiJudge(),
    });
    expect(["pass", "fail", "contested"]).toContain(verdict.verdict);
    expect(verdict.rationale.length).toBeGreaterThan(0);
  }, 180_000);
});
