// Visual editor publish pipeline.
//
// Model: themeRef always points at the ORIGINAL converted bundle; the site's
// draftEdits holds the FULL current edit set. Publish = apply(original, edits)
// → redeploy to the saved deploy target. Deterministic, no version drift: the
// editor renders original + draft overlaid, and publish reproduces exactly
// that. Edits survive Framer's hydration via the injected override runtime.
import type { ConvertedFile, ConvertReport } from "./types";
import { editorOverrides, injectOverrides, type EditorEdit } from "./overrides";
import { getJob } from "./store";
import { db } from "./db";
import { decryptSecret, encryptionConfigured } from "./crypto";
import { redeployNetlify, redeployVercel, toDeployableFiles } from "./deploy";

function injectIntoHtmlFile(f: ConvertedFile, overrides: ReturnType<typeof editorOverrides>): ConvertedFile {
  if (!f.content || !f.path.endsWith(".html")) return f;
  return { ...f, content: injectOverrides(f.content, overrides) };
}

/**
 * Returns a NEW report with the editor overrides injected into every page.
 * Hybrid bundles carry the edited HTML directly in `files`; Pure Next.js
 * bundles have no static HTML there (real .tsx components instead) — their
 * edits go into `previewFiles`, the same optimized static HTML the no-build
 * deploy path (toDeployableFiles) and live preview both render from.
 */
export function applyEditsToReport(report: ConvertReport, edits: EditorEdit[]): ConvertReport {
  const overrides = editorOverrides(edits);
  if (overrides.length === 0) return report;

  return {
    ...report,
    files: report.files.map((f) => injectIntoHtmlFile(f, overrides)),
    previewFiles: report.previewFiles?.map((f) => injectIntoHtmlFile(f, overrides)),
  };
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
  // Pure-Next.js: overrides were injected into previewFiles; toDeployableFiles
  // uses those (renamed to site-root paths) so the redeploy matches the
  // original no-build deploy.
  const files = toDeployableFiles(edited.files, edited.previewFiles);
  const token = decryptSecret(target.tokenEnc);

  const res =
    target.provider === "netlify"
      ? await redeployNetlify(token, target.externalId, files)
      : await redeployVercel(token, target.externalId, files);

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
