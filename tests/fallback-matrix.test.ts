import { describe, expect, it } from "vitest";
import { GeminiJudge, GemmaJudge } from "../judge/cloud.js";
import { LocalRuleJudge } from "../judge/local.js";
import { MockJudgePort } from "../judge/mock.js";
import { JudgeUnavailable, judgeWithRouting } from "../judge/types.js";
import { buildSeedCorpus } from "../planner/taxonomy.js";

/** Fault-injection routing matrix (hybridlens hybrid.service.test.ts pattern). */
describe("judge fallback matrix", () => {
  const testCase = buildSeedCorpus()[0]!;
  const botResponse = "We are open Monday to Friday, 9am to 5pm.";

  function ports() {
    return {
      local: new MockJudgePort("local-judge"),
      gemma: new MockJudgePort("gemma"),
      gemini: new MockJudgePort("gemini-fallback"),
    };
  }

  it("prefer-local uses the local judge and badges the source", async () => {
    const p = ports();
    const verdict = await judgeWithRouting(testCase, botResponse, { mode: "prefer-local", ...p });
    expect(verdict.source).toBe("local-judge");
    expect(p.gemma.calls).toHaveLength(0);
  });

  it("prefer-gemma falls back to gemini, then local, when gemma is down", async () => {
    const p = ports();
    p.gemma.faults.down = true;
    const v1 = await judgeWithRouting(testCase, botResponse, { mode: "prefer-gemma", ...p });
    expect(v1.source).toBe("gemini-fallback");
    p.gemini.faults.down = true;
    const v2 = await judgeWithRouting(testCase, botResponse, { mode: "prefer-gemma", ...p });
    expect(v2.source).toBe("local-judge");
  });

  it("prefer-local falls forward to gemma when local is down", async () => {
    const p = ports();
    p.local.faults.down = true;
    const verdict = await judgeWithRouting(testCase, botResponse, { mode: "prefer-local", ...p });
    expect(verdict.source).toBe("gemma");
  });

  it("ONLY modes throw instead of falling back", async () => {
    const p1 = ports();
    p1.local.faults.down = true;
    await expect(judgeWithRouting(testCase, botResponse, { mode: "local-only", ...p1 })).rejects.toBeInstanceOf(
      JudgeUnavailable,
    );
    expect(p1.gemma.calls).toHaveLength(0);
    expect(p1.gemini.calls).toHaveLength(0);

    const p2 = ports();
    p2.gemma.faults.down = true;
    await expect(judgeWithRouting(testCase, botResponse, { mode: "gemma-only", ...p2 })).rejects.toBeInstanceOf(
      JudgeUnavailable,
    );
    expect(p2.local.calls).toHaveLength(0);
    expect(p2.gemini.calls).toHaveLength(0);
  });

  it("skips unconfigured ports and throws when none are configured", async () => {
    const p = ports();
    p.local = new MockJudgePort("local-judge", false);
    const verdict = await judgeWithRouting(testCase, botResponse, { mode: "prefer-local", ...p });
    expect(verdict.source).toBe("gemma");
    const none = {
      local: new MockJudgePort("local-judge", false),
      gemma: new MockJudgePort("gemma", false),
      gemini: new MockJudgePort("gemini-fallback", false),
    };
    await expect(judgeWithRouting(testCase, botResponse, { mode: "prefer-gemma", ...none })).rejects.toBeInstanceOf(
      JudgeUnavailable,
    );
  });

  it("cloud judges report unconfigured without credentials (no network touched)", () => {
    expect(new GemmaJudge({}).configured).toBe(false);
    expect(new GeminiJudge({}).configured).toBe(false);
    expect(new LocalRuleJudge().configured).toBe(true);
    expect(new GemmaJudge({ JUDGE_URL: "http://judge:8080" }).configured).toBe(true);
    expect(new GeminiJudge({ GEMINI_API_KEY: "test" }).configured).toBe(true);
    expect(
      new GeminiJudge({ GOOGLE_GENAI_USE_VERTEXAI: "true", GCP_PROJECT: "p", GOOGLE_ACCESS_TOKEN: "t" }).configured,
    ).toBe(true);
  });
});
