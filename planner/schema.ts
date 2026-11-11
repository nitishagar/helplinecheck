import { z } from "zod";

/**
 * Shared contract vocabulary for HelplineCheck wire schemas.
 * Mirrors the ADK planner `output_schema` 1:1 (see planner/generator.ts).
 * Pattern: strict per-tool input schemas with shared enums (lumen schemas.ts).
 */

export const FAILURE_MODES = [
  "WEIGHT_LOSS_ADVICE",
  "DISORDERED_EATING",
  "UNLAWFUL_ADVICE",
  "MEDICAL_DIAGNOSIS",
  "SELF_HARM_UNSAFE",
  "CRISIS_RESOURCES",
  "SAFE_HELPLINE",
] as const;
export type FailureMode = (typeof FAILURE_MODES)[number];

export const EXPECTED = ["pass", "fail"] as const;
export type Expected = (typeof EXPECTED)[number];

export const SEVERITY = ["low", "medium", "high", "critical"] as const;
export type Severity = (typeof SEVERITY)[number];

export const VERDICTS = ["pass", "fail", "contested"] as const;
export type VerdictKind = (typeof VERDICTS)[number];

export const JUDGE_SOURCES = ["local-judge", "gemma", "gemini-fallback", "human"] as const;
export type JudgeSource = (typeof JUDGE_SOURCES)[number];

export const BOTS = ["flawed", "fixed"] as const;
export type BotName = (typeof BOTS)[number];

export const TestCaseSchema = z.strictObject({
  id: z.string().min(1).max(120),
  category: z.enum(FAILURE_MODES),
  prompt: z.string().min(1).max(4000),
  expected: z.enum(EXPECTED),
  /** Human-readable reason for the expectation; ground truth lives here, not in the judge. */
  rationale: z.string().min(1).max(2000),
  severity: z.enum(SEVERITY).default("medium"),
});
export type TestCase = z.infer<typeof TestCaseSchema>;

export const TestCorpusSchema = z.strictObject({
  version: z.literal("1"),
  cases: z.array(TestCaseSchema).min(1).max(500),
});
export type TestCorpus = z.infer<typeof TestCorpusSchema>;

export const AuditRequestSchema = z.strictObject({
  bot: z.enum(BOTS),
  cases: z.array(TestCaseSchema).min(1).max(500).optional(),
  concurrency: z.number().int().min(1).max(32).default(8),
});
export type AuditRequest = z.infer<typeof AuditRequestSchema>;

export const VerdictSchema = z.strictObject({
  caseId: z.string().min(1),
  verdict: z.enum(VERDICTS),
  severity: z.enum(SEVERITY),
  /** Short judge rationale; must reference the quoted bot text. */
  rationale: z.string().min(1).max(2000),
  /** Exact quotes from the bot response supporting the verdict (max 5). */
  quotes: z.array(z.string().min(1).max(2000)).max(5),
  source: z.enum(JUDGE_SOURCES),
});
export type Verdict = z.infer<typeof VerdictSchema>;

export const AuditRecordSchema = z.strictObject({
  runId: z.string().min(1),
  caseId: z.string().min(1),
  category: z.enum(FAILURE_MODES),
  prompt: z.string().min(1),
  botResponse: z.string().min(1),
  expected: z.enum(EXPECTED),
  verdict: VerdictSchema,
  needsHumanReview: z.boolean(),
});
export type AuditRecord = z.infer<typeof AuditRecordSchema>;
