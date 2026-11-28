alter table public.learning_resources
  add column if not exists subject_id uuid references public.learning_subjects(id) on delete set null,
  add column if not exists unit_id uuid references public.learning_units(id) on delete set null,
  add column if not exists lesson_id uuid references public.learning_lessons(id) on delete set null;

alter table public.learning_resources
  add constraint learning_resources_unit_subject_fk
    foreign key (unit_id, subject_id)
    references public.learning_units (id, subject_id)
    on delete no action,
  add constraint learning_resources_lesson_unit_fk
    foreign key (lesson_id, unit_id)
    references public.learning_lessons (id, unit_id)
    on delete no action,
  add constraint learning_resources_unit_requires_subject
    check (unit_id is null or subject_id is not null),
  add constraint learning_resources_lesson_requires_unit
    check (lesson_id is null or unit_id is not null);

create index if not exists learning_resources_subject_idx on public.learning_resources(subject_id, is_published);
create index if not exists learning_resources_unit_idx on public.learning_resources(unit_id, is_published);
create index if not exists learning_resources_lesson_idx on public.learning_resources(lesson_id, is_published);

drop policy if exists learning_resources_public_read_published on public.learning_resources;
drop policy if exists learning_resources_authenticated_read_published_or_admin on public.learning_resources;

create policy learning_resources_public_read_published on public.learning_resources for select to anon using (
  is_published = true
  and (subject_id is null or exists (select 1 from public.learning_subjects s where s.id = learning_resources.subject_id and s.is_published = true))
  and (unit_id is null or exists (select 1 from public.learning_units u where u.id = learning_resources.unit_id and u.is_published = true))
  and (lesson_id is null or exists (select 1 from public.learning_lessons l where l.id = learning_resources.lesson_id and l.is_published = true))
);

create policy learning_resources_authenticated_read_published_or_admin on public.learning_resources for select to authenticated using (
  (is_published = true
  and (subject_id is null or exists (select 1 from public.learning_subjects s where s.id = learning_resources.subject_id and s.is_published = true))
  and (unit_id is null or exists (select 1 from public.learning_units u where u.id = learning_resources.unit_id and u.is_published = true))
  and (lesson_id is null or exists (select 1 from public.learning_lessons l where l.id = learning_resources.lesson_id and l.is_published = true)))
  or (select private.is_admin())
);
