# Security and regression verification

## Automated evidence and its limits

`npm run build && npm test` runs XSS/content checks, the actual migration and RLS
in PGlite (embedded PostgreSQL), and production HTML/SEO tests with a simulated
Supabase HTTP service. PGlite supplies minimal `auth.users`, `auth.uid()`, and
Storage definitions; the migration itself is unmodified. It verifies actual
PostgreSQL privileges, policies, constraints, triggers and roles.

`npm run test:browser` uses Microsoft Edge for the built homepage/CMS shell at
three viewport widths. The administrator workflow uses a simulated Supabase API,
real TipTap and real browser image conversion. This is **not evidence that a live
Supabase project's Auth, Storage gateway or RLS is configured**.

No real Supabase project was available. Complete the following live checks before
production; do not mark them passed until run.

## Required 16-test matrix

| # | Live procedure | Expected | Automated coverage |
| --- | --- | --- | --- |
| 1 | Read published article in incognito and REST | Full article visible | PostgreSQL + SSR |
| 2 | Request draft by known ID/slug anonymously | No REST row; page 404 | PostgreSQL + SSR |
| 3 | Anonymous POST to articles | Denied; no creation | PostgreSQL |
| 4 | Anonymous PATCH of test article | Denied; unchanged | PostgreSQL |
| 5 | Anonymous DELETE of test article | Denied; retained | PostgreSQL |
| 6 | Anonymous Storage upload | Denied; no object | PostgreSQL policy |
| 7 | Non-admin Auth user repeats CRUD/category/image operations | No CMS; denied/zero rows | PostgreSQL + simulated browser |
| 8 | Authorized admin saves draft | Admin sees it; anonymous cannot | PostgreSQL + simulated browser |
| 9 | Admin publishes draft | Public article and sitemap entry | PostgreSQL + browser + SSR |
| 10 | Admin edits published article | Updated text and timestamp | PostgreSQL + simulated browser |
| 11 | Delete then cancel; delete then confirm | Cancel retains; confirm deletes | Browser + PostgreSQL |
| 12 | Logout then revisit admin/editor URL | Login; no private content | Simulated browser + PostgreSQL role reset |
| 13 | Open /admin/preview/guess anonymously | Empty SSR shell then login | SSR + browser |
| 14 | Inspect HTML/JS, configuration, browser storage | No real password/privileged key | Source review + browser assertion |
| 15 | Call Supabase directly without UI | Same restrictions | PostgreSQL; live checks below |
| 16 | Insert malicious rich-text JSON in a test draft | No scripts, handlers or unsafe links execute | Allowlist renderer tests |

Also revoke an admin role while logged in: subsequent writes must fail immediately
under RLS. The UI checks session/role on visibility and every minute. Test expired
sessions. Logout clears the local session; a copied access token can remain valid
until expiry. Role revocation is necessary when responding to account compromise.

## Live direct API checks — disposable test project only

Create `rls-test-published` (published) and `rls-test-draft` (draft) in the CMS, with
optional images. Copy their UUIDs and a category UUID from Table Editor. Use
disposable content: if a policy is misconfigured, these attempted writes may work.

In DevTools Console, use the project's public configuration:

```js
const base = 'https://YOUR_PROJECT_REF.supabase.co';
const publicKey = 'sb_publishable_REPLACE_ME';
let headers = { apikey: publicKey, 'Content-Type': 'application/json', Prefer: 'return=representation' };
const publishedId = 'REPLACE_WITH_TEST_PUBLISHED_UUID';
const draftId = 'REPLACE_WITH_TEST_DRAFT_UUID';
const categoryId = 'REPLACE_WITH_CATEGORY_UUID';
async function api(path, method = 'GET', body) {
  const r = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.text() };
}
await api(`/rest/v1/articles?id=eq.${publishedId}`); // One row
await api(`/rest/v1/articles?id=eq.${draftId}`); // []
await api('/rest/v1/rpc/is_admin', 'POST', {}); // false
await api('/rest/v1/admin_roles'); // denied
await api('/rest/v1/articles', 'POST', { slug: 'rls-unauthorized-test', title_sr: 'Disposable test', category_id: categoryId }); // denied
await api(`/rest/v1/articles?id=eq.${publishedId}`, 'PATCH', { title_sr: 'MUST NOT CHANGE' }); // denied
await api(`/rest/v1/articles?id=eq.${publishedId}`, 'DELETE'); // denied
```

Verify article state in the authorized dashboard afterwards. Non-admin
authenticated UPDATE/DELETE may return `200 []` or affect zero rows; this is normal
RLS filtering. Verify the records, not just the response status.

Anonymous Storage test:

```js
const path = `${crypto.randomUUID()}/${crypto.randomUUID()}.webp`;
const upload = await fetch(`${base}/storage/v1/object/article-images/${path}`, {
  method: 'POST',
  headers: { apikey: publicKey, 'Content-Type': 'image/webp' },
  body: new Uint8Array([82,73,70,70,0,0,0,0,87,69,66,80]),
});
console.log(upload.status, await upload.text()); // denied; no object
await fetch(`${base}/storage/v1/object/authenticated/article-images/REPLACE_WITH_DRAFT_IMAGE_PATH`, {
  headers: { apikey: publicKey },
}); // denied/not found
```

Repeat image SELECT with a published image: allowed. Unpublish and repeat: denied.
The `/storage/v1/object/public/article-images/...` endpoint must not expose this
private bucket. For legacy anon keys, add `Authorization: Bearer YOUR_ANON_KEY`
alongside `apikey` when using raw HTTP; never use a service-role key for these checks.

### Non-admin identity

1. Manually create a second disposable Auth user without an `admin_roles` entry.
   Public signup remains disabled.
2. Log in at the local Vite `/admin`. The account must see the unauthorized message.
3. In that local site's DevTools Console, use the existing session without printing it:

   ```js
   const { supabase } = await import('/src/cms/supabase.js');
   const { data: { session } } = await supabase.auth.getSession();
   headers = { ...headers, Authorization: `Bearer ${session.access_token}` };
   ```

4. Repeat REST tests. Also attempt category writes, role INSERT and Storage writes
   using this Authorization header. They must fail or affect zero rows.
5. Delete the disposable Auth user after testing.

### Registration, admin and images

Call `/auth/v1/signup` in the test project using its public key and a disposable,
operator-owned test email/password. It must report that signup is disabled, and
no uninvited Auth user should appear. Do not turn signup on for this test.

Use the authorized account to preview/create/publish/edit/unpublish/delete a test
article. Confirm cancellation in the delete dialog retains it. Upload a large JPEG
and a smaller PNG: verify WebP, <=1600 px on the longest edge, <=2 MB, no upscaling,
sharpness, and correct aspect ratio. Renamed text/SVG and oversized originals fail.

Attempt deleting a referenced image via the Storage API: it must remain. Replace
or detach it in the article, save, and verify old-object cleanup. Failed orphan
cleanup is recoverable through the dashboard after 24 hours. Do not delete Storage
metadata manually through SQL.

## Existing site regression checklist

- Homepage, five anchor targets, navigation and shared SR/EN toggle.
- Existing text, logo/favicon, LegalService JSON-LD and canonical.
- Contact validation and success/error UI; manually confirm real EmailJS delivery.
- Existing contact details, Instagram and Google map.
- Public filters/cards and long text at mobile, tablet and desktop widths.
- No new uncaught browser errors; actual image/network requests succeed.
- Sitemap includes homepage/listing/published articles, never drafts.
- Robots points to the canonical sitemap.
- Draft/unknown page is 404/noindex; backend outage is 503 with generic text.
- View Source includes public legal text and unique SEO tags.
- A new publication becomes visible without rebuilding Vercel.

Record date, environment and actual outcomes before promoting a deployment.
