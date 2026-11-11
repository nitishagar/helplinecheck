import { describe, expect, it } from "vitest";
import {
  AuditRequestSchema,
  TestCaseSchema,
  TestCorpusSchema,
  VerdictSchema,
  FAILURE_MODES,
  SEVERITY,
} from "../planner/schema.js";
import { strictArgs } from "../planner/strict-args.js";
import { buildSeedCorpus } from "../planner/taxonomy.js";
import { OUTPUT_JSON_SCHEMA, validateGeneratedCorpus } from "../planner/generator.js";

/** Wire-contract gate (lumen schema-contract.test.ts pattern). */
describe("schema contract", () => {
  it("seed corpus validates against the strict corpus schema", () => {
    const parsed = TestCorpusSchema.safeParse({ version: "1", cases: buildSeedCorpus() });
    expect(parsed.success).toBe(true);
  });

  it("requires the exact field set on a test case", () => {
    const good = buildSeedCorpus()[0]!;
    expect(TestCaseSchema.safeParse(good).success).toBe(true);
    for (const key of ["id", "category", "prompt", "expected", "rationale"] as const) {
      const rest: Record<string, unknown> = { ...good };
      delete rest[key];
      expect(TestCaseSchema.safeParse(rest).success, `missing ${key} should fail`).toBe(false);
    }
  });

  it("rejects unknown args (evilParam) on every wire schema", () => {
    const good = buildSeedCorpus()[0]!;
    expect(TestCaseSchema.safeParse({ ...good, evilParam: 1 }).success).toBe(false);
    expect(TestCorpusSchema.safeParse({ version: "1", cases: [good], evilParam: 1 }).success).toBe(false);
    expect(AuditRequestSchema.safeParse({ bot: "flawed", evilParam: 1 }).success).toBe(false);
    expect(
      VerdictSchema.safeParse({
        caseId: "x", verdict: "pass", severity: "low", rationale: "r", quotes: [], source: "local-judge", evilParam: 1,
      }).success,
    ).toBe(false);
  });

  it("rejects bad enums, bounds, and types", () => {
    const good = buildSeedCorpus()[0]!;
    expect(TestCaseSchema.safeParse({ ...good, category: "NOPE" }).success).toBe(false);
    expect(TestCaseSchema.safeParse({ ...good, expected: "maybe" }).success).toBe(false);
    expect(TestCaseSchema.safeParse({ ...good, prompt: "" }).success).toBe(false);
    expect(TestCaseSchema.safeParse({ ...good, prompt: 42 }).success).toBe(false);
    expect(AuditRequestSchema.safeParse({ bot: "someone-elses-bot" }).success).toBe(false);
    expect(AuditRequestSchema.safeParse({ bot: "flawed", concurrency: 99 }).success).toBe(false);
    expect(TestCorpusSchema.safeParse({ version: "1", cases: [] }).success).toBe(false);
    expect(TestCorpusSchema.safeParse({ version: "2", cases: [good] }).success).toBe(false);
  });

  it("keeps zod enums and the ADK JSON Schema mirror in parity", () => {
    const items = OUTPUT_JSON_SCHEMA.properties.cases.items;
    expect([...items.properties.category.enum]).toEqual([...FAILURE_MODES]);
    expect([...items.properties.severity.enum]).toEqual([...SEVERITY]);
    expect(items.additionalProperties).toBe(false);
    expect(OUTPUT_JSON_SCHEMA.additionalProperties).toBe(false);
  });

  it("validates external generator output and reports issues", () => {
    const ok = validateGeneratedCorpus({ version: "1", cases: buildSeedCorpus() });
    expect(ok.ok).toBe(true);
    expect(ok.corpus?.cases).toHaveLength(buildSeedCorpus().length);
    const bad = validateGeneratedCorpus({ version: "1", cases: [{ id: "x" }] });
    expect(bad.ok).toBe(false);
    expect(bad.issues.length).toBeGreaterThan(0);
  });
});

describe("strictArgs", () => {
  it("flags unknown keys and passes known ones", () => {
    expect(strictArgs({ a: 1, b: 2 }, ["a", "b"])).toEqual([]);
    expect(strictArgs({ a: 1, evilParam: 2 }, ["a"])).toEqual(["evilParam"]);
    expect(strictArgs(null, ["a"])).toEqual([]);
  });
});
