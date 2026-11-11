import { mkdtempSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderHtml } from "../report/render.js";
import { runAudit } from "../worker/audit-run.js";

/** Local end-to-end: audit → artifacts → report, no network, no credentials. */
describe("local e2e", () => {
  it("runs an audit, writes artifacts, and renders a report", async () => {
    const outDir = join(mkdtempSync(join(tmpdir(), "hlc-")), "run-e2e");
    const result = await runAudit({ botName: "flawed", runId: "run-e2e", outDir });
    expect(existsSync(join(outDir, "records.json"))).toBe(true);
    expect(existsSync(join(outDir, "summary.json"))).toBe(true);
    const summary = JSON.parse(readFileSync(join(outDir, "summary.json"), "utf8")) as { fail: number };
    expect(summary.fail).toBeGreaterThan(0);
    const html = renderHtml(result);
    expect(html).toContain("run-e2e");
    expect(html).not.toContain("<script");
  });
});
