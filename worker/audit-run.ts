import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AuditRecord, TestCase } from "../planner/schema.js";
import { buildSeedCorpus } from "../planner/taxonomy.js";
import { LocalRuleJudge, needsHumanReview, resolveJudgeMode, type JudgePort, type Verdict } from "../judge/index.js";
import { FixedBot, FlawedBot, type BotPort } from "../sample-bot/index.js";
import type { BotName } from "../planner/schema.js";

export interface AuditSummary {
  runId: string;
  bot: string;
  total: number;
  pass: number;
  fail: number;
  contested: number;
  failRate: number;
  humanReviewCount: number;
  sources: Record<string, number>;
}

export interface AuditResult {
  runId: string;
  bot: string;
  summary: AuditSummary;
  records: AuditRecord[];
  outDir: string;
}

export interface AuditOptions {
  runId?: string;
  cases?: TestCase[];
  bot?: BotPort;
  botName?: BotName;
  judge?: JudgePort;
  judgeWithFallback?: (testCase: TestCase, botResponse: string) => Promise<Verdict>;
  concurrency?: number;
  /** Local artifact dir. In cloud, records also go to Firestore and GCS (see infra/). */
  outDir?: string;
  writeArtifacts?: boolean;
}

export function botFor(name: BotName): BotPort {
  return name === "fixed" ? new FixedBot() : new FlawedBot();
}

/** Bounded parallel pool over cases (the local shape of the Cloud Run Job fan-out). */
async function runPool<T, R>(items: T[], concurrency: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = new Array(Math.min(concurrency, items.length)).fill(null).map(async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index] as T, index);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Run one audit: every case against the bot, judged, summarized, persisted. */
export async function runAudit(options: AuditOptions = {}): Promise<AuditResult> {
  const runId = options.runId ?? `run-${new Date().toISOString().slice(0, 10)}-${randomUUID().slice(0, 8)}`;
  const cases = options.cases ?? buildSeedCorpus();
  const bot = options.bot ?? botFor(options.botName ?? "flawed");
  const judge = options.judge ?? new LocalRuleJudge();
  const decide = options.judgeWithFallback ?? ((c, r) => judge.judge(c, r));
  const concurrency = Math.min(Math.max(options.concurrency ?? 8, 1), 32);

  const records = await runPool(cases, concurrency, async (testCase) => {
    const botResponse = await bot.respond(testCase.prompt);
    let verdict: Verdict;
    try {
      verdict = await decide(testCase, botResponse);
    } catch {
      verdict = {
        caseId: testCase.id,
        verdict: "contested",
        severity: testCase.severity,
        rationale: "Judge errored on this case; routed for human review.",
        quotes: [],
        source: "local-judge",
      };
    }
    const record: AuditRecord = {
      runId,
      caseId: testCase.id,
      category: testCase.category,
      prompt: testCase.prompt,
      botResponse,
      expected: testCase.expected,
      verdict,
      needsHumanReview: needsHumanReview(verdict),
    };
    return record;
  });

  const summary: AuditSummary = {
    runId,
    bot: bot.name,
    total: records.length,
    pass: records.filter((r) => r.verdict.verdict === "pass").length,
    fail: records.filter((r) => r.verdict.verdict === "fail").length,
    contested: records.filter((r) => r.verdict.verdict === "contested").length,
    failRate: records.length === 0 ? 0 : records.filter((r) => r.verdict.verdict === "fail").length / records.length,
    humanReviewCount: records.filter((r) => r.needsHumanReview).length,
    sources: {},
  };
  for (const r of records) summary.sources[r.verdict.source] = (summary.sources[r.verdict.source] ?? 0) + 1;

  const outDir = options.outDir ?? join(process.cwd(), "out", runId);
  if (options.writeArtifacts !== false) {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "records.json"), JSON.stringify(records, null, 2));
    writeFileSync(join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
  }
  return { runId, bot: bot.name, summary, records, outDir };
}

export interface BeforeAfter {
  flawed: AuditSummary;
  fixed: AuditSummary;
  /** The demo number: how much the fail-rate drops after fixing the bot. */
  delta: number;
}

/** Before/after demo: same corpus against the flawed and fixed fixtures. */
export async function runBeforeAfter(options: Omit<AuditOptions, "bot" | "botName" | "runId" | "outDir"> = {}): Promise<BeforeAfter> {
  const cases = options.cases ?? buildSeedCorpus();
  const flawed = await runAudit({ ...options, cases, botName: "flawed", writeArtifacts: false, outDir: "" });
  const fixed = await runAudit({ ...options, cases, botName: "fixed", writeArtifacts: false, outDir: "" });
  return { flawed: flawed.summary, fixed: fixed.summary, delta: flawed.summary.failRate - fixed.summary.failRate };
}

/** Entry point for the Cloud Run Job container (infra/cloudrun-job-audit.yaml). */
export async function main(): Promise<void> {
  const botName = (process.env["AUDIT_BOT"] === "fixed" ? "fixed" : "flawed") as BotName;
  const { mode } = resolveJudgeMode();
  const { GemmaJudge, GeminiJudge, judgeWithRouting } = await import("../judge/index.js");
  const result = await runAudit({
    botName,
    concurrency: Number(process.env["AUDIT_CONCURRENCY"] ?? "8"),
    judgeWithFallback: (c, r) =>
      judgeWithRouting(c, r, { mode, local: new LocalRuleJudge(), gemma: new GemmaJudge(), gemini: new GeminiJudge() }),
  });
  console.log(JSON.stringify({ runId: result.runId, summary: result.summary }));
}
