begin;

create table public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_roles enable row level security;
revoke all on public.admin_roles from anon, authenticated;

-- No client can grant roles, including an existing administrator.
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_roles where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name_sr text not null unique check (length(trim(name_sr)) between 1 and 100),
  name_en text not null check (length(trim(name_en)) between 1 and 100)
);
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (length(slug) between 1 and 160 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category_id uuid not null references public.categories(id) on delete restrict,
  title_sr text not null check (length(trim(title_sr)) between 1 and 200),
  excerpt_sr text not null default '' check (length(excerpt_sr) <= 500),
  content_sr jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  title_en text check (length(trim(title_en)) between 1 and 200),
  excerpt_en text check (length(excerpt_en) <= 500),
  content_en jsonb,
  featured_image_path text unique check (featured_image_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'),
  image_alt_sr text not null default '' check (length(image_alt_sr) <= 300),
  image_alt_en text not null default '' check (length(image_alt_en) <= 300),
  status text not null default 'draft' check (status in ('draft', 'published')),
  author text not null default 'Advokatska kancelarija Gornik' check (length(trim(author)) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  check (jsonb_typeof(content_sr) = 'object' and content_sr->>'type' = 'doc' and octet_length(content_sr::text) <= 500000),
  check ((title_en is null and excerpt_en is null and content_en is null) or
    (title_en is not null and excerpt_en is not null and content_en is not null and
     jsonb_typeof(content_en) = 'object' and content_en->>'type' = 'doc' and octet_length(content_en::text) <= 500000)),
  check (status <> 'published' or (published_at is not null and length(trim(excerpt_sr)) > 0))
);
create index articles_publication on public.articles (published_at desc) where status = 'published';
create index articles_category on public.articles (category_id);

create function public.stamp_article() returns trigger language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' then
    new.created_at := old.created_at;
    new.published_at := old.published_at;
  else
    new.created_at := now();
    new.published_at := null;
  end if;
  new.updated_at := now();
  if new.status = 'published' and new.published_at is null then new.published_at := now(); end if;
  if new.featured_image_path is not null and split_part(new.featured_image_path, '/', 1) <> new.id::text then
    raise exception 'Invalid image ownership';
  end if;
  return new;
end;
$$;
create trigger stamp_article before insert or update on public.articles for each row execute function public.stamp_article();

alter table public.categories enable row level security;
alter table public.articles enable row level security;
-- Override Supabase's default table grants with the minimum required grants.
revoke all on public.categories, public.articles from anon, authenticated;
grant select on public.categories, public.articles to anon, authenticated;
grant insert, update, delete on public.categories, public.articles to authenticated;
create policy categories_read on public.categories for select to anon, authenticated using (true);
create policy categories_admin on public.categories for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy articles_read on public.articles for select to anon, authenticated
  using (status = 'published' or (select public.is_admin()));
create policy articles_admin on public.articles for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

insert into public.categories (name_sr, name_en) values
 ('Građansko pravo', 'Civil Law'), ('Krivično pravo', 'Criminal Law'),
 ('Radno pravo', 'Employment Law'), ('Privredno pravo', 'Commercial Law'),
 ('Porodično pravo', 'Family Law'), ('Naknada štete', 'Compensation Claims'), ('Ostalo', 'Other');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('article-images', 'article-images', false, 2097152, array['image/webp']);
create policy article_images_read on storage.objects for select to anon, authenticated using (
  bucket_id = 'article-images' and (
    (select public.is_admin()) or exists (
      select 1 from public.articles a where a.featured_image_path = name and a.status = 'published'
    )
  )
);
create policy article_images_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'article-images' and (select public.is_admin()) and
  name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'
);
-- Images are immutable: replacement uploads receive a new UUID.
-- Referenced images cannot be deleted, even by an admin, until detached.
create policy article_images_delete on storage.objects for delete to authenticated using (
  bucket_id = 'article-images' and (select public.is_admin()) and not exists (
    select 1 from public.articles a where a.featured_image_path = name
  )
);
commit;
