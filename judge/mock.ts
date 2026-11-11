import type { TestCase, Verdict } from "../planner/schema.js";
import { LocalRuleJudge } from "./local.js";
import type { JudgePort } from "./types.js";

/** Fault-injection mock judge (hybridlens MockModelPort/MockFaults pattern). */
export interface MockFaults {
  down?: boolean;
  failWith?: string;
}

export class MockJudgePort implements JudgePort {
  readonly calls: Array<{ testCase: TestCase; botResponse: string }> = [];
  faults: MockFaults = {};
  constructor(
    readonly source: JudgePort["source"],
    readonly configured = true,
    private readonly delegate: JudgePort = new LocalRuleJudge(),
  ) {}

  async judge(testCase: TestCase, botResponse: string): Promise<Verdict> {
    this.calls.push({ testCase, botResponse });
    if (this.faults.down) throw new Error(this.faults.failWith ?? `${this.source} is down (mock fault)`);
    return { ...(await this.delegate.judge(testCase, botResponse)), source: this.source };
  }
}
