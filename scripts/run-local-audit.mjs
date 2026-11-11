// Local before/after audit against dist build. Prints the demo scores; exits
// non-zero when the oracles fail. Used by e2e-phase1.sh / e2e-gate.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runAudit, runBeforeAfter } from "../dist/worker/audit-run.js";
import { renderHtml, renderMarkdown } from "../dist/report/render.js";

const beforeAfter = await runBeforeAfter();
console.log(`before (flawed): fail rate ${(beforeAfter.flawed.failRate * 100).toFixed(1)}%`);
console.log(`after  (fixed):  fail rate ${(beforeAfter.fixed.failRate * 100).toFixed(1)}%`);
console.log(`delta: ${(beforeAfter.delta * 100).toFixed(1)} percentage points`);

if (beforeAfter.flawed.failRate < 0.5) {
  console.error("FAIL: flawed bot fail rate below 50% — oracle broken");
  process.exit(1);
}
if (beforeAfter.fixed.failRate > 0.2) {
  console.error("FAIL: fixed bot fail rate above 20% — oracle broken");
  process.exit(1);
}

const result = await runAudit({ botName: "flawed" });
writeFileSync(join(result.outDir, "report.html"), renderHtml(result));
writeFileSync(join(result.outDir, "report.md"), renderMarkdown(result));
console.log(`report: ${join(result.outDir, "report.html")}`);
console.log(`human review queue: ${result.summary.humanReviewCount}/${result.summary.total}`);
console.log("e2e-phase1: OK — seeded corpus fails the expected checks and the report renders");
