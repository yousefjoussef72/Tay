-- Allow every learning resource to be classified by Baccalaureate track and grade,
-- even when it is not attached to a specific subject/unit/lesson.
alter table public.learning_resources
  add column if not exists track_id uuid references public.learning_tracks(id) on delete set null,
  add column if not exists grade_level text not null default '',
  add column if not exists curriculum_year smallint
    check (curriculum_year is null or curriculum_year between 1 and 3);

create index if not exists learning_resources_track_grade_idx
  on public.learning_resources (track_id, curriculum_year, created_at desc);

drop policy if exists learning_resources_public_read_published on public.learning_resources;
drop policy if exists learning_resources_authenticated_read_published_or_admin on public.learning_resources;

create policy learning_resources_public_read_published
on public.learning_resources for select to anon
using (
  is_published = true
  and (
    track_id is null
    or exists (
      select 1 from public.learning_tracks t
      where t.id = learning_resources.track_id and t.is_published = true
    )
  )
  and (
    subject_id is null
    or exists (
      select 1 from public.learning_subjects s
      where s.id = learning_resources.subject_id and s.is_published = true
    )
  )
  and (
    unit_id is null
    or exists (
      select 1 from public.learning_units u
      where u.id = learning_resources.unit_id and u.is_published = true
    )
  )
  and (
    lesson_id is null
    or exists (
      select 1 from public.learning_lessons l
      where l.id = learning_resources.lesson_id and l.is_published = true
    )
  )
);

create policy learning_resources_authenticated_read_published_or_admin
on public.learning_resources for select to authenticated
using (
  (
    is_published = true
    and (
      track_id is null
      or exists (
        select 1 from public.learning_tracks t
        where t.id = learning_resources.track_id and t.is_published = true
      )
    )
    and (
      subject_id is null
      or exists (
        select 1 from public.learning_subjects s
        where s.id = learning_resources.subject_id and s.is_published = true
      )
    )
    and (
      unit_id is null
      or exists (
        select 1 from public.learning_units u
        where u.id = learning_resources.unit_id and u.is_published = true
      )
    )
    and (
      lesson_id is null
      or exists (
        select 1 from public.learning_lessons l
        where l.id = learning_resources.lesson_id and l.is_published = true
      )
    )
  )
  or (select private.is_admin())
);
