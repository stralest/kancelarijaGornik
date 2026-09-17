import test from 'node:test';
import assert from 'node:assert/strict';
import { renderContent, safeLink, slugify, localizedArticle } from '../src/cms/content.js';
import { cmsTranslations } from '../src/i18n/cms-translations.js';
import { isPublicKey } from '../src/cms/public-config.js';

test('configuration rejects privileged keys', () => {
  assert.equal(isPublicKey('sb_publishable_test'), true);
  assert.equal(isPublicKey('sb_secret_test'), false);
  const jwt = role => `header.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;
  assert.equal(isPublicKey(jwt('anon')), true);
  assert.equal(isPublicKey(jwt('service_role')), false);
  assert.equal(isPublicKey(undefined), false);
});

test('Serbian Latin and Cyrillic slugs are URL safe', () => {
  assert.equal(slugify('Naknada štete u saobraćajnoj nezgodi'), 'naknada-stete-u-saobracajnoj-nezgodi');
  assert.equal(slugify('Ђорђе — грађанско право / ČĆŠŽĐ'), 'djordje-gradjansko-pravo-ccszdj');
  assert.equal(slugify('  Članak!!!  '), 'clanak');
  assert.ok(slugify('x '.repeat(200)).length <= 160);
});
test('legal text is preserved and translation only selected when manually supplied', () => {
  const sr = { title_sr: 'Srpski tekst', content_sr: { type: 'doc' }, excerpt_sr: 'Opis' };
  assert.equal(localizedArticle(sr, 'en').title, 'Srpski tekst');
  assert.equal(localizedArticle(sr, 'en').locale, 'sr');
  assert.equal(localizedArticle({ ...sr, title_en: 'Manual English', content_en: { type: 'doc' } }, 'en').title, 'Manual English');
});
test('all CMS interface keys exist in both languages', () => {
  assert.deepEqual(Object.keys(cmsTranslations.sr).sort(), Object.keys(cmsTranslations.en).sort());
});
test('XSS payloads, event attributes, embeds and dangerous links cannot render', () => {
  const html = renderContent({ type: 'doc', content: [
    { type: 'script', content: [{ type: 'text', text: 'alert(1)' }] },
    { type: 'image', attrs: { src: 'x', onerror: 'alert(1)' } },
    { type: 'paragraph', attrs: { onclick: 'alert(1)' }, content: [
      { type: 'text', text: '<img src=x onerror=alert(1)>', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] },
      { type: 'text', text: 'safe', marks: [{ type: 'bold' }, { type: 'italic' }, { type: 'link', attrs: { href: 'https://example.com/?x="onclick=' } }] },
    ] },
  ] });
  assert.ok(html.includes('&lt;img'));
  assert.ok(html.includes('<em><strong>safe</strong></em>'));
  assert.doesNotMatch(html, /<script|<img|javascript:| onclick=/);
  for (const url of ['javascript:alert(1)', 'java\nscript:alert(1)', 'data:text/html,a', '//evil.com', '/relative', 'vbscript:msgbox(1)']) assert.equal(safeLink(url), null);
  for (const url of ['https://example.com', 'http://example.com', 'mailto:office@example.com', 'tel:+381693218275']) assert.ok(safeLink(url));
});
test('formatting supports requested headings, lists, and paragraphs with bounded nesting', () => {
  assert.equal(renderContent({ type: 'doc', content: [{ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Title' }] }, { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item' }] }] }] }] }), '<h3>Title</h3><ul><li><p>Item</p></li></ul>');
  let deep = { type: 'text', text: 'never reached' };
  for (let i = 0; i < 100; i++) deep = { type: 'paragraph', content: [deep] };
  assert.doesNotThrow(() => renderContent(deep));
  assert.ok(!renderContent(deep).includes('never reached'));
});
