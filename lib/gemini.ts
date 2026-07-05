// Minimal Google Gemini API client (REST, no SDK) for the AI site editor.
// Model kept in one place so switching providers/models later is a one-file
// change. `responseSchema` (not just responseMimeType) constrains generation
// to the exact edits shape server-side — the actual fix for malformed JSON,
// not just switching providers. Truncation (hitting maxOutputTokens) can
// still cut a response mid-object; the caller salvages what it can from that.
const MODEL = "gemini-2.5-flash";
const MAX_OUTPUT_TOKENS = 65536;

export function geminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

/** 429 with Google's suggested retry delay parsed from the error body. */
export class GeminiRateLimitError extends Error {
  retryAfterMs: number;
  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = "GeminiRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

const EDITS_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    edits: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          file: { type: "STRING" },
          find: { type: "STRING" },
          replace: { type: "STRING" },
        },
        required: ["file", "find", "replace"],
      },
    },
    summary: { type: "STRING" },
  },
  required: ["edits", "summary"],
};

/** Sends a prompt and returns the model's raw text (schema-constrained JSON). */
export async function geminiJson(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: EDITS_RESPONSE_SCHEMA,
          temperature: 0.2,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
        },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 429) {
      // Google's RetryInfo carries the wait it wants: "retryDelay": "22s"
      const m = body.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
      const retryAfterMs = m ? Math.ceil(parseFloat(m[1]) * 1000) : 30_000;
      throw new GeminiRateLimitError(
        `Gemini rate limit (429), retry in ~${Math.round(retryAfterMs / 1000)}s`,
        retryAfterMs
      );
    }
    throw new Error(`Gemini API error (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  if (!text) {
    const finish = data.candidates?.[0]?.finishReason;
    throw new Error(finish ? `Gemini returned no content (${finish})` : "Gemini returned an empty response");
  }
  return text;
}
