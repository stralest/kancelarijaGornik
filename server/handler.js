import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { publicClient, allRows, loadPublic } from './data';
import { renderPage } from './render';
import { escapeHtml } from '../src/cms/content';
import { seo } from '../seo.config.mjs';

export async function handle(req, res, { shell, env } = {}) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  if (!['GET', 'HEAD'].includes(req.method)) { res.setHeader('Allow', 'GET, HEAD'); res.statusCode = 405; res.end(); return; }
  const url = new URL(req.url, seo.siteUrl);
  const path = url.searchParams.get('path') || url.searchParams.get('data') || url.pathname;
  try {
    const client = publicClient(env);
    if (url.searchParams.has('image')) {
      res.setHeader('X-Robots-Tag', 'noindex');
      const image = url.searchParams.get('image');
      if (!client || !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/.test(image)) { res.statusCode = 404; res.end(); return; }
      const { data, error } = await client.storage.from('article-images').download(image);
      if (error || !data) { res.statusCode = 404; res.end(); return; }
      res.setHeader('Content-Type', 'image/webp');
      res.end(req.method === 'HEAD' ? undefined : Buffer.from(await data.arrayBuffer())); return;
    }
    if (path === '/sitemap.xml') {
      if (!client) throw new Error('unavailable');
      const articles = await allRows(() => client.from('articles').select('slug,updated_at').eq('status', 'published').order('id'));
      const urls = [...seo.publicPaths, '/clanci'].map(p => `<url><loc>${escapeHtml(seo.siteUrl + p)}</loc></url>`);
      urls.push(...articles.map(a => `<url><loc>${escapeHtml(`${seo.siteUrl}/clanci/${a.slug}`)}</loc><lastmod>${escapeHtml(a.updated_at)}</lastmod></url>`));
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.end(req.method === 'HEAD' ? undefined : `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`); return;
    }
    const admin = path === '/admin' || path.startsWith('/admin/');
    let data;
    try { data = admin ? undefined : await loadPublic(path, client); }
    catch { data = { error: true }; }
    res.statusCode = data?.error ? 503 : data?.notFound ? 404 : 200;
    if (admin || data?.error || data?.notFound) res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    if (url.searchParams.has('data')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(req.method === 'HEAD' ? undefined : JSON.stringify(data || { notFound: true })); return;
    }
    const template = shell || await readFile(resolve('server-dist/shell.html'), 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(req.method === 'HEAD' ? undefined : renderPage(template, path, data));
  } catch {
    res.statusCode = 503;
    res.setHeader('X-Robots-Tag', 'noindex');
    res.setHeader('Retry-After', '60');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Usluga trenutno nije dostupna. / Service temporarily unavailable.');
  }
}
