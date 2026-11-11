import { describe, expect, it } from "vitest";
import { escapeHtml, renderHtml, renderMarkdown, safeHref } from "../report/render.js";
import { runAudit } from "../worker/audit-run.js";

/** Report safety: escaping, scheme allowlist, zero scripts/requests. */
describe("report renderer", () => {
  it("escapes hostile bot text", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  });

  it("allows http(s) and relative links, blocks the rest", () => {
    expect(safeHref("https://example.com/r")).toBe("https://example.com/r");
    expect(safeHref("/reports/abc")).toBe("/reports/abc");
    expect(safeHref("javascript:alert(1)")).toBe("#");
    expect(safeHref("data:text/html,<h1>x</h1>")).toBe("#");
  });

  it("renders a self-contained report with no scripts or external requests", async () => {
    const result = await runAudit({ botName: "flawed", runId: "report-test", writeArtifacts: false, outDir: "" });
    const html = renderHtml(result);
    expect(html).not.toContain("<script");
    expect(html).not.toContain("src=");
    expect(html).not.toMatch(/href="http/);
    expect(html).toContain("Human review needed");
    expect(html).toContain(result.runId);
    for (const record of result.records) {
      if (record.verdict.verdict === "fail") expect(html).toContain(record.caseId);
    }
  });

  it("sanitizes hostile content inside a full report", async () => {
    const result = await runAudit({ botName: "flawed", runId: "xss-test", writeArtifacts: false, outDir: "" });
    result.records[0]!.botResponse = '<script>alert("pwn")</script>';
    result.records[0]!.verdict.quotes = ['<img src=x onerror=alert(1)>'];
    const html = renderHtml(result, { reportLinks: [{ label: "evil", href: "javascript:alert(1)" }] });
    expect(html).not.toContain("<script>alert");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders a markdown report with source quotes", async () => {
    const result = await runAudit({ botName: "flawed", runId: "md-test", writeArtifacts: false, outDir: "" });
    const md = renderMarkdown(result);
    expect(md).toContain("# HelplineCheck report");
    expect(md).toContain("Human review needed");
    const failing = result.records.find((r) => r.verdict.quotes.length > 0)!;
    expect(md).toContain(failing.verdict.quotes[0] as string);
  });
});
