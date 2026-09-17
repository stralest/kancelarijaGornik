import { test, expect } from '@playwright/test';

const categories = [{ id: 'c1', name_sr: 'Građansko pravo', name_en: 'Civil Law' }, { id: 'c2', name_sr: 'Radno pravo', name_en: 'Employment Law' }];
const content = { type: 'doc', content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Pravna zaštita' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'Ručno napisan srpski pravni tekst. <script>window.xssExecuted=true</script>' }] }] };
const articles = [
  { id: 'a1', slug: 'naknada-stete', title_sr: 'Naknada štete u saobraćajnoj nezgodi', excerpt_sr: 'Informacije o zaštiti prava i postupku naknade štete.', content_sr: content, category_id: 'c1', categories: categories[0], published_at: '2026-01-01T12:00:00Z', updated_at: '2026-01-02T12:00:00Z', author: 'Advokatska kancelarija Gornik' },
  { id: 'a2', slug: 'radni-odnosi', title_sr: 'Zaštita prava iz radnog odnosa', title_en: 'Employment rights', excerpt_sr: 'Prava i obaveze zaposlenih.', excerpt_en: 'A manually authored English introduction.', content_sr: content, content_en: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Manually authored English legal text.' }] }] }, category_id: 'c2', categories: categories[1], published_at: '2026-01-01T12:00:00Z', updated_at: '2026-01-01T12:00:00Z', author: 'Advokatska kancelarija Gornik' },
];

test('public filtering, manual translations, fallback and safe rich text work in browser', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('http://127.0.0.1:4174/api/cms?data=*', route => {
    const path = new URL(route.request().url()).searchParams.get('data');
    const article = articles.find(a => path === `/clanci/${a.slug}`);
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(article ? { article } : { articles, categories }) });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://127.0.0.1:4174/clanci');
  await expect(page.locator('.article-card')).toHaveCount(2);
  await expect(page.locator('.article-card .article-image').first()).toHaveAttribute('src', '/article-default.jpg');
  await expect(page.locator('.article-card .article-image').first()).toHaveAttribute('alt', 'Advokatska kancelarija Gornik');
  await page.screenshot({ path: 'test-results/articles-desktop.png', fullPage: true });
  await page.getByRole('combobox').selectOption('c2');
  await expect(page.locator('.article-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.locator('.article-card')).toContainText('Employment rights');
  await page.getByRole('link', { name: 'Employment rights', exact: true }).click();
  await expect(page.locator('.article-prose')).toHaveText('Manually authored English legal text.');
  await expect(page.locator('.article-detail > .article-image')).toHaveAttribute('src', '/article-default.jpg');
  await expect(page.locator('.article-prose')).toHaveAttribute('lang', 'en');
  await page.goto('http://127.0.0.1:4174/clanci/naknada-stete');
  await expect(page.locator('.cms-notice')).toHaveText('This article is available in Serbian.');
  await expect(page.locator('.article-prose')).toHaveAttribute('lang', 'sr');
  await expect(page.locator('.article-prose')).toContainText('<script>window.xssExecuted=true</script>');
  expect(await page.evaluate(() => window.xssExecuted)).toBeUndefined();
  await page.setViewportSize({ width: 375, height: 850 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/article-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('image decoder rejects forged MIME and never upscales small images', async ({ page }) => {
  await page.goto('http://127.0.0.1:4174/admin');
  const result = await page.evaluate(async () => {
    const { optimizeImage } = await import('/src/cms/images.js');
    const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 200;
    const source = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const blob = await optimizeImage(new File([source], 'original.png', { type: 'image/png' }));
    const image = await createImageBitmap(blob);
    let forgedRejected = false;
    try { await optimizeImage(new File(['<svg onload="alert(1)"/>'], 'fake.png', { type: 'image/png' })); } catch { forgedRejected = true; }
    const output = { width: image.width, height: image.height, mime: blob.type, forgedRejected };
    image.close(); return output;
  });
  expect(result).toEqual({ width: 320, height: 200, mime: 'image/webp', forgedRejected: true });
});
