import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { createApp } from "../web/server.js";

describe("web service", () => {
  const servers: Server[] = [];
  afterEach(async () => {
    for (const s of servers.splice(0)) {
      await new Promise<void>((resolve, reject) => s.close((e) => (e ? reject(e) : resolve())));
    }
  });

  async function listen(): Promise<string> {
    const server = createApp({ writeArtifacts: false });
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  }

  it("serves the landing page with opt-in copy", async () => {
    const base = await listen();
    const res = await fetch(`${base}/`);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("Opt-in only");
  });

  it("runs an audit end to end and serves HTML + markdown reports", async () => {
    const base = await listen();
    const created = await fetch(`${base}/api/audits`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ bot: "flawed" }),
    });
    expect(created.status).toBe(201);
    const payload = (await created.json()) as { runId: string; reportUrl: string; summary: { fail: number } };
    expect(payload.summary.fail).toBeGreaterThan(0);

    const status = await fetch(`${base}/api/audits/${payload.runId}`);
    expect(status.status).toBe(200);

    const html = await fetch(`${base}${payload.reportUrl}`);
    expect(html.status).toBe(200);
    expect(await html.text()).toContain("HelplineCheck report");

    const md = await fetch(`${base}${payload.reportUrl}.md`);
    expect(md.status).toBe(200);
    expect(await md.text()).toContain("# HelplineCheck report");
  });

  it("rejects invalid audit requests with 400 (safeParse early return)", async () => {
    const base = await listen();
    for (const body of ['{"bot":"evil"}', '{"bot":"flawed","evilParam":1}', "not json"]) {
      const res = await fetch(`${base}/api/audits`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });
      expect(res.status).toBe(400);
    }
  });

  it("returns 404 for unknown runs and routes", async () => {
    const base = await listen();
    expect((await fetch(`${base}/api/audits/nope`)).status).toBe(404);
    expect((await fetch(`${base}/reports/nope`)).status).toBe(404);
    expect((await fetch(`${base}/nope`)).status).toBe(404);
  });
});
