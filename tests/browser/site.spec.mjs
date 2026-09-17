import { test, expect } from '@playwright/test';

test('homepage sections, language toggle, navigation, logo and contact remain functional', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#home')).toBeVisible();
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.locator('#contact h2')).toHaveText('Contact');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('.navbar-logo-image')).toBeVisible();
  await expect(page.locator('input[name=from_email]')).toHaveAttribute('type', 'email');
  await page.getByRole('button', { name: 'SR', exact: true }).click();
  await expect(page.locator('#contact h2')).toHaveText('Kontakt');
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://www.advokatgornik.com/');
  expect(errors).toEqual([]);
});
for (const width of [375, 768, 1440]) {
  test(`navigation and CMS layout fit viewport ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    if (width <= 1200) await page.getByRole('button', { name: 'Otvori meni' }).click();
    await page.getByRole('link', { name: 'Stručni članci', exact: true }).filter({ visible: true }).click();
    await expect(page).toHaveURL('/clanci');
    await expect(page.getByRole('heading', { name: 'Stručni članci', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'EN', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Legal Insights', exact: true })).toBeVisible();
    if (width <= 1200) await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('link', { name: 'Contact', exact: true }).filter({ visible: true }).click();
    await expect(page).toHaveURL('/#contact');
  });
}
test('direct admin preview URL is noindex and contains no private data', async ({ page }) => {
  const response = await page.goto('/admin/preview/guess');
  expect(response.headers()['x-robots-tag']).toContain('noindex');
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('.cms-login, .cms-page > .cms-notice')).toBeVisible();
  await expect(page.locator('#cms-data')).toHaveCount(0);
});
test('admin explains missing Supabase configuration in both UI languages', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/admin');
  await expect(page.locator('.cms-page')).toContainText('Administracija još nije podešena');
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.locator('.cms-page')).toContainText('Administration has not been configured yet');
  expect(errors).toEqual([]);
});
