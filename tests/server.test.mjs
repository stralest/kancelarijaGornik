import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { handle } from '../server-dist/handler.js';

const fixture = { id: '20000000-0000-0000-0000-000000000001', slug: 'published', title_sr: 'Objavljen stručni članak', excerpt_sr: 'Jedinstveni opis članka.', content_sr: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Vidljiv tekst bez JavaScript-a.' }] }] }, status: 'published', category_id: 'c1', categories: { id: 'c1', name_sr: 'Građansko pravo', name_en: 'Civil Law' }, author: 'Advokatska kancelarija Gornik', created_at: '2026-01-01T10:00:00Z', published_at: '2026-01-01T10:00:00Z', updated_at: '2026-01-02T10:00:00Z' };
test('built production handler provides crawlable HTML, live sitemap and protected admin shell', async t => {
  let fail = false;
  const requests = [];
  const backend = createServer((req, res) => {
    requests.push(req);
    res.setHeader('content-type', 'application/json');
    if (fail) { res.statusCode = 500; res.end('{}'); return; }
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.includes('/articles')) { res.end(JSON.stringify(url.searchParams.get('slug') === 'eq.draft' ? [] : [fixture])); return; }
    if (url.pathname.includes('/categories')) { res.end(JSON.stringify([fixture.categories])); return; }
    res.statusCode = 403; res.end('{}');
  });
  await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve));
  const env = { VITE_SUPABASE_URL: `http://127.0.0.1:${backend.address().port}`, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_fixture' };
  async function request(url, method = 'GET') {
    const headers = {}; let body = '';
    const res = { statusCode: 200, setHeader: (k, v) => { headers[k.toLowerCase()] = v; }, end: value => { body = value?.toString() || ''; } };
    await handle({ url, method, headers: { authorization: 'Bearer must-never-be-forwarded', cookie: 'admin=must-never-be-forwarded' } }, res, { env });
    return { status: res.statusCode, headers, body };
  }
  try {
    await t.test('published article HTML contains text, canonical, metadata, structured data and styles', async () => {
      const result = await request('/clanci/published');
      assert.equal(result.status, 200);
      assert.match(result.body, /property="og:image" content="https:\/\/www\.advokatgornik\.com\/article-default\.jpg"/);
      assert.match(result.body, /class="article-image" src="\/article-default\.jpg" alt="Advokatska kancelarija Gornik"/);
      for (const expected of ['Vidljiv tekst bez JavaScript-a.', 'Jedinstveni opis članka.', 'https://www.advokatgornik.com/clanci/published', 'application/ld+json', 'datePublished', 'CmsApp-', '/favicon.ico']) assert.ok(result.body.includes(expected), expected);
      assert.equal(result.headers['cache-control'], 'private, no-store');
      assert.match(result.body, /href="\/#contact"/);
      assert.ok(requests.every(r => r.headers.authorization !== 'Bearer must-never-be-forwarded' && !r.headers.cookie));
    });
    await t.test('draft public URL is a real noindex 404', async () => {
      const result = await request('/clanci/draft');
      assert.equal(result.status, 404); assert.match(result.headers['x-robots-tag'], /noindex/);
      assert.doesNotMatch(result.body, /Vidljiv tekst/);
    });
    await t.test('admin routes have no draft payload or rendered admin data', async () => {
      for (const path of ['/admin', '/admin/preview/predictable-id']) {
        const result = await request(path);
        assert.equal(result.status, 200); assert.match(result.headers['x-robots-tag'], /noindex/);
        assert.match(result.body, /<div id="root"><\/div>/); assert.doesNotMatch(result.body, /cms-data|Vidljiv tekst/);
      }
    });
    await t.test('listing and sitemap request only published articles and include homepage', async () => {
      assert.equal((await request('/clanci')).status, 200);
      const result = await request('/sitemap.xml');
      assert.match(result.headers['content-type'], /xml/);
      assert.ok(result.body.includes('<loc>https://www.advokatgornik.com/</loc>'));
      assert.ok(result.body.includes('/clanci/published'));
      assert.ok(requests.filter(r => r.url.includes('/articles')).every(r => new URL(r.url, 'http://localhost').searchParams.get('status') === 'eq.published'));
    });
    await t.test('invalid image paths and writes are rejected', async () => {
      assert.equal((await request('/api/cms?image=../../private')).status, 404);
      assert.equal((await request('/admin', 'POST')).status, 405);
    });
    await t.test('backend failures produce noindex 503 without internal errors', async () => {
      fail = true;
      const result = await request('/clanci');
      assert.equal(result.status, 503); assert.match(result.headers['x-robots-tag'], /noindex/);
      assert.doesNotMatch(result.body, /stack trace|public-test-key|must-never-be-forwarded/);
      assert.equal((await request('/sitemap.xml')).status, 503);
    });
  } finally { await new Promise(resolve => backend.close(resolve)); }
});
test('homepage SEO, contact and assets survive the build', async () => {
  const home = await readFile('dist/index.html', 'utf8');
  for (const id of ['home', 'about', 'services', 'why-us', 'contact']) assert.ok(home.includes(`id="${id}"`));
  for (const value of ['LegalService', 'https://www.advokatgornik.com/', '/favicon.ico', '/logo-gornik.jpg', 'name="from_email"', 'name="message"', 'href="/clanci"']) assert.ok(home.includes(value), value);
  assert.match(await readFile('dist/robots.txt', 'utf8'), /Sitemap: https:\/\/www.advokatgornik.com\/sitemap.xml/);
  assert.ok((await readFile('dist/favicon.ico')).length);
  assert.ok((await readFile('dist/logo-gornik.jpg')).length);
  assert.doesNotMatch(home, /service_role|sb_secret_/);
});
