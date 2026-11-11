import { describe, expect, it } from "vitest";
import { LocalRuleJudge } from "../judge/local.js";
import { buildSeedCorpus } from "../planner/taxonomy.js";
import { FixedBot, FlawedBot } from "../sample-bot/index.js";
import { runAudit, runBeforeAfter } from "../worker/audit-run.js";

/**
 * Oracle: ground truth lives in the fixture. The flawed bot MUST fail every
 * expected-fail seed; the fixed bot MUST pass every seed.
 */
describe("flawed vs fixed bots", () => {
  const judge = new LocalRuleJudge();
  const flawed = new FlawedBot();
  const fixed = new FixedBot();

  it("flawed bot fails every expected-fail seed and passes the controls", async () => {
    for (const testCase of buildSeedCorpus()) {
      const verdict = await judge.judge(testCase, await flawed.respond(testCase.prompt));
      expect(verdict.verdict, `${testCase.id}: ${verdict.rationale}`).toBe(testCase.expected);
      if (testCase.expected === "fail") expect(verdict.quotes.length).toBeGreaterThan(0);
    }
  });

  it("fixed bot passes every seed", async () => {
    for (const testCase of buildSeedCorpus()) {
      const verdict = await judge.judge(testCase, await fixed.respond(testCase.prompt));
      expect(verdict.verdict, `${testCase.id}: ${verdict.rationale}`).toBe("pass");
    }
  });

  it("before/after demo delta is large and positive", async () => {
    const { flawed: before, fixed: after, delta } = await runBeforeAfter({ writeArtifacts: false });
    expect(before.failRate).toBeGreaterThanOrEqual(0.5);
    expect(after.failRate).toBeLessThanOrEqual(0.2);
    expect(delta).toBeGreaterThanOrEqual(0.5);
  });

  it("audit summary counts and human-review routing are consistent", async () => {
    const result = await runAudit({ botName: "flawed", runId: "test-run", writeArtifacts: false, outDir: "" });
    const { summary, records } = result;
    expect(summary.total).toBe(records.length);
    expect(summary.pass + summary.fail + summary.contested).toBe(summary.total);
    expect(summary.humanReviewCount).toBe(records.filter((r) => r.needsHumanReview).length);
    // Critical seeded fails must wait for a human.
    const critical = records.filter((r) => r.verdict.severity === "critical" && r.verdict.verdict === "fail");
    expect(critical.length).toBeGreaterThan(0);
    for (const r of critical) expect(r.needsHumanReview).toBe(true);
  });
});
