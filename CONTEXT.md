# Project context

What this is, how it's put together, and the tradeoffs worth knowing before changing things. Read alongside [AGENTS.md](AGENTS.md) (this Next.js version's breaking changes) — this file is about the product; AGENTS.md is about the framework quirks.

## What this is

**framertonextjs.com** — converts a published Framer site into a deployable Next.js project or optimized static HTML bundle. Free, works from just a public URL (no Framer project access, no plugin, no file export). Also ships a visual editor for post-conversion text/link/image edits, a Framer-style "Studio" canvas builder, a blog/marketing site for SEO, and an admin panel.

Positioning: not a from-scratch website builder (that's what Framer/Wix/Webflow are), not a component-level export tool (that's what `unframer` + Framer's React Export plugin are) — this is whole-site, URL-in/deployable-site-out conversion.

## Stack

- Next.js 16 (App Router, Turbopack default) — see AGENTS.md, conventions differ from older Next.js
- Prisma 6 + Postgres (Supabase-hosted, accessed via Supabase's transaction pooler — `DATABASE_URL` uses `pgbouncer=true&connection_limit=1`, `DIRECT_URL` for migrations)
- Supabase Auth (`@supabase/ssr`) for user accounts; a separate single-password gate (`ADMIN_PASSWORD`) for `/admin`
- Storage: Cloudflare R2 preferred, Vercel Blob fallback — see `lib/blob-driver.ts`
- Deploy target: Vercel (Hobby plan as of this writing — see "Known operational issues" below)

## Data model (`prisma/schema.prisma`)

- `User` — Supabase auth id as PK, upserted lazily (not on every request — see `lib/supabase/user.ts`)
- `Site` — a converted project: `framerUrl`, `outputKind` ("hybrid" or "nextjs"), `draftEdits` (visual editor's unpublished `EditorEdit[]`), `designTree` (Studio's block-tree JSON)
- `Deployment` — one row per publish/redeploy (Netlify or Vercel), encrypted deploy token if the user opted into "save for AI edits"
- `Post` — blog content (Markdown), published via direct DB writes (`scripts/seed-batch-N.mjs`), not a CMS UI
- `SignupMeta` — first-touch attribution (source/country/device/browser/os), captured once at signup
- `ContactMessage` — the "Need help?" badge's submissions, best-effort emailed via Resend if `RESEND_API_KEY` is set, otherwise just stored and visible at `/admin/messages`

## Key subsystems

- **Conversion pipeline** — `lib/convert.ts` (Hybrid: strips Framer's runtime, keeps closest-to-original HTML) and `lib/nextjs-export.ts` (Pure Next.js: byte-exact HTML string per route, NOT hand-decomposed components — see the blog post on refining exports with Cursor/Claude Code for why). Both re-encode images to WebP via `sharp` and self-host fonts.
- **Job store** (`lib/store.ts`) — a converted bundle is persisted to Blob/R2 (survives across serverless instances) with an in-memory fast path. `getOrRegenerateJob()` transparently re-runs the full conversion if a job's gone missing from cache — by design, but see the CPU note below for why this matters more than it sounds like it should.
- **Visual editor** (`app/editor/[siteId]`) — edits a *live* iframe DOM directly (text/link/image/visibility), records edits as `EditorEdit[]`, applies them at publish time via `lib/overrides.ts`'s runtime-injected enforcer script (content-keyed matching, not structural — Framer's hydration reshuffles the DOM, so matching by old-content-value is what survives it). No drag-to-reorder — the override system has no concept of DOM position, only content replacement.
- **Studio** (`app/studio/[siteId]`) — a separate, from-scratch Framer-style canvas builder using a JSON `DesignDoc` block tree. Distinct data model from the editor above; don't confuse the two "layers" panels.
- **Auth** — `proxy.ts` (this Next version's renamed `middleware.ts`) gates `/dashboard`, `/editor`, `/studio` with a Supabase `getUser()` call, then forwards the verified identity via request headers so page code doesn't repeat the same network round-trip. `/admin` uses a separate password-only gate, unrelated to Supabase auth.

## Known operational issues / recent history

- **Vercel Hobby plan pause (active as of this writing).** The project got paused for exceeding Fluid Active CPU (14h/4h cap) and Blob Simple Operations (34K/10K cap) in the same ~30-day window. Root cause: `lib/store.ts`'s `MAX_JOBS = 25` cap means only the 25 most-recent conversions across the *entire site* stay cached — anything older gets silently, fully re-converted (re-fetch + re-parse + re-Sharp-encode every image) the next time someone previews/downloads/deploys it. At real traffic volume this triggers far more full reconversions than the design assumed. Fix in progress: raise `MAX_JOBS` substantially (binary assets are already content-addressed/deduped across jobs, so this mostly costs a bit more small JSON metadata storage, not the expensive images).
- **Vercel Blob transfer cap got hit once before** (documented in `lib/store.ts`'s comments) from re-uploading the same images on every reconversion during testing — fixed via content-addressed asset storage (`assets/<sha1>.<ext>`, shared across jobs, skipped via `head()` if already present). That fix is still in place; it's the *job JSON* cache limit that's the current problem, not the images.
- **R2 migration is partial.** `lib/blob-driver.ts` prefers R2 when `R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`/`R2_BUCKET` are all set, falling back to Vercel Blob otherwise — check which is actually configured in the Vercel dashboard before assuming which backend is live.
- **`sharp` is pinned to an exact version** (matching whatever Next.js internally bundles) — two different sharp/libvips binaries loaded in the same process caused a real, intermittent native crash. Don't bump `sharp` without checking `node_modules/next/node_modules/@img/sharp-*/package.json` for the version Next itself bundles.
- **The blog's per-post `opengraph-image.tsx` route was deleted on purpose.** Next.js's file-convention resolver for a colocated OG image route always wins over whatever `generateMetadata()` returns, and it hit a build-crashing libvips bug independent of its own content. The site-wide `app/opengraph-image.tsx` is `force-dynamic` for the same crash-avoidance reason — per-request rendering instead of build-time static generation, so a rare hiccup costs one failed image request instead of blocking the whole deploy.

## Conventions

- Blog posts are seeded via `scripts/seed-batch-N.mjs` (upsert by slug), run with `node scripts/seed-batch-N.mjs` — check the highest existing number before creating a new one; a few early-numbered ones may already be used by content from prior sessions.
- Schema changes: `npx prisma db push --skip-generate` (no migration files in normal use), then `npx prisma generate`.
- `env -u GH_TOKEN git push` — `gh`'s own token routing otherwise causes a 403 on push.
