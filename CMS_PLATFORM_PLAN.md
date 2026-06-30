# CMS Platform — Implementation Plan

Evolving the Framer → Next.js converter into a **CMS-powered hosting platform**:
import a Framer site → convert → host → manage content in our dashboard →
publish updates instantly, without ever returning to Framer.

> Status: PLAN. Built incrementally on the existing codebase. Converter
> functionality is preserved at every phase.

---

## 1. Current state (what we extend, not rebuild)

- **Next.js 16 + React 19 + Tailwind 4**, deployed on Vercel.
- **Converter pipeline** (`lib/convert.ts`): Framer URL → optimized **static HTML
  snapshot** (hybrid keeps Framer runtime; optimize strips it).
- **Storage**: Vercel **Blob** (`lib/store.ts`) holds converted bundles. No DB.
- **Auth**: a single `ADMIN_PASSWORD` gate (`lib/admin-auth.ts`). No user accounts.
- **Deploy**: one-shot Netlify/Vercel deploy with the user's own token
  (`lib/deploy.ts`). No persistent connection, no rebuilds.

## 2. The crux — snapshot vs. structured content

The converter today produces an **opaque HTML snapshot**. You cannot "manage the
content" of a baked HTML blob. A CMS needs **structured, editable content + a
renderer**. There are two strategies:

- **Strategy A — CMS around a rendered theme (RECOMMENDED, achievable now).**
  The imported Framer pages stay as the **design/theme**. The CMS manages
  structured layers on top: Pages (from templates), Blog, SEO, Nav, Media,
  Forms, Collections, Global settings. The generated site is a **renderer** that
  reads CMS content at build time (SSG) and composes design + content. Publish →
  rebuild → deploy. Everything is editable **except** the visual internals of an
  imported Framer page.

- **Strategy B — full visual editing of the imported design.** Parse arbitrary
  Framer HTML into editable blocks. This is extremely hard, lossy, and
  multi-month; it really needs the real-React export path (unframer) first.

**Recommendation: ship A now** (real migration value, incremental), keep B as a
long-term track (via the unframer/real-Next.js path already prototyped).

## 3. Target architecture (Strategy A)

```
 Browser (dashboard)            Our platform (Vercel)              Generated site (Netlify)
 ────────────────────           ─────────────────────             ───────────────────────
 Auth (Clerk)        ─────►  Next.js app + API                    Next.js "renderer" template
 Site dashboard      ─────►   ├─ Prisma → Postgres (Neon)   ◄────  fetches CMS content at build
 Content editors     ─────►   ├─ Blob/R2 (media, bundles)          SSG/ISR → static-first
 "Publish" button    ─────►   └─ triggers Netlify build hook ────► rebuild + deploy → live
```

- **DB**: Postgres + Prisma, multi-tenant (every row scoped by `siteId`/`userId`).
- **Auth/users**: Clerk (users + orgs) — fast multi-tenant user management.
- **Media/bundles**: Vercel Blob now; R2/S3 when scaling.
- **Renderer**: a Next.js template that reads `GET /api/sites/{id}/content` (build
  token) and renders SSG; deployed per site to Netlify with a build hook.
- **Publish**: edit → DB → "Publish" calls the site's Netlify build hook → rebuild
  pulls latest content → live. Incremental & fast. Status tracked via Netlify API.
- **Custom domains**: Netlify domains API (verify + SSL).
- **Scale**: stateless API, pooled Postgres, per-site Netlify isolation → thousands of sites.

## 4. Data model (Prisma, Strategy A)

`User` · `Site(ownerId, name, framerUrl, themeRef, status)` ·
`Page(siteId, slug, type[imported|cms], contentJSON, seoId)` ·
`BlogPost(siteId, slug, title, body, coverId, status, publishedAt, seoId)` ·
`Collection(siteId, name, schemaJSON)` + `CollectionItem(collectionId, dataJSON, slug)` ·
`MediaAsset(siteId, url, alt, w, h)` · `NavMenu(siteId)` + `NavItem(menuId, label, href, order, parentId)` ·
`Form(siteId, fieldsJSON)` + `FormSubmission(formId, dataJSON)` ·
`Seo(title, description, ogImage, canonical, noindex)` ·
`SiteSettings(siteId, json)` · `Domain(siteId, hostname, status)` ·
`Deployment(siteId, provider, netlifyDeployId, buildHookUrl, status, log)`.

Each site's CMS data is fully isolated by `siteId` + ownership checks on every query.

## 5. Phased rollout (each phase: build → test → commit)

- **Phase 0 — Decisions + provisioning.** Lock Strategy (A), stack
  (Postgres+Prisma+Clerk), rebrand name. Provision `DATABASE_URL`, Clerk keys,
  Netlify token.
- **Phase 1 — Auth + multi-tenant foundation.** Prisma + core schema (User, Site,
  Deployment); Clerk auth; replace single-password admin; on conversion, create a
  `Site` owned by the user; dashboard lists the user's sites. *Test: signup →
  convert → isolated site appears.*
- **Phase 2 — Core CMS.** Global settings, SEO metadata, Nav menus + editors.
- **Phase 3 — Content.** Pages, Blog (rich editor), Collections + items.
- **Phase 4 — Media library.** Upload (Blob), alt text, reuse in content.
- **Phase 5 — Forms.** Builder + submissions inbox.
- **Phase 6 — Renderer.** Next.js template that builds a site from CMS content
  (SSG), composing imported design + CMS content. *Test: Lighthouse + correctness.*
- **Phase 7 — Publish pipeline.** Per-site Netlify build hooks; "Publish" → rebuild
  + deploy; status tracking; incremental. *Test: edit → publish → live updates.*
- **Phase 8 — Custom domains.** Netlify domain API; verify + SSL.
- **Phase 9 — Hardening/scale.** Caching, rate limits, build tokens, observability.

## 6. Guarantees

- Converter keeps working untouched throughout.
- Static-first (SSG) generated sites → Lighthouse stays high.
- Per-site data isolation + auth on every query.
- Incremental commits, each phase tested before the next.

## 7. Open decisions (gate Phase 1)

1. **Content model**: A (recommended) vs B vs hybrid.
2. **Stack**: Postgres+Prisma+**Clerk** (rec) vs Auth.js vs Supabase-all-in-one.
3. **Rebrand**: new name (optional, can defer).
4. **Provisioning needed to start Phase 1**: a Postgres `DATABASE_URL` (Neon free
   tier is easiest), Clerk publishable + secret keys, a Netlify access token.
