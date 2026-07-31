"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Icon } from "./theme/Icon";
import { Avatar } from "./theme/Avatar";

interface DeploymentRow {
  id: string;
  provider: string;
  status: string;
  url: string | null;
  createdAt: string;
}
interface SiteRow {
  id: string;
  name: string;
  framerUrl: string;
  outputKind: string;
  status: string;
  themeRef: string | null;
  previewImage: string | null;
  createdAt: string;
  canAutoDeploy: boolean;
  deployments: DeploymentRow[];
}

// og:image scraped from the source Framer page at conversion time. Falls back
// to a placeholder glyph when there's none (older conversions, or the source
// page had no og:image) or the image URL 404s.
function CardThumb({ src, badges }: { src: string | null; badges: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  const empty = !src || failed;
  return (
    <div className={`project-thumb${empty ? " project-thumb-empty" : ""}`}>
      {empty ? (
        <Icon name="globe" className="icon icon-lg" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- external, unknown-dimension source image
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
      )}
      <div className="thumb-badges">{badges}</div>
    </div>
  );
}

function fmtDate(iso: string): string {
  try {
    // Fixed locale: server and client default locales can differ, which
    // causes a hydration mismatch if left unspecified.
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
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

// Drives the colour of the status bar on each card. The bar is a status
// indicator, not a completion meter — the backend sends no percentage, so
// inventing one would misrepresent the job. It renders full-width and lets
// colour carry the meaning.
function statusBarClass(status: string): string {
  if (READY.includes(status)) return "ready";
  if (ACTIVE.includes(status)) return "converting";
  if (FAILED.includes(status)) return "failed";
  return "draft";
}

function statusLabel(status: string): string {
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function outputLabel(kind: string): string {
  return kind === "nextjs" ? "Pure Next.js" : "HTML";
}

type SortKey = "newest" | "oldest" | "name";

export function DashboardView({
  email,
  avatarUrl,
  sites,
}: {
  email: string;
  avatarUrl: string;
  sites: SiteRow[];
}) {
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [outputFilter, setOutputFilter] = useState("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<"hybrid" | "nextjs">("hybrid");

  async function logout() {
    await createSupabaseBrowser().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  // Hands off to the home page rather than duplicating any conversion logic
  // here. It runs both pipelines now, reading the prefilled ?url= and
  // selecting the tab from ?mode=.
  function startConversion(e: React.FormEvent) {
    e.preventDefault();
    const v = url.trim();
    if (!v) return;
    router.push(`/?url=${encodeURIComponent(v)}&mode=${mode}`);
  }

  // Phone-only drawer: Escape closes it, and it self-closes if the viewport
  // is widened back past the breakpoint where the sidebar is always visible.
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    const wide = window.matchMedia("(min-width: 761px)");
    const onWide = () => { if (wide.matches) setNavOpen(false); };
    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = sites.filter((s) => {
      const text = `${s.name} ${s.framerUrl}`.toLowerCase();
      if (q && !text.includes(q)) return false;
      if (statusFilter !== "all" && statusBarClass(s.status) !== statusFilter) return false;
      if (outputFilter !== "all" && s.outputKind !== outputFilter) return false;
      return true;
    });
    return [...matches].sort((a, b) => {
      if (sort === "oldest") return +new Date(a.createdAt) - +new Date(b.createdAt);
      if (sort === "name") return a.name.localeCompare(b.name);
      return +new Date(b.createdAt) - +new Date(a.createdAt);
    });
  }, [sites, query, statusFilter, outputFilter, sort]);

  const filtersActive = query.trim() !== "" || statusFilter !== "all" || outputFilter !== "all";

  function clearFilters() {
    setQuery("");
    setStatusFilter("all");
    setOutputFilter("all");
  }

  return (
    <div className="dashboard-shell">
      <div
        className={`drawer-scrim${navOpen ? " is-open" : ""}`}
        hidden={!navOpen}
        onClick={() => setNavOpen(false)}
      />
      <aside className={`sidebar${navOpen ? " is-open" : ""}`} id="sidebar" aria-label="Workspace navigation">
        <Link className="brand" href="/dashboard" aria-label="FramerToNextJS dashboard">
          <span className="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          <span>FramerToNextJS</span>
        </Link>
        <nav className="nav-list">
          <p className="nav-label">Workspace</p>
          <Link className="nav-item" href="/dashboard" aria-current="page" onClick={() => setNavOpen(false)}>
            <Icon name="dashboard" />
            Dashboard
          </Link>
          <Link className="nav-item" href="/" onClick={() => setNavOpen(false)}>
            <Icon name="plus" />
            New conversion
          </Link>
          <Link className="nav-item" href="/settings" onClick={() => setNavOpen(false)}>
            <Icon name="settings" />
            Settings
          </Link>
        </nav>
        <div className="sidebar-footer">
          <div className="workspace-switcher">
            <Avatar email={email} avatarUrl={avatarUrl} />
            <span>
              <strong>{email}</strong>
              <small>{sites.length} project{sites.length === 1 ? "" : "s"}</small>
            </span>
          </div>
          <button
            onClick={logout}
            className="nav-item danger-link"
            type="button"
            style={{ width: "100%", marginTop: "8px", border: 0, background: "transparent", textAlign: "left" }}
          >
            <Icon name="arrow-left" />
            Log out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button
            className="icon-button nav-toggle"
            type="button"
            aria-label={navOpen ? "Close navigation" : "Open navigation"}
            aria-controls="sidebar"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((v) => !v)}
          >
            <Icon name={navOpen ? "close" : "menu"} />
          </button>
          <div className="breadcrumb">
            <span>Workspace</span>
            <b className="sep" aria-hidden="true">/</b>
            <strong aria-current="page">Dashboard</strong>
          </div>
        </header>

        <section className="dashboard-hero">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>Your conversion workspace.</h1>
            <p>Resume active work, review finished exports, or start a new Framer conversion.</p>
          </div>
        </section>

        <section className="convert-panel" aria-label="Start a new conversion">
          <div className="convert-toggle" role="tablist" aria-label="Conversion output">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "nextjs"}
              className={`convert-tab${mode === "nextjs" ? " is-active" : ""}`}
              onClick={() => setMode("nextjs")}
            >
              Convert to Next.js
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "hybrid"}
              className={`convert-tab${mode === "hybrid" ? " is-active" : ""}`}
              onClick={() => setMode("hybrid")}
            >
              Improve Site Performance (HTML)
            </button>
          </div>

          <div className="convert-surface">
            <form className="convert-pill" onSubmit={startConversion} noValidate>
              <input
                type="url"
                autoComplete="url"
                placeholder="Paste your framer website url"
                aria-label="Framer website URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <button type="submit" disabled={!url.trim()}>
                {mode === "nextjs" ? "Get Next.js file" : "Get HTML file"}
              </button>
            </form>
          </div>
        </section>

        <section className="projects-section" id="projects" aria-labelledby="projects-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Recent projects</p>
              <h2 id="projects-title">Projects</h2>
            </div>
          </div>

          {sites.length > 0 && (
            <div className="toolbar">
              <label className="search-field">
                <Icon name="search" className="icon icon-sm" />
                <input
                  type="search"
                  placeholder="Search projects"
                  aria-label="Search projects"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="ready">Ready</option>
                <option value="converting">In progress</option>
                <option value="failed">Failed</option>
              </select>
              <select
                aria-label="Filter by output"
                value={outputFilter}
                onChange={(e) => setOutputFilter(e.target.value)}
              >
                <option value="all">All outputs</option>
                <option value="nextjs">Pure Next.js</option>
                <option value="hybrid">Hybrid</option>
              </select>
              <select
                aria-label="Sort projects"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>
          )}

          {sites.length === 0 ? (
            <article className="empty-panel">
              <span className="empty-icon">
                <Icon name="plus" className="icon icon-lg" />
              </span>
              <p className="eyebrow">No projects yet</p>
              <h3>Your first conversion will appear here.</h3>
              <p>
                Start with a published Framer URL. You&rsquo;ll see status, output type, and next
                actions as soon as the project exists.
              </p>
              <Link href="/" className="primary-button">
                <span>New conversion</span>
                <Icon name="arrow-right" className="icon icon-sm" />
              </Link>
            </article>
          ) : visible.length === 0 ? (
            <article className="empty-panel">
              <span className="empty-icon">
                <Icon name="search" className="icon icon-lg" />
              </span>
              <p className="eyebrow">No matches</p>
              <h3>No projects match this view.</h3>
              <p>Try a different search, clear filters, or start a new conversion.</p>
              <button className="secondary-button" type="button" onClick={clearFilters}>
                Clear filters
              </button>
            </article>
          ) : (
            <div className="projects-grid" aria-live="polite">
              {visible.map((s) => (
                <article className="project-card" key={s.id}>
                  <CardThumb
                    src={s.previewImage}
                    badges={
                      <>
                        {!READY.includes(s.status) && (
                          <span className={`status-chip ${statusTone(s.status)}`}>
                            {statusLabel(s.status)}
                          </span>
                        )}
                        <span className="badge">{outputLabel(s.outputKind)}</span>
                      </>
                    }
                  />

                  <div className="project-title">
                    <h3>{s.name}</h3>
                    <p title={s.framerUrl}>{s.framerUrl}</p>
                  </div>

                  <div className="project-meta">
                    <div>
                      <span>Created</span>
                      <strong>{fmtDate(s.createdAt)}</strong>
                    </div>
                    <div>
                      <span>Deploys</span>
                      <strong>{s.deployments.length}</strong>
                    </div>
                  </div>

                  <div className="project-actions">
                    <Link className="main-action" href={`/project/${s.id}`}>
                      Open
                    </Link>
                    {s.themeRef && (
                      <a
                        href={`/api/download/${s.themeRef}`}
                        className="menu-action"
                        aria-label={`Download bundle for ${s.name}`}
                      >
                        <Icon name="download" className="icon icon-sm" />
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          {filtersActive && visible.length > 0 && (
            <p className="muted-copy" style={{ marginTop: "16px" }}>
              Showing {visible.length} of {sites.length} projects.{" "}
              <button
                type="button"
                onClick={clearFilters}
                style={{
                  background: "none",
                  border: 0,
                  padding: 0,
                  textDecoration: "underline",
                  color: "inherit",
                  cursor: "pointer",
                }}
              >
                Clear filters
              </button>
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
