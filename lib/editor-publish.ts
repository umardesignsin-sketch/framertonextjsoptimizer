// Visual editor publish pipeline.
//
// Model: themeRef always points at the ORIGINAL converted bundle; the site's
// draftEdits holds the FULL current edit set. Publish = apply(original, edits)
// → redeploy to the saved deploy target. Deterministic, no version drift: the
// editor renders original + draft overlaid, and publish reproduces exactly
// that. Edits survive Framer's hydration via the injected override runtime.
import type { ConvertReport } from "./types";
import { editorOverrides, injectOverrides, type EditorEdit } from "./overrides";
import { getJob } from "./store";
import { db } from "./db";
import { decryptSecret, encryptionConfigured } from "./crypto";
import { redeployNetlify, redeployVercel } from "./deploy";

const NEXTJS_HTML_RE = /const HTML = ("(?:[^"\\]|\\.)*");/;

/** Returns a NEW report with the editor overrides injected into every page. */
export function applyEditsToReport(report: ConvertReport, edits: EditorEdit[]): ConvertReport {
  const overrides = editorOverrides(edits);
  if (overrides.length === 0) return report;

  const files = report.files.map((f) => {
    if (!f.content) return f;
    if (f.path.endsWith(".html")) {
      return { ...f, content: injectOverrides(f.content, overrides) };
    }
    if (f.path.endsWith("route.ts")) {
      // pure-Next.js export: page HTML is embedded as a JSON string literal.
      const m = f.content.match(NEXTJS_HTML_RE);
      if (m) {
        try {
          const html = JSON.parse(m[1]) as string;
          const edited = injectOverrides(html, overrides);
          return {
            ...f,
            content: f.content.replace(NEXTJS_HTML_RE, `const HTML = ${JSON.stringify(edited)};`),
          };
        } catch {
          return f;
        }
      }
    }
    return f;
  });

  return { ...report, files };
}

export interface PublishResult {
  deployedUrl: string;
  provider: string;
  edits: number;
}

/** Applies the site's draft edits to its bundle and redeploys them live. */
export async function publishSite(siteId: string, ownerId: string): Promise<PublishResult> {
  const site = await db.site.findFirst({
    where: { id: siteId, ownerId },
    include: { deployments: { orderBy: { createdAt: "desc" } } },
  });
  if (!site) throw new Error("Site not found");
  if (!site.themeRef) throw new Error("This site has no bundle to publish");

  const edits = (site.draftEdits as EditorEdit[] | null) || [];
  if (!edits.length) throw new Error("No changes to publish yet");

  const job = await getJob(site.themeRef);
  if (!job) throw new Error("The original bundle expired — re-convert this site first");

  const target = site.deployments.find((d) => d.tokenEnc && d.externalId);
  if (!target || !target.tokenEnc || !target.externalId) {
    throw new Error(
      "No saved deploy target. Deploy this site once with “Save deploy for live editing” checked, then publish."
    );
  }
  if (!encryptionConfigured()) {
    throw new Error("Publishing is not configured (missing ENCRYPTION_KEY)");
  }

  const edited = applyEditsToReport(job.report, edits);
  const token = decryptSecret(target.tokenEnc);

  const res =
    target.provider === "netlify"
      ? await redeployNetlify(token, target.externalId, edited.files)
      : await redeployVercel(token, target.externalId, edited.files);

  await db.deployment
    .create({
      data: {
        siteId: site.id,
        provider: target.provider,
        status: "ready",
        url: res.url,
        externalId: target.externalId,
        tokenEnc: target.tokenEnc,
      },
    })
    .catch(() => {});

  return { deployedUrl: res.url, provider: res.provider, edits: edits.length };
}
