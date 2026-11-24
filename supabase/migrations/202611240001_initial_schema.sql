-- Initial schema for Tay Space (Supabase).
-- Security: private helper functions, hardened search_path, explicit grants and RLS.

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text not null default '',
  content text not null default '',
  cover_url text,
  category_id uuid references public.categories(id) on delete set null,
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null default 'رسالة من الموقع',
  message text not null,
  status text not null default 'new' check (status in ('new', 'read', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Only authenticated callers may execute the admin predicate. It exposes no profile data.
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  );
$$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

-- Internal Auth trigger: user metadata is used for display only, never authorization.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
revoke all on function private.handle_new_user() from public, anon, authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function private.set_updated_at();
revoke all on function private.set_updated_at() from public, anon, authenticated;

-- RLS is enabled on every table in the exposed public schema.
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.articles enable row level security;
alter table public.messages enable row level security;
alter table public.site_settings enable row level security;

-- Profiles: users can read their own record; admins can read all.
create policy "profiles_read_own_or_admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));

-- Categories: public read; admin-only writes.
create policy "categories_public_read" on public.categories
  for select to anon, authenticated using (true);
create policy "categories_admin_insert" on public.categories
  for insert to authenticated with check ((select private.is_admin()));
create policy "categories_admin_update" on public.categories
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
create policy "categories_admin_delete" on public.categories
  for delete to authenticated using ((select private.is_admin()));

-- Visitors can read published articles; admins can read and manage all.
create policy "articles_public_read_published" on public.articles
  for select to anon using (is_published = true);
create policy "articles_authenticated_read_published_or_admin" on public.articles
  for select to authenticated
  using (is_published = true or (select private.is_admin()));
create policy "articles_admin_insert" on public.articles
  for insert to authenticated with check ((select private.is_admin()));
create policy "articles_admin_update" on public.articles
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
create policy "articles_admin_delete" on public.articles
  for delete to authenticated using ((select private.is_admin()));

-- Anyone may submit a message; only admins may read or manage the inbox.
create policy "messages_public_insert" on public.messages
  for insert to anon, authenticated with check (
    length(trim(name)) between 1 and 120
    and length(trim(email)) between 3 and 254
    and length(trim(message)) between 1 and 5000
  );
create policy "messages_admin_read" on public.messages
  for select to authenticated using ((select private.is_admin()));
create policy "messages_admin_update" on public.messages
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
create policy "messages_admin_delete" on public.messages
  for delete to authenticated using ((select private.is_admin()));

-- Public settings may be read; only admins may change them.
create policy "settings_public_read" on public.site_settings
  for select to anon, authenticated using (true);
create policy "settings_admin_insert" on public.site_settings
  for insert to authenticated with check ((select private.is_admin()));
create policy "settings_admin_update" on public.site_settings
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
create policy "settings_admin_delete" on public.site_settings
  for delete to authenticated using ((select private.is_admin()));

-- Explicit Data API permissions; RLS remains the row-level boundary.
grant usage on schema public to anon, authenticated;
grant select on public.categories, public.articles, public.site_settings to anon, authenticated;
grant insert on public.messages to anon, authenticated;
grant select, insert, update, delete on public.articles, public.categories, public.site_settings, public.messages to authenticated;
grant select on public.profiles to authenticated;

-- Cover foreign-key lookups used by article lists and admin screens.
create index if not exists articles_category_id_idx on public.articles(category_id);
create index if not exists articles_created_by_idx on public.articles(created_by);
