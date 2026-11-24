-- Initial schema for the site starter.
-- Run this migration in the Supabase SQL Editor.

create extension if not exists pgcrypto;

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

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at
  before update on public.articles
  for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.articles enable row level security;
alter table public.messages enable row level security;
alter table public.site_settings enable row level security;

-- Profiles: users can read their own profile; administrators can read all.
drop policy if exists "profiles_read_own_or_admin" on public.profiles;
create policy "profiles_read_own_or_admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- Categories are public to read; only admins can change them.
drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories
  for select to anon, authenticated using (true);
drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Visitors see published articles only. Admins can see and manage all articles.
drop policy if exists "articles_public_read_published" on public.articles;
create policy "articles_public_read_published" on public.articles
  for select to anon, authenticated using (is_published = true or public.is_admin());
drop policy if exists "articles_admin_write" on public.articles;
create policy "articles_admin_write" on public.articles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Anyone can send a message; only admins can read or manage the inbox.
drop policy if exists "messages_public_insert" on public.messages;
create policy "messages_public_insert" on public.messages
  for insert to anon, authenticated with check (
    length(trim(name)) between 1 and 120
    and length(trim(email)) between 3 and 254
    and length(trim(message)) between 1 and 5000
  );
drop policy if exists "messages_admin_read" on public.messages;
create policy "messages_admin_read" on public.messages
  for select to authenticated using (public.is_admin());
drop policy if exists "messages_admin_update" on public.messages;
create policy "messages_admin_update" on public.messages
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "messages_admin_delete" on public.messages;
create policy "messages_admin_delete" on public.messages
  for delete to authenticated using (public.is_admin());

-- Settings are readable by the public; only admins can update them.
drop policy if exists "settings_public_read" on public.site_settings;
create policy "settings_public_read" on public.site_settings
  for select to anon, authenticated using (true);
drop policy if exists "settings_admin_write" on public.site_settings;
create policy "settings_admin_write" on public.site_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.categories, public.articles, public.site_settings to anon, authenticated;
grant insert on public.messages to anon, authenticated;
grant select, insert, update, delete on public.articles, public.categories, public.site_settings, public.messages to authenticated;
grant select on public.profiles to authenticated;
