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
