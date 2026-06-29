// Fetch real Lighthouse scores from Google PageSpeed Insights.
// Works without a key (heavily rate-limited); set PAGESPEED_API_KEY for
// reliable use.
const ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export interface Scores {
  performance: number;
  seo: number;
  accessibility: number;
  bestPractices: number;
}

export async function fetchScores(
  url: string,
  strategy: "mobile" | "desktop" = "mobile"
): Promise<Scores> {
  const params = new URLSearchParams({ url, strategy });
  if (process.env.PAGESPEED_API_KEY) params.set("key", process.env.PAGESPEED_API_KEY);
  for (const c of ["performance", "seo", "accessibility", "best-practices"]) {
    params.append("category", c);
  }

  const res = await fetch(`${ENDPOINT}?${params.toString()}`);
  if (!res.ok) throw new Error(`PageSpeed ${res.status}`);
  const data = await res.json();
  const cats = data?.lighthouseResult?.categories ?? {};
  const toScore = (s: number | null | undefined) => (s == null ? 0 : Math.round(s * 100));
  return {
    performance: toScore(cats.performance?.score),
    seo: toScore(cats.seo?.score),
    accessibility: toScore(cats.accessibility?.score),
    bestPractices: toScore(cats["best-practices"]?.score),
  };
}
