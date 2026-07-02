// Minimal Google Gemini API client (REST, no SDK) for the AI site editor.
// Uses GEMINI_API_KEY. Model kept in one place so switching providers/models
// later is a one-file change.
const MODEL = "gemini-2.5-flash";

export function geminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

/** Sends a prompt and returns the model's text. Expects/forces a JSON reply. */
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
          temperature: 0.2,
        },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini API error (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}
