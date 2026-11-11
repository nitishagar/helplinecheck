import type { FailureMode, JudgeSource, Severity, TestCase, Verdict } from "../planner/schema.js";

export interface JudgePort {
  readonly source: JudgeSource;
  /** False when the judge is not configured (e.g. no URL/key); routing skips it. */
  readonly configured: boolean;
  judge(testCase: TestCase, botResponse: string): Promise<Verdict>;
}

export class JudgeUnavailable extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JudgeUnavailable";
  }
}

/** Contested or high/critical fails need a human before publication (plan I7). */
export function needsHumanReview(verdict: Verdict): boolean {
  if (verdict.verdict === "contested") return true;
  return verdict.verdict === "fail" && (verdict.severity === "high" || verdict.severity === "critical");
}

export const JUDGE_MODES = ["prefer-local", "prefer-gemma", "local-only", "gemma-only"] as const;
export type JudgeMode = (typeof JUDGE_MODES)[number];

export interface RoutingOptions {
  mode?: JudgeMode;
  local: JudgePort;
  gemma: JudgePort;
  gemini: JudgePort;
}

function chainFor(mode: JudgeMode, ports: RoutingOptions): JudgePort[] {
  switch (mode) {
    case "local-only":
      return [ports.local];
    case "gemma-only":
      return [ports.gemma];
    case "prefer-gemma":
      return [ports.gemma, ports.gemini, ports.local];
    case "prefer-local":
    default:
      return [ports.local, ports.gemma, ports.gemini];
  }
}

/**
 * Judge with fallback across the ordered chain (hybridlens routing pattern).
 * Skips unconfigured ports; the winning port's source becomes the verdict badge.
 * `local-only` / `gemma-only` throw JudgeUnavailable instead of falling back.
 */
export async function judgeWithRouting(
  testCase: TestCase,
  botResponse: string,
  opts: RoutingOptions,
): Promise<Verdict> {
  const mode = opts.mode ?? "prefer-local";
  const chain = chainFor(mode, opts).filter((p) => p.configured);
  const errors: string[] = [];
  for (const port of chain) {
    try {
      const verdict = await port.judge(testCase, botResponse);
      return { ...verdict, source: port.source };
    } catch (err) {
      errors.push(`${port.source}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new JudgeUnavailable(
    chain.length === 0 ? `no judge configured for mode ${mode}` : `all judges failed (${errors.join("; ")})`,
  );
}

export interface ModeResolution {
  mode: JudgeMode;
  fromEnv: boolean;
}

export function resolveJudgeMode(env: NodeJS.ProcessEnv = process.env): ModeResolution {
  const raw = (env["JUDGE_MODE"] ?? "").trim();
  if ((JUDGE_MODES as readonly string[]).includes(raw)) return { mode: raw as JudgeMode, fromEnv: true };
  return { mode: "prefer-local", fromEnv: false };
}

export type { FailureMode, JudgeSource, Severity, TestCase, Verdict };
