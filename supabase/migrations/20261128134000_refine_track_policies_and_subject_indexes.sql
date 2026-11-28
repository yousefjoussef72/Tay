-- Remove duplicate authenticated SELECT path on tracks while preserving admin draft access.
drop policy if exists learning_tracks_admin_manage on public.learning_tracks;
drop policy if exists learning_tracks_public_read on public.learning_tracks;
drop policy if exists learning_tracks_authenticated_read on public.learning_tracks;
drop policy if exists learning_tracks_admin_insert on public.learning_tracks;
drop policy if exists learning_tracks_admin_update on public.learning_tracks;
drop policy if exists learning_tracks_admin_delete on public.learning_tracks;

create policy learning_tracks_public_read
on public.learning_tracks for select to anon
using (is_published = true);

create policy learning_tracks_authenticated_read
on public.learning_tracks for select to authenticated
using (is_published = true or (select private.is_admin()));

create policy learning_tracks_admin_insert
on public.learning_tracks for insert to authenticated
with check ((select private.is_admin()));

create policy learning_tracks_admin_update
on public.learning_tracks for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy learning_tracks_admin_delete
on public.learning_tracks for delete to authenticated
using ((select private.is_admin()));

-- Cover direct subject references used by curriculum filters and public visibility checks.
create index if not exists articles_subject_id_idx on public.articles (subject_id);
create index if not exists exams_subject_id_idx on public.exams (subject_id);
