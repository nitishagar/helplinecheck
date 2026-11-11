import { VerdictSchema, type Severity, type TestCase, type Verdict, type VerdictKind } from "../planner/schema.js";
import { JUDGE_SYSTEM_PROMPT, judgeUserPrompt } from "./prompts.js";
import { JudgeUnavailable, type JudgePort } from "./types.js";

async function postJson(url: string, body: unknown, timeoutMs: number, headers: Record<string, string> = {}): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new JudgeUnavailable(`judge endpoint HTTP ${res.status}`);
    return (await res.json()) as unknown;
  } catch (err) {
    if (err instanceof JudgeUnavailable) throw err;
    throw new JudgeUnavailable(err instanceof Error ? err.message : String(err));
  } finally {
    clearTimeout(timer);
  }
}

function toVerdict(caseId: string, severity: Severity, raw: string): Verdict {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new JudgeUnavailable("judge returned non-JSON");
  }
  const verdict = VerdictSchema.safeParse({ ...(parsed as Record<string, unknown>), caseId, source: "gemma" });
  if (!verdict.success) {
    // Lenient fallback: accept a bare {verdict, rationale} shape and normalize it.
    const loose = parsed as { verdict?: unknown; rationale?: unknown; quotes?: unknown; severity?: unknown };
    const kind: VerdictKind = loose.verdict === "pass" || loose.verdict === "fail" || loose.verdict === "contested"
      ? loose.verdict
      : "contested";
    return {
      caseId,
      verdict: kind,
      severity,
      rationale: typeof loose.rationale === "string" && loose.rationale.length > 0
        ? loose.rationale.slice(0, 2000)
        : "Judge returned an under-specified verdict; routed for human review.",
      quotes: Array.isArray(loose.quotes) ? loose.quotes.filter((q): q is string => typeof q === "string").slice(0, 5) : [],
      source: "gemma",
    };
  }
  return verdict.data;
}

/**
 * Gemma judge served on a Cloud Run L4 GPU service (Ollama `/api/generate`).
 * Sized for Gemma 3 4B (E4B) in the L4 24GB config (plan Q2); larger models
 * need quantization — see infra/cloudrun-service-judge.yaml.
 */
export class GemmaJudge implements JudgePort {
  readonly source = "gemma" as const;
  readonly configured: boolean;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.baseUrl = (env["JUDGE_URL"] ?? "").replace(/\/+$/, "");
    this.model = env["JUDGE_MODEL"] ?? "gemma3:4b";
    this.timeoutMs = Number(env["JUDGE_TIMEOUT_MS"] ?? "120000");
    this.configured = this.baseUrl.length > 0;
  }

  async judge(testCase: TestCase, botResponse: string): Promise<Verdict> {
    if (!this.configured) throw new JudgeUnavailable("JUDGE_URL not set");
    const body = {
      model: this.model,
      stream: false,
      format: "json",
      system: JUDGE_SYSTEM_PROMPT,
      prompt: judgeUserPrompt(testCase, botResponse),
    };
    const data = (await postJson(`${this.baseUrl}/api/generate`, body, this.timeoutMs)) as { response?: unknown };
    if (typeof data.response !== "string") throw new JudgeUnavailable("judge returned no response text");
    return { ...toVerdict(testCase.id, testCase.severity, data.response), source: this.source };
  }
}

/**
 * Gemini fallback: Developer API (AI Studio key) by default, Vertex AI when
 * GOOGLE_GENAI_USE_VERTEXAI=true (enterprise path: aiplatform host + token).
 */
export class GeminiJudge implements JudgePort {
  readonly source = "gemini-fallback" as const;
  readonly configured: boolean;
  private readonly url: string;
  private readonly headers: Record<string, string>;
  private readonly timeoutMs: number;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.timeoutMs = Number(env["GEMINI_TIMEOUT_MS"] ?? "60000");
    const model = env["GEMINI_MODEL"] ?? "gemini-2.5-flash";
    if ((env["GOOGLE_GENAI_USE_VERTEXAI"] ?? "").toLowerCase() === "true") {
      const project = env["GCP_PROJECT"] ?? "";
      const location = env["GCP_LOCATION"] ?? "us-central1";
      const token = env["GOOGLE_ACCESS_TOKEN"] ?? "";
      this.configured = project.length > 0 && token.length > 0;
      this.url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;
      this.headers = { authorization: `Bearer ${token}` };
    } else {
      const key = env["GEMINI_API_KEY"] ?? "";
      this.configured = key.length > 0;
      this.url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
      this.headers = {};
    }
  }

  async judge(testCase: TestCase, botResponse: string): Promise<Verdict> {
    if (!this.configured) throw new JudgeUnavailable("Gemini credentials not set");
    const body = {
      systemInstruction: { parts: [{ text: JUDGE_SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: judgeUserPrompt(testCase, botResponse) }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0 },
    };
    const data = (await postJson(this.url, body, this.timeoutMs, this.headers)) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") throw new JudgeUnavailable("Gemini returned no text");
    return { ...toVerdict(testCase.id, testCase.severity, text), source: this.source };
  }
}
