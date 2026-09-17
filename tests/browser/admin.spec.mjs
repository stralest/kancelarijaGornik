import { test, expect } from '@playwright/test';

// Browser interactions use a simulated API. Real authorization is tested
// separately against PostgreSQL, and must also be verified on the live project.
async function mockSupabase(page, admin = true) {
  const articles = [];
  const uploads = [];
  const category = { id: '30000000-0000-0000-0000-000000000001', name_sr: 'Građansko pravo', name_en: 'Civil Law' };
  const user = { id: '10000000-0000-0000-0000-000000000001', email: 'fixture@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })).toString('base64url')}.fixture`;
  await page.route('https://cms-test.supabase.co/**', async route => {
    const req = route.request(); const url = new URL(req.url()); const method = req.method();
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname === '/auth/v1/token') return json({ access_token: token, refresh_token: 'fixture-refresh', expires_in: 3600, token_type: 'bearer', user });
    if (url.pathname === '/auth/v1/user') return json(user);
    if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204 });
    if (url.pathname === '/rest/v1/rpc/is_admin') return json(admin);
    if (url.pathname === '/rest/v1/categories') return json([category]);
    if (url.pathname === '/rest/v1/articles') {
      if (method === 'GET') return json(articles);
      const id = url.searchParams.get('id')?.slice(3);
      if (method === 'DELETE') { const index = articles.findIndex(a => a.id === id); articles.splice(index, 1); return json({ id }); }
      const payload = req.postDataJSON();
      const now = new Date().toISOString();
      if (method === 'POST') articles.push({ ...payload, categories: category, created_at: now, updated_at: now, published_at: payload.status === 'published' ? now : null });
      else { const a = articles.find(a => a.id === id); Object.assign(a, payload, { updated_at: now, published_at: a.published_at || (payload.status === 'published' ? now : null) }); }
      return json({ id: payload.id || id });
    }
    if (url.pathname.startsWith('/storage/v1/object/article-images/') && method === 'POST') {
      uploads.push({ body: req.postDataBuffer(), contentType: req.headers()['content-type'], path: url.pathname });
      return json({ Key: url.pathname.slice('/storage/v1/object/'.length) });
    }
    if (url.pathname.startsWith('/storage/v1/object/sign/')) return json({ signedURL: '/object/sign/article-images/fixture.webp?token=fixture' });
    return json({ message: 'fixture response' });
  });
  return { articles, uploads };
}

test('lawyer can login, write, preview, save draft, publish, edit, confirm deletion and logout', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const { articles, uploads } = await mockSupabase(page);
  await page.goto('http://127.0.0.1:4174/admin');
  await page.getByLabel('Email', { exact: true }).fill('fixture@example.test');
  await page.getByLabel('Lozinka', { exact: true }).fill('test-only-fixture-password');
  await page.getByRole('button', { name: 'PRIJAVI SE', exact: true }).click();
  await page.getByRole('button', { name: 'Novi članak', exact: true }).click();
  await page.getByLabel('Naslov', { exact: true }).fill('Naknada štete u saobraćajnoj nezgodi');
  await expect(page.getByLabel('URL oznaka (slug)', { exact: false })).toHaveValue('naknada-stete-u-saobracajnoj-nezgodi');
  await page.getByRole('combobox', { name: 'Kategorija', exact: true }).selectOption({ index: 1 });
  await page.getByLabel('Kratak opis', { exact: true }).fill('Kratak opis stručnog teksta.');
  await page.getByRole('textbox', { name: 'Sadržaj — Srpska verzija' }).fill('Ručno napisan stručni tekst.');
  await page.getByRole('button', { name: 'Podebljano', exact: true }).click();
  await page.getByRole('textbox', { name: 'Sadržaj — Srpska verzija' }).press('End');
  await page.getByRole('textbox', { name: 'Sadržaj — Srpska verzija' }).pressSequentially(' Podebljan tekst.');
  const png = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 2400; canvas.height = 1200; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#0f2942'; ctx.fillRect(0, 0, 2400, 1200); return canvas.toDataURL('image/png').split(',')[1]; });
  await page.locator('input[type=file]').setInputFiles({ name: 'untrusted-original.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect(page.locator('.cms-image-preview')).toBeVisible();
  expect(await page.locator('.cms-image-preview').evaluate(img => [img.naturalWidth, img.naturalHeight])).toEqual([1600, 800]);
  await page.getByRole('button', { name: 'Pregled', exact: true }).click();
  await expect(page.locator('.cms-preview')).toContainText('Ručno napisan stručni tekst.');
  await expect(page.locator('.cms-preview h1')).toHaveText('Naknada štete u saobraćajnoj nezgodi');
  await page.screenshot({ path: 'test-results/admin-editor.png', fullPage: true });
  await page.getByRole('button', { name: 'Sačuvaj nacrt', exact: true }).click();
  await expect(page.locator('.cms-status')).toHaveText('NACRT');
  expect(articles[0].status).toBe('draft');
  expect(uploads).toHaveLength(1);
  expect(uploads[0].body.includes(Buffer.from('WEBP'))).toBe(true);
  expect(uploads[0].path).not.toContain('untrusted-original');
  expect(uploads[0].body.length).toBeLessThan(2 * 1024 * 1024);
  await page.getByRole('button', { name: 'Objavi', exact: true }).click();
  await page.getByRole('button', { name: 'Objavi', exact: true }).click();
  await expect(page.locator('.cms-status')).toHaveText('OBJAVLJENO');
  await page.getByRole('button', { name: 'Izmeni / Pregled', exact: true }).click();
  await page.getByLabel('Naslov', { exact: true }).fill('Izmenjen naslov');
  await page.getByRole('button', { name: 'Sačuvaj izmene', exact: true }).click();
  await expect(page.locator('.cms-table')).toContainText('Izmenjen naslov');
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Articles', exact: true })).toBeVisible();
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('.cms-table').getByRole('button', { name: 'Delete', exact: true }).click();
  expect(articles).toHaveLength(1);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('.cms-table').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('No articles yet. Create your first article.')).toBeVisible();
  expect(articles).toHaveLength(0);
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'ADMIN LOGIN', exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('test-only-fixture-password');
  expect(errors).toEqual([]);
});

test('authenticated non-admin never sees dashboard or editor', async ({ page }) => {
  await mockSupabase(page, false);
  await page.goto('http://127.0.0.1:4174/admin/preview/guess');
  await page.getByLabel('Email', { exact: true }).fill('fixture@example.test');
  await page.getByLabel('Lozinka', { exact: true }).fill('test-only-fixture-password');
  await page.getByRole('button', { name: 'PRIJAVI SE', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('nalog nema pristup');
  await expect(page.locator('.cms-table')).toHaveCount(0);
  await expect(page.locator('.tiptap')).toHaveCount(0);
});
