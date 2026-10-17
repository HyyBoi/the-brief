// One door to every model. Free tiers only:
//   1. Gemini Flash (Google AI Studio free tier)
//   2. Groq (gpt-oss-120b free tier) — automatic fallback on rate limits / errors
// Every response is JSON, validated with Zod. If validation fails we try the next provider.
import { z } from "zod";
import { fit } from "./vec";

type Provider = { name: string; baseURL: string; key?: string; model: string };

function providers(): Provider[] {
  return [
    {
      name: "gemini",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
      key: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || "gemini-flash-latest",
    },
    {
      name: "groq",
      baseURL: "https://api.groq.com/openai/v1",
      key: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
    },
  ].filter((p) => !!p.key);
}

function extractJSON(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.search(/[[{]/);
  const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (start === -1 || end === -1) throw new Error("no JSON in response");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function callOnce(p: Provider, system: string, user: string, json: boolean, maxTokens: number) {
  const res = await fetch(`${p.baseURL}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${p.key}` },
    body: JSON.stringify({
      model: p.model,
      temperature: 0.4,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(`${p.name} ${res.status}: ${body.slice(0, 200)}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${p.name}: empty response`);
  return content;
}

export async function chatJSON<T>(
  system: string,
  user: string,
  schema: z.ZodType<T>,
  opts: { maxTokens?: number } = {},
): Promise<T> {
  const list = providers();
  if (!list.length) throw new Error("No AI key set. Add GEMINI_API_KEY or GROQ_API_KEY to .env.local");
  const sys = `${system}\n\nRespond with a single valid JSON object and nothing else.`;
  const errors: string[] = [];

  for (const p of list) {
    for (const json of [true, false]) {
      try {
        const text = await callOnce(p, sys, user, json, opts.maxTokens ?? 4000);
        const parsed = schema.safeParse(extractJSON(text));
        if (parsed.success) return parsed.data;
        errors.push(`${p.name}: schema mismatch`);
        break; // model answered but wrong shape → next provider
      } catch (e) {
        const err = e as Error & { status?: number };
        errors.push(err.message);
        // 400 might be "response_format unsupported" → retry once without it
        if (err.status === 400 && json) continue;
        break; // rate limit / 5xx / timeout → next provider
      }
    }
  }
  throw new Error(`All AI providers failed:\n${errors.join("\n")}`);
}

// ── Embeddings: Gemini embedding model (free tier), 768 dims ──────────────────
export async function embed(texts: string[]): Promise<(number[] | null)[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key || !texts.length) return texts.map(() => null);
  const model = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents?key=${key}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requests: texts.map((t) => ({
            model: `models/${model}`,
            content: { parts: [{ text: t.slice(0, 2000) }] },
            taskType: "SEMANTIC_SIMILARITY",
            outputDimensionality: 768,
          })),
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (!res.ok) throw new Error(`embed ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as { embeddings?: { values: number[] }[] };
    return texts.map((_, i) => {
      const v = data.embeddings?.[i]?.values;
      return v?.length ? fit(v) : null;
    });
  } catch (e) {
    console.warn("[embed] failed, continuing without vectors:", (e as Error).message);
    return texts.map(() => null);
  }
}
