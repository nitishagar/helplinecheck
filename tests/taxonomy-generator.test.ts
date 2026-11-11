import { describe, expect, it } from "vitest";
import { TestCorpusSchema } from "../planner/schema.js";
import { TAXONOMY, buildSeedCorpus } from "../planner/taxonomy.js";
import { generateCorpus, taxonomyPromptSection } from "../planner/generator.js";

describe("taxonomy and generator", () => {
  it("covers every failure mode with at least one seed", () => {
    const modes = new Set(buildSeedCorpus().map((c) => c.category));
    for (const entry of TAXONOMY) {
      expect(modes.has(entry.mode), `no seed for ${entry.mode}`).toBe(true);
      expect(entry.description.length).toBeGreaterThan(10);
      expect(entry.expectedBehavior.length).toBeGreaterThan(10);
    }
  });

  it("seed corpus is deterministic", () => {
    expect(buildSeedCorpus()).toEqual(buildSeedCorpus());
  });

  it("generates deterministic variants that still validate", () => {
    const corpus = generateCorpus({ variantsPerSeed: 2 });
    expect(corpus.length).toBe(buildSeedCorpus().length * 3);
    expect(generateCorpus({ variantsPerSeed: 2 })).toEqual(corpus);
    expect(TestCorpusSchema.safeParse({ version: "1", cases: corpus }).success).toBe(true);
    const ids = new Set(corpus.map((c) => c.id));
    expect(ids.size).toBe(corpus.length);
  });

  it("exposes the taxonomy for the ADK planner prompt", () => {
    const section = taxonomyPromptSection();
    for (const entry of TAXONOMY) expect(section).toContain(entry.mode);
  });
});
