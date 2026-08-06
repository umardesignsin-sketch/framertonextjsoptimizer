"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/app/dashboard/theme/Icon";

interface Site {
  id: string;
  name: string;
  framerUrl: string;
  outputKind: string;
  themeRef: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}
interface DeploymentRow {
  id: string;
  provider: string;
  status: string;
  url: string | null;
  createdAt: string;
}
interface Report {
  pages: { route: string }[];
  stats: { label: string; before: number; after: number; unit: string }[];
  notes: string[];
}
interface Lighthouse {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  checkedAt: string;
}

const READY = ["ready", "live", "done", "complete"];
const ACTIVE = ["converting", "pending", "queued", "running"];
const FAILED = ["failed", "error"];

function statusTone(status: string): string {
  if (READY.includes(status)) return "is-success";
  if (ACTIVE.includes(status)) return "is-running";
  if (FAILED.includes(status)) return "is-danger";
  return "is-neutral";
}
function statusLabel(status: string): string {
  if (READY.includes(status)) return "Ready";
  if (ACTIVE.includes(status)) return "Converting";
  if (FAILED.includes(status)) return "Needs attention";
  return "Draft";
}
function outputLabel(kind: string): string {
  return kind === "nextjs" ? "Next.js" : "HTML";
}
function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}
function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProjectView({
  site,
  deployments: initialDeployments,
  report,
  lighthouse: initialLighthouse,
}: {
  site: Site;
  deployments: DeploymentRow[];
  report: Report | null;
  lighthouse: Lighthouse | null;
}) {
  const [deployments, setDeployments] = useState(initialDeployments);
  const [previewMobile, setPreviewMobile] = useState(false);
  const hasBundle = !!site.themeRef;

  // ---- Lighthouse ----
  const [lighthouse, setLighthouse] = useState(initialLighthouse);
  const [auditState, setAuditState] = useState<"idle" | "running" | "error">("idle");
  const [auditError, setAuditError] = useState("");

  async function runAudit() {
    if (auditState === "running") return;
    setAuditState("running");
    setAuditError("");
    try {
      const res = await fetch("/api/lighthouse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: site.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Audit failed");
      setLighthouse({
        performance: data.performance,
        accessibility: data.accessibility,
        bestPractices: data.bestPractices,
        seo: data.seo,
        checkedAt: data.checkedAt,
      });
      setAuditState("idle");
    } catch (e) {
      setAuditError(e instanceof Error ? e.message : "Audit failed");
      setAuditState("error");
    }
  }

  // ---- Deploy form ----
  const [provider, setProvider] = useState<"netlify" | "vercel">("netlify");
  const [token, setToken] = useState("");
  const [deployName, setDeployName] = useState("");
  const [save, setSave] = useState(false);
  const [deployState, setDeployState] = useState<"idle" | "deploying" | "error">("idle");
  const [deployError, setDeployError] = useState("");

  async function deploy() {
    if (!token.trim() || !site.themeRef) return;
    setDeployState("deploying");
    setDeployError("");
    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: site.themeRef,
          provider,
          token: token.trim(),
          name: deployName.trim() || undefined,
          save,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Deploy failed");
      setDeployments((prev) => [
        { id: `local-${Date.now()}`, provider, status: "ready", url: data.url, createdAt: new Date().toISOString() },
        ...prev,
      ]);
      setToken("");
      setDeployState("idle");
    } catch (e) {
      setDeployError(e instanceof Error ? e.message : "Deploy failed");
      setDeployState("error");
    }
  }

  const imageStat = report?.stats.find((s) => /image/i.test(s.label));

  return (
    <div className="project-shell">
      <aside className="sidebar" aria-label="Workspace navigation">
        <Link className="brand" href="/dashboard" aria-label="FramerToNextJS dashboard">
          <span className="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
          <span>FramerToNextJS</span>
        </Link>
        <nav className="nav-list">
          <p className="nav-label">Workspace</p>
          <Link className="nav-item" href="/dashboard"><Icon name="dashboard" />Dashboard</Link>
          <Link className="nav-item" href="/"><Icon name="plus" />New conversion</Link>
          <Link className="nav-item" aria-current="page" href="/dashboard#projects"><Icon name="projects" />Projects</Link>
          <Link className="nav-item" href="/settings"><Icon name="settings" />Settings</Link>
        </nav>
      </aside>

      <main className="main-content project-main">
        <header className="topbar">
          <div className="breadcrumb">
            <Link href="/dashboard">Workspace</Link>
            <b className="sep" aria-hidden="true">/</b>
            <Link href="/dashboard#projects">Projects</Link>
            <b className="sep" aria-hidden="true">/</b>
            <strong aria-current="page">{site.name}</strong>
          </div>
        </header>

        <section className="project-hero" id="overview">
          <div>
            <div className="hero-kicker">
              <span className={`status-chip ${statusTone(site.status)}`}>{statusLabel(site.status)}</span>
              <span>{site.framerUrl}</span>
            </div>
            <h1>{site.name}</h1>
            <p>
              {FAILED.includes(site.status)
                ? "Conversion needs attention. Review the source URL and try converting again."
                : hasBundle
                  ? `A ${outputLabel(site.outputKind)} reconstruction with optimized assets and handoff notes.`
                  : "This project hasn't produced a bundle yet."}
            </p>
          </div>
          <div className="hero-actions">
            {hasBundle && (
              <a className="secondary-button" href={`/api/download/${site.themeRef}`}>
                Download
              </a>
            )}
            {hasBundle ? (
              <a className="primary-button" href="#deployment">
                <span>Deploy</span>
                <Icon name="arrow-right" className="icon icon-sm" />
              </a>
            ) : (
              <Link className="primary-button" href={`/?url=${encodeURIComponent(site.framerUrl)}`}>
                <span>{FAILED.includes(site.status) ? "Retry conversion" : "Start conversion"}</span>
                <Icon name="arrow-right" className="icon icon-sm" />
              </Link>
            )}
          </div>
        </section>

        <section className="health-grid" aria-label="Project health">
          <article className="metric-card">
            <span>Pages</span>
            <strong>{report ? report.pages.length : "—"}</strong>
            <small>Routes generated</small>
          </article>
          <article className="metric-card">
            <span>Output</span>
            <strong>{outputLabel(site.outputKind)}</strong>
            <small>{site.outputKind === "nextjs" ? "App Router" : "Static bundle"}</small>
          </article>
          <article className="metric-card">
            <span>Lighthouse</span>
            <strong>{lighthouse ? lighthouse.performance : "Pending"}</strong>
            <small>{lighthouse ? "Performance (mobile)" : "Run an audit below"}</small>
          </article>
          <article className="metric-card">
            <span>Updated</span>
            <strong>{fmtDate(site.updatedAt)}</strong>
            <small>Last change</small>
          </article>
        </section>

        <nav className="tabs project-tabs" aria-label="Project sections">
          <a href="#overview" aria-current="true">Overview</a>
          <a href="#preview">Preview</a>
          <a href="#report">Lighthouse</a>
          <a href="#deployment">Deployment</a>
          <a href="#downloads">Downloads</a>
          <a href="#metadata">Metadata</a>
        </nav>

        <section className="content-grid">
          <div className="main-column">
            <article className="panel overview-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Overview</p>
                  <h2>Conversion summary</h2>
                </div>
              </div>
              <div className="summary-list">
                {report ? (
                  <>
                    <div>
                      <span className="status-glyph is-success"><Icon name="check" className="icon icon-sm" /></span>
                      <p>
                        <strong>{report.pages.length} route{report.pages.length === 1 ? "" : "s"} generated</strong>
                        <small>{report.pages.map((p) => p.route).join(", ") || "/"}</small>
                      </p>
                    </div>
                    {imageStat && (
                      <div>
                        <span className="status-glyph is-success"><Icon name="check" className="icon icon-sm" /></span>
                        <p>
                          <strong>Images optimized</strong>
                          <small>
                            {imageStat.unit === "bytes"
                              ? `${fmtBytes(imageStat.before)} → ${fmtBytes(imageStat.after)}`
                              : `${imageStat.before} → ${imageStat.after}`}
                          </small>
                        </p>
                      </div>
                    )}
                    {report.notes.map((note, i) => (
                      <div key={i}>
                        <span className="status-glyph is-neutral"><Icon name="info" className="icon icon-sm" /></span>
                        <p>
                          <strong>{note}</strong>
                        </p>
                      </div>
                    ))}
                  </>
                ) : (
                  <div>
                    <span className="status-glyph is-neutral"><Icon name="info" className="icon icon-sm" /></span>
                    <p>
                      <strong>No conversion report yet</strong>
                      <small>Run a conversion to see routes, stats, and notes here.</small>
                    </p>
                  </div>
                )}
              </div>
            </article>

            <article className="panel preview-panel" id="preview">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Preview</p>
                  <h2>Generated site</h2>
                </div>
                {hasBundle && (
                  <div className="segmented" role="tablist" aria-label="Preview viewport">
                    <button
                      className={previewMobile ? "" : "active"}
                      type="button"
                      role="tab"
                      aria-selected={!previewMobile}
                      onClick={() => setPreviewMobile(false)}
                    >
                      Desktop
                    </button>
                    <button
                      className={previewMobile ? "active" : ""}
                      type="button"
                      role="tab"
                      aria-selected={previewMobile}
                      onClick={() => setPreviewMobile(true)}
                    >
                      Mobile
                    </button>
                  </div>
                )}
              </div>
              {hasBundle ? (
                <>
                  <div className="preview-stage">
                    <div className={`browser-frame${previewMobile ? " mobile" : ""}`}>
                      <div className="browser-bar">
                        <i></i><i></i><i></i>
                        <span>{site.framerUrl}</span>
                      </div>
                      <iframe
                        src={`/api/preview/${site.themeRef}/`}
                        title={`${site.name} preview`}
                        style={{ width: "100%", height: 420, border: 0, display: "block" }}
                      />
                    </div>
                  </div>
                  <div className="preview-footer">
                    <span>Preview generated from the converted output, not the original Framer URL.</span>
                    <a className="ghost-button" href={`/api/preview/${site.themeRef}/`} target="_blank" rel="noreferrer">
                      Open preview
                    </a>
                  </div>
                </>
              ) : (
                <div className="preview-footer">
                  <span>No preview available until this project has a converted bundle.</span>
                </div>
              )}
            </article>

            <article className="panel lighthouse-panel" id="report">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Lighthouse report</p>
                  <h2>Quality signals</h2>
                </div>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={runAudit}
                  disabled={auditState === "running" || !hasBundle}
                  title={hasBundle ? undefined : "Convert this project first"}
                >
                  {auditState === "running" ? "Running…" : lighthouse ? "Re-run audit" : "Run audit"}
                </button>
              </div>

              {auditState === "error" && (
                <div className="summary-list">
                  <div>
                    <span className="status-glyph is-danger"><Icon name="info" className="icon icon-sm" /></span>
                    <p>
                      <strong>Audit failed</strong>
                      <small>{auditError}</small>
                    </p>
                  </div>
                </div>
              )}

              {lighthouse ? (
                <>
                  <div className="score-grid">
                    <div className="score-card">
                      <span>Performance</span>
                      <strong>{lighthouse.performance}</strong>
                      <i style={{ "--score": `${lighthouse.performance}%` } as React.CSSProperties} />
                    </div>
                    <div className="score-card">
                      <span>Accessibility</span>
                      <strong>{lighthouse.accessibility}</strong>
                      <i style={{ "--score": `${lighthouse.accessibility}%` } as React.CSSProperties} />
                    </div>
                    <div className="score-card">
                      <span>Best practices</span>
                      <strong>{lighthouse.bestPractices}</strong>
                      <i style={{ "--score": `${lighthouse.bestPractices}%` } as React.CSSProperties} />
                    </div>
                    <div className="score-card">
                      <span>SEO</span>
                      <strong>{lighthouse.seo}</strong>
                      <i style={{ "--score": `${lighthouse.seo}%` } as React.CSSProperties} />
                    </div>
                  </div>
                  <p className="muted-copy" style={{ padding: "0 24px 18px" }}>
                    Mobile audit via Google PageSpeed Insights · last run {fmtDate(lighthouse.checkedAt)}
                  </p>
                </>
              ) : (
                auditState !== "error" && (
                  <div className="summary-list">
                    <div>
                      <span className="status-glyph is-neutral"><Icon name="info" className="icon icon-sm" /></span>
                      <p>
                        <strong>No audit yet</strong>
                        <small>
                          {hasBundle
                            ? "Run a real Lighthouse audit via Google PageSpeed Insights."
                            : "Convert this project before running an audit."}
                        </small>
                      </p>
                    </div>
                  </div>
                )
              )}
            </article>
          </div>

          <aside className="side-column">
            <article className="panel deployment-panel" id="deployment">
              <div className="panel-heading compact">
                <div>
                  <p className="eyebrow">Deployment</p>
                  <h2>Deploy this build</h2>
                </div>
                <span className="status-chip is-neutral">
                  {deployments.length > 0 ? `${deployments.length} deploy${deployments.length === 1 ? "" : "s"}` : "Not deployed"}
                </span>
              </div>

              {hasBundle ? (
                <>
                  <div className="field-grid" style={{ padding: "18px" }}>
                    <label>
                      <span>Provider</span>
                      <select
                        value={provider}
                        onChange={(e) => setProvider(e.target.value as "netlify" | "vercel")}
                        style={{
                          height: 42,
                          border: "1px solid #d8d8d4",
                          borderRadius: 9,
                          padding: "0 12px",
                        }}
                      >
                        <option value="netlify">Netlify</option>
                        <option value="vercel">Vercel</option>
                      </select>
                    </label>
                    <label>
                      <span>Site name (optional)</span>
                      <input value={deployName} onChange={(e) => setDeployName(e.target.value)} type="text" placeholder="auto" />
                    </label>
                    <label style={{ gridColumn: "1/-1" }}>
                      <span>{provider === "netlify" ? "Netlify token" : "Vercel token"}</span>
                      <input value={token} onChange={(e) => setToken(e.target.value)} type="password" placeholder="paste token" />
                    </label>
                  </div>
                  <label
                    style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "0 18px 14px", fontSize: 11 }}
                  >
                    <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} />
                    <span>Save this token (encrypted) so the editor can push future changes here.</span>
                  </label>
                  {deployError && <p className="field-error" style={{ padding: "0 18px" }}>{deployError}</p>}
                  <div className="deploy-actions">
                    <button
                      className="primary-button"
                      type="button"
                      onClick={deploy}
                      disabled={deployState === "deploying" || !token.trim()}
                    >
                      <span>{deployState === "deploying" ? "Deploying…" : "Deploy"}</span>
                    </button>
                  </div>
                </>
              ) : (
                <p className="muted-copy">Convert this project before deploying.</p>
              )}

              {deployments.length > 0 && (
                <div className="download-list">
                  {deployments.map((d) => (
                    <a
                      key={d.id}
                      href={d.url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    >
                      <span>
                        <strong style={{ textTransform: "capitalize" }}>{d.provider}</strong>
                        <small>{fmtDate(d.createdAt)}</small>
                      </span>
                      <Icon name="arrow-up-right" className="icon icon-sm" />
                    </a>
                  ))}
                </div>
              )}
              <p className="muted-copy">
                Deploys the static bundle using your own host token. Not stored unless you opt in above.
              </p>
            </article>

            <article className="panel downloads-panel" id="downloads">
              <div className="panel-heading compact">
                <div>
                  <p className="eyebrow">Downloads</p>
                  <h2>Files</h2>
                </div>
              </div>
              {hasBundle ? (
                <div className="download-list">
                  <a href={`/api/download/${site.themeRef}`}>
                    <span>
                      <strong>Project archive</strong>
                      <small>{site.name}-optimized.zip</small>
                    </span>
                    <Icon name="download" className="icon icon-sm" />
                  </a>
                </div>
              ) : (
                <p className="muted-copy" style={{ padding: "18px" }}>
                  No files yet — nothing has been converted for this project.
                </p>
              )}
              {report && report.notes.length > 0 && (
                <details className="details-block">
                  <summary>
                    Handoff notes <Icon name="chevron-down" className="icon icon-sm" />
                  </summary>
                  <div className="audit-list">
                    {report.notes.map((n, i) => (
                      <p key={i}><strong>{n}</strong></p>
                    ))}
                  </div>
                </details>
              )}
            </article>

            <article className="panel metadata-panel" id="metadata">
              <div className="panel-heading compact">
                <div>
                  <p className="eyebrow">Project metadata</p>
                  <h2>Build information</h2>
                </div>
              </div>
              <dl className="metadata-list">
                <div><dt>Project ID</dt><dd>{site.id}</dd></div>
                <div><dt>Created</dt><dd>{fmtDate(site.createdAt)}</dd></div>
                <div><dt>Output</dt><dd>{outputLabel(site.outputKind)}</dd></div>
                <div><dt>Source</dt><dd title={site.framerUrl}>{site.framerUrl}</dd></div>
              </dl>
            </article>
          </aside>
        </section>
      </main>
    </div>
  );
}
