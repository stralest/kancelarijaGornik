import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { seo } from '../seo.config.mjs';

const dist = resolve('dist');
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const tag = (name, value, property = false) => `<meta ${property ? 'property' : 'name'}="${name}" content="${escapeHtml(value)}" />`;

let siteUrl = seo.siteUrl.trim().replace(/\/+$/, '');
if (siteUrl) {
  const parsed = new URL(siteUrl);
  if (parsed.protocol !== 'https:' || parsed.pathname !== '/' || parsed.search || parsed.hash || /^(localhost|127\.0\.0\.1)(:|$)/.test(parsed.host)) {
    throw new Error('SITE_URL must be the final public HTTPS origin, e.g. https://example.rs');
  }
  siteUrl = parsed.origin;
}

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { default: App } = await server.ssrLoadModule('/src/App.jsx');
  const markup = renderToString(createElement(App));
  let html = await readFile(resolve(dist, 'index.html'), 'utf8');
  await writeFile(resolve(dist, 'cms-shell.html'), html);
  html = html.replace('<div id="root"></div>', `<div id="root">${markup}</div>`);
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(seo.defaultTitle)}</title>`);

  const metadata = [
    tag('description', seo.defaultDescription),
    tag('robots', 'index, follow, max-image-preview:large'),
    tag('og:type', 'website', true),
    tag('og:locale', 'sr_RS', true),
    tag('og:site_name', seo.siteName, true),
    tag('og:title', seo.defaultTitle, true),
    tag('og:description', seo.defaultDescription, true),
    tag('twitter:card', 'summary_large_image'),
    tag('twitter:title', seo.defaultTitle),
    tag('twitter:description', seo.defaultDescription),
  ];
  if (siteUrl) {
    const home = `${siteUrl}/`;
    const image = new URL(seo.image, home).href;
    metadata.push(`<link rel="canonical" href="${escapeHtml(home)}" />`);
    metadata.push(tag('og:url', home, true), tag('og:image', image, true), tag('twitter:image', image));
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'LegalService',
      '@id': `${home}#legal-service`,
      name: seo.siteName,
      url: home,
      logo: new URL(seo.logo, home).href,
      image,
      telephone: seo.phone,
      email: seo.email,
      address: { '@type': 'PostalAddress', ...seo.address },
      areaServed: { '@type': 'Country', name: 'Serbia' },
      sameAs: seo.socialProfiles,
      openingHours: seo.openingHours,
    };
    metadata.push(`<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`);
    const urls = seo.publicPaths.map((path) => `  <url><loc>${escapeHtml(new URL(path, home).href)}</loc></url>`).join('\n');
    await writeFile(resolve(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
    await writeFile(resolve(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${home}sitemap.xml\n`);
  } else {
    console.warn('SITE_URL is unset: canonical, absolute social URLs, JSON-LD and sitemap are omitted. Set SITE_URL before production deploy.');
    await writeFile(resolve(dist, 'robots.txt'), 'User-agent: *\nAllow: /\n');
  }
  html = html.replace('</head>', `    ${metadata.join('\n    ')}\n  </head>`);
  await writeFile(resolve(dist, 'index.html'), html);
} finally {
  await server.close();
}
