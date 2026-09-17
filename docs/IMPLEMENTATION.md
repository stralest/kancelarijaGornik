# Implementation report

## Continuation check, 16 September 2026

The existing Articles/CMS work was preserved. The observed blank `/admin` page
could not be reproduced against the running local dev server: it displayed the
configuration message with Supabase unset. The admin route now also handles a
malformed public URL, a failed lazy admin bundle, a stalled Auth check, and genuine
Auth/role-check errors with visible configuration or retry states. A missing Auth
session continues to display the login form. No credentials or RLS rules changed.

Added a browser check for the unconfigured `/admin` route in both languages.
Lint, production build, and all 22 Node/PostgreSQL/server tests passed. In the
browser suite, eight public/site checks passed; two admin checks first failed
because a missing session was mistakenly classified as an Auth error. After the
correction, both targeted admin checks passed. The Playwright runner did not exit
after printing the passing checks and was stopped; its web-server cleanup behavior
needs a separate investigation if a zero-exit browser run is required. Live
Supabase and Vercel verification still requires the manual setup below.

## Architecture and inspection

The existing site was inspected before implementation: all source components and
styles, i18n, root/bootstrap, package versions, prerender script, SEO configuration,
public assets, environment template, Git ignore rules and deployment instructions.
The working tree was initially clean. There were no repository AGENTS instructions
or existing backend, router, Supabase integration, Vercel configuration, TypeScript
configuration or test suite. The production URL could not be fetched through the
available web tool; regression checks used the repository's built production site.

Original installed stack: React/React DOM 19.2.6, Vite 8.0.13, Vite React plugin
6.0.2, Lucide 1.16.0, ESLint 10.4.0. The homepage is one React page prerendered by
`scripts/seo-build.mjs`; language uses `LanguageProvider` and `gornik-language`
localStorage. Contact uses EmailJS. Styling uses CSS variables, Inter and Playfair
Display, navy/gold colors, and existing responsive component styles.

The homepage stays statically prerendered. New CMS routes use the same header,
footer, language provider, typography and colors. Existing anchors still work on
the homepage; links on article/admin pages return to homepage anchors. The navbar
switches to its existing mobile menu below 1200 px to accommodate the added item.

Supabase JS 2.116.0 and TipTap 3.31.3 provide authentication, persistence, images and
editing. Only the admin bundle loads TipTap/Auth. Public Vercel rendering always
uses an anonymous client. Vercel needs one Node function, with no separate server
deployment. PostgreSQL RLS is the authorization boundary. Private Storage prevents
draft-image disclosure. Bilingual content is manually entered in localized fields
on one row, so a save is atomic; no translation API is used.

Security audit updates changed compatible dependencies in the lockfile, including
Vite to 8.3.0. Node 24.x is the tested runtime. No `--force` dependency upgrade was
used. The original homepage content, contact implementation, footer, logo, favicon
and `seo.config.mjs` were not edited.

## Features

- `/clanci`: published cards with optional image, title, date, excerpt, category,
  read-more links, category filtering and translated UI.
- `/clanci/:slug`: server-rendered legal text, title/description, canonical,
  Open Graph/Twitter tags and Article JSON-LD. 404/noindex for absent/draft URLs.
- `/admin`: email/password login, explicit role check, logout, dashboard,
  CRUD, status, category CRUD, editor, preview, draft/publication, confirmation.
- TipTap: paragraphs, H2/H3, bold, italic, lists, links, undo/redo. Public/preview
  HTML comes only from an escaping allowlist renderer over JSON.
- Images: signature/MIME validation, 10 MB originals, <=1600 px longest edge,
  WebP 0.88, no upscaling, <=2 MB optimized output, UUID paths and orphan cleanup.
- Shared SR/EN UI; optional manually authored English legal content, Serbian
  fallback notice. Shared URL/publication state, no automated translation.
- SQL: `articles`, `categories`, `admin_roles`, indexes, constraints, timestamps,
  RLS, explicit grants, private bucket and object policies.
- Runtime sitemap includes existing homepage, listing and published articles.
  The original homepage LegalService metadata and robots generation remain.

## Exact created files (29)

```text
api/cms.js
docs/CMS-SETUP.md
docs/IMPLEMENTATION.md
docs/SECURITY-TESTING.md
playwright.config.mjs
scripts/build-server.mjs
scripts/preview-server.mjs
server/data.js
server/handler.js
server/render.jsx
src/cms/Admin.jsx
src/cms/ArticleForm.jsx
src/cms/CmsApp.jsx
src/cms/Editor.jsx
src/cms/PublicArticles.jsx
src/cms/cms.css
src/cms/content.js
src/cms/images.js
src/cms/public-config.js
src/cms/supabase.js
src/i18n/cms-translations.js
supabase/migrations/202609150001_articles.sql
tests/browser/admin.spec.mjs
tests/browser/articles.spec.mjs
tests/browser/site.spec.mjs
tests/content.test.mjs
tests/database.test.mjs
tests/server.test.mjs
vercel.json
```

## Exact modified files (13)

```text
.env.example
.gitignore
README.md
eslint.config.js
package-lock.json
package.json
scripts/seo-build.mjs
src/components/Navbar.css
src/components/Navbar.jsx
src/i18n/LanguageContext.jsx
src/i18n/translations.js
src/main.jsx
vite.config.js
```

Generated `dist/`, `server-dist/`, `test-results/`, dependencies and local environment
files are not source deliverables and are ignored. The existing `.env.local` was
not changed. No actual credentials were written into tracked files. Synthetic
test identities exist only in tests and are not real administrator credentials.

## Verification results — 15 September 2026

| Check | Result |
| --- | --- |
| Existing baseline lint | Passed before implementation |
| `npm run lint` | Passed |
| `npm run build` | Passed, browser + prerendered homepage + server bundle |
| `npm test` | 22 tests passed |
| `npm run test:rls` | Included in the passing PostgreSQL tests; migration/policies executed |
| `npm run test:browser` | 9 tests passed in Microsoft Edge |
| Dependency security audit | 0 vulnerabilities after compatible updates |
| `git diff --check` | Passed |
| TypeScript type-check | Not applicable; existing project is JavaScript |
| Visual checks | Reviewed desktop cards, mobile article, admin editor/preview |
| Live Supabase Auth/Storage/API | **Pending manual setup and live verification** |
| Real EmailJS delivery | **Pending manual confirmation**; automated tests send no messages |
| Live Vercel routing/deployment | **Pending manual deployment** |

Automated PostgreSQL tests simulate Supabase's service schemas but execute the
actual migration, privileges, RLS and triggers. Browser CMS tests simulate the
Supabase API while exercising the real UI, editor and image processing. SSR tests
use a simulated backend and the built production function. These do not establish
that an unconfigured live Supabase/Vercel account is secure or deployed.

The admin bundle is approximately 109 KB gzip, loaded only for admin routes.
The public CMS code and styles are separate from the homepage entry; the browser
build's homepage entry is approximately 61 KB gzip plus shared React/site chunks.
No TipTap editor is loaded just to browse the homepage or public article pages.

## Required manual work and operating instructions

Follow [CMS-SETUP.md](CMS-SETUP.md) for project creation, migration, RLS, private
bucket, Auth signup disabling, lawyer account/role, environment
variables, local running, Vercel setup, and the first-article workflow.

Follow [SECURITY-TESTING.md](SECURITY-TESTING.md) for all 16 requested security
checks, direct REST/Storage calls, non-admin tests, SR/EN/draft/image checks and
existing-site regression verification. Complete them in a disposable test project
and Vercel preview before production promotion.

Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are added. Both are
public and belong locally and in Vercel. The build rejects recognized privileged
keys in the public-key setting. Existing EmailJS variables stay in place. No
service-role key, database password or lawyer password is required by the app.

Known boundaries: no autosave/revisions/scheduled publishing/slug redirects;
changing a published slug invalidates old links. Editing a published article is
immediate. Draft preview signed image URLs expire after 60 seconds. Unpublishing
revokes new reads, but cannot recall previously downloaded content. No deployment
or account configuration was performed automatically.
