import { renderToString } from 'react-dom/server';
import CmsApp from '../src/cms/CmsApp';
import { defaultArticleImage, escapeHtml, imageUrl } from '../src/cms/content';
import { seo } from '../seo.config.mjs';

export function renderPage(shell, path, data) {
  const admin = path === '/admin' || path.startsWith('/admin/');
  const article = data?.article;
  const title = admin ? 'Administracija' : article?.title_sr || (data?.notFound ? 'Članak nije pronađen' : 'Stručni članci');
  const description = article?.excerpt_sr || 'Stručni tekstovi i uvidi iz pravne prakse Advokatske kancelarije Gornik.';
  const canonical = `${seo.siteUrl}${path}`;
  const image = article?.featured_image_path ? `${seo.siteUrl}${imageUrl(article.featured_image_path)}` : `${seo.siteUrl}${article ? defaultArticleImage : seo.image}`;
  const noindex = admin || data?.notFound || data?.error;
  const meta = (name, value, property = false) => `<meta ${property ? 'property' : 'name'}="${name}" content="${escapeHtml(value)}" />`;
  const tags = [meta('description', description), meta('robots', noindex ? 'noindex, nofollow, noarchive' : 'index, follow, max-image-preview:large')];
  if (!noindex) tags.push(`<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    meta('og:type', article ? 'article' : 'website', true), meta('og:locale', 'sr_RS', true), meta('og:site_name', seo.siteName, true), meta('og:title', title, true), meta('og:description', description, true), meta('og:url', canonical, true), meta('og:image', image, true), meta('twitter:card', 'summary_large_image'), meta('twitter:title', title), meta('twitter:description', description), meta('twitter:image', image));
  if (article) {
    tags.push(meta('article:published_time', article.published_at, true), meta('article:modified_time', article.updated_at, true));
    const schema = { '@context': 'https://schema.org', '@type': 'Article', headline: article.title_sr, description, datePublished: article.published_at, dateModified: article.updated_at, inLanguage: 'sr', mainEntityOfPage: canonical, author: { '@type': 'Organization', name: article.author }, publisher: { '@type': 'Organization', name: seo.siteName, logo: { '@type': 'ImageObject', url: `${seo.siteUrl}${seo.logo}` } }, image };
    tags.push(`<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`);
  }
  // Admin HTML contains an empty root, never a session or draft payload.
  const markup = admin ? '' : renderToString(<CmsApp path={path} initialData={data} />);
  const payload = admin ? '' : `<script id="cms-data" type="application/json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
  return shell.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)} | ${escapeHtml(seo.siteName)}</title>`)
    .replace('</head>', `${tags.join('\n')}</head>`).replace('<div id="root"></div>', `<div id="root">${markup}</div>${payload}`);
}
