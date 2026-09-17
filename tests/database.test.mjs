import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('migration and RLS execute in PostgreSQL (Supabase service schemas simulated)', async t => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon nologin; create role authenticated nologin;
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema public, auth, storage to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;
      create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text, created_at timestamptz default now());
      alter table storage.objects enable row level security;
      grant select, insert, update, delete on storage.objects to anon, authenticated;
    `);
    await db.exec(await readFile(new URL('../supabase/migrations/202609150001_articles.sql', import.meta.url), 'utf8'));
    const admin = '10000000-0000-0000-0000-000000000001';
    const other = '10000000-0000-0000-0000-000000000002';
    const published = '20000000-0000-0000-0000-000000000001';
    const draft = '20000000-0000-0000-0000-000000000002';
    const image = `${published}/30000000-0000-0000-0000-000000000001.webp`;
    const draftImage = `${draft}/30000000-0000-0000-0000-000000000002.webp`;
    await db.exec(`insert into auth.users values ('${admin}'), ('${other}'); insert into public.admin_roles(user_id) values ('${admin}');`);
    const category = (await db.query('select id from categories limit 1')).rows[0].id;
    const as = async (role, uid = '') => { await db.exec(`reset role; set role ${role}; select set_config('request.jwt.claim.sub','${uid}',false);`); };
    await as('authenticated', admin);
    await t.test('authorized admin creates draft and publishes with database-owned dates', async () => {
      await db.query(`insert into articles(id, slug, category_id, title_sr, excerpt_sr, featured_image_path) values ($1,'published',$2,'Published','Description',$3),($4,'draft',$2,'Secret draft','Draft excerpt',$5)`, [published, category, image, draft, draftImage]);
      assert.equal((await db.query('select count(*)::int as n from articles')).rows[0].n, 2);
      await db.query(`update articles set status='published' where id=$1`, [published]);
      assert.ok((await db.query('select published_at from articles where id=$1', [published])).rows[0].published_at);
      await db.query(`insert into storage.objects(bucket_id,name) values ('article-images',$1),('article-images',$2)`, [image, draftImage]);
    });
    await as('anon');
    await t.test('anonymous reads published articles and their images, never drafts or draft images', async () => {
      assert.deepEqual((await db.query('select slug from articles')).rows.map(a => a.slug), ['published']);
      assert.deepEqual((await db.query('select name from storage.objects')).rows.map(a => a.name), [image]);
      assert.equal((await db.query('select count(*)::int as n from categories')).rows[0].n, 7);
    });
    await t.test('anonymous direct SQL CRUD, uploads and roles are denied', async () => {
      for (const sql of [
        `insert into articles(slug,category_id,title_sr) values ('attack','${category}','Attack')`,
        `update articles set title_sr='Hacked'`, `delete from articles`,
        `insert into categories(name_sr,name_en) values ('attack','attack')`,
        `insert into storage.objects(bucket_id,name) values ('article-images','${draftImage}')`,
        `select * from admin_roles`,
      ]) await assert.rejects(db.exec(sql), /permission denied|row-level security/);
    });
    await as('authenticated', other);
    await t.test('non-admin has no CRUD privileges and cannot self-authorize', async () => {
      assert.equal((await db.query('select is_admin() as allowed')).rows[0].allowed, false);
      assert.equal((await db.query('select count(*)::int as n from articles')).rows[0].n, 1);
      assert.equal((await db.query(`update articles set title_sr='Hacked' returning id`)).rows.length, 0);
      assert.equal((await db.query('delete from articles returning id')).rows.length, 0);
      await assert.rejects(db.exec(`insert into articles(slug,category_id,title_sr) values ('attack','${category}','Attack')`), /row-level security/);
      await assert.rejects(db.exec(`insert into admin_roles(user_id) values ('${other}')`), /permission denied/);
      await assert.rejects(db.exec(`insert into storage.objects(bucket_id,name) values ('article-images','${draftImage}')`), /row-level security/);
      assert.equal((await db.query('delete from storage.objects returning id')).rows.length, 0);
      assert.equal((await db.query(`update categories set name_en='Hacked' returning id`)).rows.length, 0);
    });
    await as('authenticated', admin);
    await t.test('admin edits, cannot self-grant roles, cannot delete referenced images', async () => {
      await db.query(`update articles set title_sr='Edited' where id=$1`, [published]);
      assert.equal((await db.query('select title_sr from articles where id=$1', [published])).rows[0].title_sr, 'Edited');
      assert.equal((await db.query('delete from storage.objects returning id')).rows.length, 0);
      await assert.rejects(db.exec(`insert into admin_roles(user_id) values ('${other}')`), /permission denied/);
      await assert.rejects(db.query(`delete from categories where id=$1`, [category]), /foreign key/);
      await assert.rejects(db.query(`insert into articles(slug,category_id,title_sr) values ('published',$1,'Duplicate')`, [category]), /unique constraint/);
      await assert.rejects(db.query(`update articles set title_en='Incomplete' where id=$1`, [published]), /check constraint/);
    });
    await t.test('unpublishing revokes anonymous article and image visibility immediately', async () => {
      await db.query(`update articles set status='draft' where id=$1`, [published]);
      await as('anon');
      assert.equal((await db.query('select count(*)::int as n from articles')).rows[0].n, 0);
      assert.equal((await db.query('select count(*)::int as n from storage.objects')).rows[0].n, 0);
    });
    await t.test('admin deletes and can clean detached images; logout loses access', async () => {
      await as('authenticated', admin);
      await db.query('delete from articles where id=$1', [published]);
      assert.equal((await db.query('delete from storage.objects where name=$1 returning id', [image])).rows.length, 1);
      await as('anon');
      assert.equal((await db.query('select is_admin() as allowed')).rows[0].allowed, false);
      assert.equal((await db.query('select count(*)::int as n from articles')).rows[0].n, 0);
    });
  } finally { await db.close(); }
});
