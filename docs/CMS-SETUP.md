# Articles CMS: setup and operation

## What is implemented

The original React/Vite homepage, its prerendering, EmailJS contact form, assets,
and `LanguageProvider` remain. `/clanci` and `/clanci/:slug` reuse the header,
footer, design tokens and SR/EN context. `/admin` loads the CMS and TipTap on demand.

Supabase provides PostgreSQL, Auth, and private Storage. There is no separate
backend service to host. One Vercel function renders public article HTML, returns
public article data, streams published images, and generates the live sitemap.
It uses the **public key with an anonymous session** and never accepts a user's
session for public rendering. Changes appear without rebuilding the site.

**MANUAL STEPS:** You must create/configure Supabase, create and authorize the
lawyer, configure Vercel, and complete the live acceptance checks below. No
Supabase or Vercel project was provisioned or deployed by this implementation.

## 1. Create Supabase

1. Sign in at [Supabase](https://supabase.com/dashboard) and create a project.
2. Use an organization you control and a descriptive project name, such as
   `gornik-articles`. Choose the Free plan if its current limits fit your usage.
3. Choose a nearby European region, for example Frankfurt if offered. Keep the
   Vercel function region nearby if your plan permits. Region choice does not
   require any application code changes.
4. Generate a strong **database password** and keep it in a password manager.
   It is not the lawyer's login password and is not needed by this application.
5. Wait until the project is ready. Start with a separate test project or Vercel
   preview before configuring the production website.

## 2. Install the schema, roles, RLS and bucket

1. Open **SQL Editor → New query**.
2. Paste the entire file
   [`supabase/migrations/202609150001_articles.sql`](../supabase/migrations/202609150001_articles.sql).
3. Run it once. The migration runs inside a transaction; an error rolls it back.
   Do not rerun it on a successfully initialized project. Do not drop existing
   tables to clear an error: first check whether this project already has a CMS.
4. In Table Editor, confirm `articles`, `categories`, and `admin_roles` exist.
   Seven starter categories are included and can be renamed/added in `/admin`.
5. Confirm RLS is enabled on all three tables. The migration enables it and
   creates the policies; no separate dashboard policy creation is needed.
6. Open **Storage** and confirm the `article-images` bucket exists and is
   **private**. Its limit is 2 MB per optimized file and MIME allowlist is
   `image/webp`. Do not switch this bucket to public.

### Database model

| Table | Purpose |
| --- | --- |
| `admin_roles` | Explicit allowed Auth UUIDs. Only the database/project operator can change these roles. |
| `categories` | UUID, unique Serbian name, English name. Foreign keys prevent deleting a category still used by an article. |
| `articles` | UUID, unique slug, category FK, SR content, optional EN content, author, image path/alt text, draft/published status and timestamps. |

`content_sr` and `content_en` are TipTap JSON, not arbitrary HTML. Serbian title is
required. An English version must have its title, excerpt and content together,
or all three remain null. Both versions share an article URL, category, image,
publication state and author. No translation service is used. If the EN site has
no manually authored English version, it displays the Serbian text with a notice
and `lang="sr"` on the legal content.

The database controls `created_at`, `updated_at` and the first `published_at`.
Unpublishing preserves publication history. Slug, category, status, field sizes,
image ownership and translation completeness have constraints. Published-date
and category indexes support public reads. An image belongs to one article UUID;
paths are unique across records. Two open editor tabs use `updated_at` to prevent
silently overwriting each other's edits.

### Why the policies work

- `is_admin()` is a small, fixed-search-path, security-definer function that
  checks `auth.uid()` against `admin_roles`. It does not trust client metadata.
- Anonymous users can select published articles and category names. They have
  no table write grants. RLS excludes drafts even for direct API requests.
- Authenticated users without an explicit role still only see published articles.
  Their insert policies fail; updates/deletes affect no rows.
- Explicit administrators can read/write articles and categories. No browser
  user, including an admin, can add entries to `admin_roles`.
- Storage SELECT allows admins, or objects referenced by a published article.
  INSERT and DELETE require the explicit admin role. UPDATE is not permitted;
  image replacements always get a new filename.
- Storage DELETE also refuses any image still referenced by an article.
  The bucket is private, so the public-object endpoint cannot bypass these rules.

See [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
and [Storage access control](https://supabase.com/docs/guides/storage/security/access-control).

## 3. Configure authentication before creating the lawyer

1. In **Authentication → Sign In / Providers** (dashboard labels may vary), keep
   Email/password enabled. Disable **Allow new users to sign up** in the Auth
   general/user-signup settings. Disable anonymous sign-ins and unused providers.
   Hiding a signup button alone would not prevent registration.
2. Set the Auth **Site URL** to `https://www.advokatgornik.com`.
3. Add these exact allowed redirect URLs:
   - `https://www.advokatgornik.com/admin/reset-password`
   - `http://localhost:5173/admin/reset-password` for development
   - `http://127.0.0.1:4173/admin/reset-password` for production preview
   - The exact preview deployment's `/admin/reset-password` URL if testing there.
4. Use a strong password policy (at least 12 characters) and keep Supabase's
   Auth rate limits enabled. Do not enable public signup for testing login.
5. For production password reset delivery, configure an SMTP provider in Auth
   email settings. The built-in mail service has restrictive limits; verify
   delivery to the lawyer's real email before relying on it.

References: [Auth configuration](https://supabase.com/docs/guides/auth/general-configuration),
[password authentication and recovery](https://supabase.com/docs/guides/auth/passwords).

## 4. Create and explicitly authorize the lawyer

1. Open **Authentication → Users → Add user → Create new user**.
2. Enter the lawyer's actual email and a strong unique password. Confirm the
   email using the dashboard's confirmation option after verifying the address.
   Deliver the initial password privately; do not put it in code, chat logs,
   `.env`, issue trackers, or Git.
3. Copy that user's UUID from Authentication → Users.
4. In SQL Editor, run this with the UUID substituted:

   ```sql
   insert into public.admin_roles (user_id)
   values ('REPLACE_WITH_AUTH_USER_UUID'::uuid);
   ```

5. This is the explicit authorization step. Creating an Auth user alone does not
   grant CMS access. To revoke an administrator later:

   ```sql
   delete from public.admin_roles
   where user_id = 'REPLACE_WITH_AUTH_USER_UUID'::uuid;
   ```

6. To reset a password, use **Zaboravljena lozinka / Forgot password** on `/admin`,
   enter the account email, and follow the email link to `/admin/reset-password`.
   Enter a new password there. This requires an authenticated recovery session
   and the explicit admin role. If mail delivery fails, the project operator
   should repair SMTP/redirect settings and send the reset again through Auth.
   Passwords are managed by Supabase Auth, never by application configuration.

## 5. Environment variables

Obtain the **Project URL** and **publishable key** from the project's Connect
dialog or **Settings → API / API Keys**. Use `sb_publishable_...`. A legacy anon
key also works; a `service_role` key or `sb_secret_...` key must never be used.

| Variable | Local `.env.local` | Vercel | Exposure |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | Required | Required at build and runtime | Public |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Required | Required at build and runtime | Public; RLS enforces access |
| `VITE_EMAILJS_SERVICE_ID` | Keep existing | Keep existing | Existing public EmailJS configuration |
| `VITE_EMAILJS_TEMPLATE_ID` | Keep existing | Keep existing | Existing public EmailJS configuration |
| `VITE_EMAILJS_PUBLIC_KEY` | Keep existing | Keep existing | Existing public EmailJS configuration |
| `VITE_CONTACT_TO_EMAIL` | Keep existing | Keep existing | Existing contact configuration |

No privileged server secret is required. **There is no admin-password environment
variable.** The server uses the same public Supabase configuration and anonymous
RLS permissions; it never uses a service-role key. Everything prefixed `VITE_`
can appear in the browser bundle. `.env.example` contains placeholders only.

In the existing `.env.local`, preserve all EmailJS values and add:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
```

Do not replace the existing `.env.local` blindly. Environment files and generated
build files are ignored by Git. Restart the dev server after changing variables;
rebuild/redeploy when changing Vercel variables.

## 6. Run locally

Use Node.js 24 and npm:

```sh
npm ci
npm run dev
```

Open `http://localhost:5173`, `/clanci`, and `/admin`. Vite provides the public CMS
API locally. Development article pages fetch their content in the browser.
Production rendering can be checked with:

```sh
npm run build
npm run preview
```

Open `http://127.0.0.1:4173/clanci`. View Page Source: published content and its
metadata must be present before JavaScript executes. `preview` includes the same
CMS route handling as Vercel. A plain static file server cannot serve this CMS.

Checks:

```sh
npm run lint
npm run build
npm test
npm run test:rls
npm run test:browser
```

The project is JavaScript, with no TypeScript compiler configuration or existing
type-check command. ESLint, production compilation and tests are its checks.
Browser tests use installed Microsoft Edge on Windows. On another machine,
install Playwright Chromium (`npx playwright install chromium`) and remove the
`channel: 'msedge'` option from `playwright.config.mjs` or set an appropriate channel.
Tests use synthetic data. They do not require real administrator credentials.

## 7. Configure the existing Vercel project

1. Keep the existing project, repository connection, domain and EmailJS settings.
2. In **Settings → Environment Variables**, add both Supabase variables. Use
   separate values for Preview if you created a separate test Supabase project.
   Set them for Production and the intended preview/development environments.
3. Use Node.js **24.x**, build command **`npm run build`**, output directory
   **`dist`**. The checked-in `vercel.json` configures Vite and the function.
4. Deploy a preview first. Check that `/api/cms` is deployed as a Node function,
   with `server-dist/handler.js` and `server-dist/shell.html` included.
5. Verify `/clanci`, a published article, `/admin`, `/sitemap.xml`, and
   `/robots.txt`. The live sitemap rewrite must reach the function. The build
   deliberately removes the old static sitemap to prevent it shadowing the live one.
6. Preserve the existing non-www → www and HTTP → HTTPS domain redirects. Do not
   add a blanket SPA rewrite that overrides the CMS function routes.
7. Promote/deploy to Production only after the live checklist passes. No deploy
   was performed as part of this code change.
8. Submit `https://www.advokatgornik.com/sitemap.xml` in Google Search Console.

Vercel serves the homepage statically as before. Public CMS responses are
`no-store` so unpublishing is effective on subsequent requests. `/admin` is
`noindex, nofollow, noarchive`, with no private SSR payload. Drafts never enter
the public sitemap. Unknown article URLs return HTTP 404; backend outages return
503 rather than pretending articles do not exist.

References: [Vercel Node functions](https://vercel.com/docs/functions/runtimes/node-js),
[Vercel project configuration](https://vercel.com/docs/project-configuration).

## 8. Create the first article

1. Visit `/admin`, enter the authorized email and password, then **PRIJAVI SE**.
2. Choose **Novi članak**. Enter the Serbian title; the URL slug is generated
   automatically, including Serbian Latin/Cyrillic transliteration.
3. Select a category. Enter the author, excerpt and legal text using the editor.
   Toolbar controls provide paragraphs, H2/H3, bold, italic, lists, links and undo/redo.
4. Optionally enable the English version and enter a **manually authored** title,
   excerpt and content. Never paste an unreviewed machine translation as legal advice.
5. Optionally select an image and describe it for screen-reader users. Leave alt
   text empty if the image is purely decorative. English alt text is independent.
6. Choose **Pregled**. This renders the unsaved content inside the protected
   editor using the same public article layout. It does not create a public link.
7. Choose **Sačuvaj nacrt**. Drafts can have unfinished content; publishing
   requires an excerpt and article text. No automatic saving occurs.
8. Edit the draft and choose **Objavi** when ready. Open `/clanci` in an incognito
   window and follow its article link. Publication does not require a redeploy.
9. Published articles can be edited or returned to draft. Changing the slug
   changes the URL; the previous URL becomes a 404. Keep published slugs stable.
10. **Obriši** asks for explicit confirmation. Cancel retains the article.
    Confirm permanently removes it and attempts to remove its detached image.
11. Choose **Odjavi se** when finished. The Supabase client manages session tokens
    normally; the application never persists passwords. Logout removes the
    browser's local session. Already-issued tokens can remain valid until expiry,
    so revoke `admin_roles` as well when responding to a compromised account.

## 9. Images and storage maintenance

- Accepted originals: actual JPEG, PNG or WebP signatures and matching MIME,
  maximum 10 MB. Decoding must succeed. SVG and arbitrary file extensions are rejected.
- Browser decoding/re-encoding removes source metadata. The longest edge is at
  most 1600 px, with no upscaling, WebP quality 0.88, and a 2 MB output ceiling.
- A file is uploaded only when saving, under `article UUID/random UUID.webp`.
  Selection/preview alone creates no Storage objects.
- Public images pass through the anonymous Vercel function and Storage RLS;
  they are not public bucket URLs. Unpublishing stops subsequent public reads.
- Admin previews use short-lived (60-second) signed URLs refreshed while editing.
  Such a URL remains usable by someone who possesses it until it expires. It is
  never placed in public HTML or the sitemap. Previously downloaded content cannot
  be recalled from a reader's device.
- Replacements detach old images only after a successful save, then remove them.
  A failed request may leave an orphan; **Očisti nekorišćene slike** removes
  unreferenced uploads older than 24 hours. The grace period protects active work.
  Storage RLS independently prevents deleting any still-referenced image.
- Bucket MIME checks are an additional guard, not a byte-level antivirus scanner.
  The normal editor validates and re-encodes bytes. Only trusted admins can upload
  through the API; public image responses are fixed `image/webp` with `nosniff`.

## 10. Live acceptance and security checks — MANUAL, before production

Use a **test Supabase project / Vercel preview**, not irreplaceable production
articles. See [`SECURITY-TESTING.md`](SECURITY-TESTING.md) for the full 16-test matrix
and direct API checks. Test with three identities: anonymous incognito window,
a manually created Auth user absent from `admin_roles`, and the authorized lawyer.

Also check:

- SR/EN changes public cards, filters, article metadata labels, login, dashboard,
  editor and toolbar. A Serbian-only article stays Serbian on the EN site.
- A manual English version appears only when provided. Categories display the
  appropriate manually entered name. Both UI languages persist across navigation.
- JPEG/PNG/WebP upload, sharpness, aspect ratio, removal and replacement work.
  Unsupported files fail with a friendly message. Check optimized size in Storage.
- Draft URL is 404 in incognito and absent from the sitemap. Publish adds it;
  unpublish removes it. Draft preview requires the authorized session.
- Inspect article Page Source for title, description, canonical, Article JSON-LD
  and actual article text. Inspect the homepage's original LegalService JSON-LD.
- Test homepage anchors, logo/favicon, desktop/mobile menu, language toggle,
  existing external/contact links, and contact submission. Confirm a real EmailJS
  message reaches its existing recipient; automated tests do not send messages.
- Check browser console and network errors. Test expired/invalid sessions and
  unavailable Supabase. Generic user-facing messages must not expose stack traces.

## Operational boundaries

This is a small CMS, not an editorial publishing platform. No autosave, revision
history, scheduled publishing, shared image library, or automatic slug redirects
are included. Saving edits to a published article updates it immediately; use
draft status if you want it temporarily removed. Keep database and Storage
backups appropriate to your chosen plan; deletion has confirmation but no undo.
Monitor Supabase/Vercel quotas and free-project availability in their dashboards.
