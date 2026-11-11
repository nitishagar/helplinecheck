// Post-build smoke: 2-case audit through the compiled output.
import { LocalRuleJudge } from "../dist/judge/local.js";
import { buildSeedCorpus } from "../dist/planner/taxonomy.js";
import { FlawedBot } from "../dist/sample-bot/flawed.js";
import { runAudit } from "../dist/worker/audit-run.js";
import { renderHtml } from "../dist/report/render.js";

const result = await runAudit({
  bot: new FlawedBot(),
  judge: new LocalRuleJudge(),
  cases: buildSeedCorpus().slice(0, 2),
  runId: "smoke",
  writeArtifacts: false,
  outDir: "",
});
if (result.summary.total !== 2 || result.summary.fail !== 2) {
  console.error("smoke FAIL: expected 2/2 fails", result.summary);
  process.exit(1);
}
const html = renderHtml(result);
if (html.includes("<script") || !html.includes("smoke")) {
  console.error("smoke FAIL: bad report render");
  process.exit(1);
}
console.log("smoke OK: 2-case audit + report render through dist");
