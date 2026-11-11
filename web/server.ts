import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { AuditRequestSchema } from "../planner/schema.js";
import { renderHtml, renderMarkdown } from "../report/render.js";
import { runAudit, type AuditResult } from "../worker/audit-run.js";

const LANDING = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>HelplineCheck — safety audits for helpline bots</title>
<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:3rem auto;padding:0 1rem;line-height:1.6}</style>
</head>
<body>
<h1>HelplineCheck</h1>
<p>HelplineCheck audits <strong>your own organization's</strong> helpline bot for known safety failures — harmful advice, unlawful statements, and missing crisis resources — and produces a shareable report your team can act on.</p>
<p><strong>Opt-in only:</strong> run audits solely against bots your organization owns and has explicitly approved for testing. Never point HelplineCheck at someone else's service.</p>
<h2>Try the demo</h2>
<pre>curl -X POST localhost:8080/api/audits -H 'content-type: application/json' -d '{"bot":"flawed"}'</pre>
<p>Then open the returned <code>reportUrl</code>. Compare <code>flawed</code> vs <code>fixed</code> to see the before/after delta.</p>
<h2>How it works</h2>
<ul>
<li>Adversarial test cases grounded in public harm cases (NEDA Tessa, NYC MyCity bot).</li>
<li>Parallel audit runs; Gemma judge with Gemini fallback; every verdict carries its source.</li>
<li>Contested or severe verdicts wait for human review before publication.</li>
</ul>
</body>
</html>`;

function send(res: ServerResponse, status: number, body: string, contentType: string): void {
  res.writeHead(status, { "content-type": contentType, "content-length": Buffer.byteLength(body) });
  res.end(body);
}

const json = (res: ServerResponse, status: number, value: unknown): void =>
  send(res, status, JSON.stringify(value), "application/json");

async function readBody(req: IncomingMessage, limit = 1_000_000): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string);
    size += buf.length;
    if (size > limit) throw new Error("body too large");
    chunks.push(buf);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export interface WebOptions {
  /** In-memory run store (Firestore in cloud; see infra/). */
  runs?: Map<string, AuditResult>;
  writeArtifacts?: boolean;
}

/**
 * Scale-to-zero web service (plan I8): audit API plus report serving.
 * Local demo runs the audit inline; the cloud path enqueues Pub/Sub and the
 * Cloud Run Job (infra/cloudrun-job-audit.yaml) performs the audit.
 */
export function createApp(options: WebOptions = {}): Server {
  const runs = options.runs ?? new Map<string, AuditResult>();

  return createServer((req, res) => {
    void handle(req, res).catch((err: unknown) => {
      console.error("request failed", err);
      if (!res.headersSent) json(res, 500, { error: "internal error" });
    });
  });

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? "/", "http://localhost");
    const { pathname } = url;

    if (req.method === "GET" && pathname === "/") {
      send(res, 200, LANDING, "text/html; charset=utf-8");
      return;
    }
    if (req.method === "GET" && pathname === "/healthz") {
      json(res, 200, { ok: true });
      return;
    }
    if (req.method === "POST" && pathname === "/api/audits") {
      let raw: string;
      try {
        raw = await readBody(req);
      } catch {
        json(res, 413, { error: "body too large" });
        return;
      }
      let parsed: unknown;
      try {
        parsed = raw.length === 0 ? {} : (JSON.parse(raw) as unknown);
      } catch {
        json(res, 400, { error: "invalid JSON" });
        return;
      }
      const input = AuditRequestSchema.safeParse(parsed);
      if (!input.success) {
        json(res, 400, { error: "invalid audit request", issues: input.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) });
        return;
      }
      const result = await runAudit({
        botName: input.data.bot,
        cases: input.data.cases,
        concurrency: input.data.concurrency,
        writeArtifacts: options.writeArtifacts,
      });
      runs.set(result.runId, result);
      json(res, 201, {
        runId: result.runId,
        summary: result.summary,
        reportUrl: `/reports/${result.runId}`,
      });
      return;
    }

    const auditMatch = /^\/api\/audits\/([A-Za-z0-9._-]+)$/.exec(pathname);
    if (req.method === "GET" && auditMatch) {
      const result = runs.get(auditMatch[1] as string);
      if (!result) {
        json(res, 404, { error: "unknown run" });
        return;
      }
      json(res, 200, { runId: result.runId, summary: result.summary });
      return;
    }

    // Markdown route first: the HTML pattern would otherwise swallow the ".md" suffix.
    const mdMatch = /^\/reports\/([A-Za-z0-9._-]+)\.md$/.exec(pathname);
    if (req.method === "GET" && mdMatch) {
      const result = runs.get(mdMatch[1] as string);
      if (!result) {
        json(res, 404, { error: "unknown run" });
        return;
      }
      send(res, 200, renderMarkdown(result), "text/markdown; charset=utf-8");
      return;
    }

    const htmlMatch = /^\/reports\/([A-Za-z0-9._-]+)$/.exec(pathname);
    if (req.method === "GET" && htmlMatch) {
      const result = runs.get(htmlMatch[1] as string);
      if (!result) {
        json(res, 404, { error: "unknown run" });
        return;
      }
      send(res, 200, renderHtml(result), "text/html; charset=utf-8");
      return;
    }

    json(res, 404, { error: "not found" });
  }
}

export function start(port: number, options: WebOptions = {}): Server {
  const server = createApp(options);
  server.listen(port, () => {
    console.log(`helplinecheck web listening on :${port}`);
  });
  return server;
}
