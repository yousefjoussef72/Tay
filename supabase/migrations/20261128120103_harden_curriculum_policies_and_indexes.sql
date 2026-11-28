-- Split public/student reads from admin writes, avoiding overlapping permissive SELECT policies.
drop policy if exists learning_subjects_public_read on public.learning_subjects;
drop policy if exists learning_subjects_admin_manage on public.learning_subjects;
create policy learning_subjects_anon_read on public.learning_subjects for select to anon using (is_published = true);
create policy learning_subjects_authenticated_read on public.learning_subjects for select to authenticated using (is_published = true or (select private.is_admin()));
create policy learning_subjects_admin_insert on public.learning_subjects for insert to authenticated with check ((select private.is_admin()));
create policy learning_subjects_admin_update on public.learning_subjects for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy learning_subjects_admin_delete on public.learning_subjects for delete to authenticated using ((select private.is_admin()));

drop policy if exists learning_units_public_read on public.learning_units;
drop policy if exists learning_units_admin_manage on public.learning_units;
create policy learning_units_anon_read on public.learning_units for select to anon using (
  is_published = true and exists (select 1 from public.learning_subjects s where s.id = learning_units.subject_id and s.is_published = true)
);
create policy learning_units_authenticated_read on public.learning_units for select to authenticated using (
  (is_published = true and exists (select 1 from public.learning_subjects s where s.id = learning_units.subject_id and s.is_published = true))
  or (select private.is_admin())
);
create policy learning_units_admin_insert on public.learning_units for insert to authenticated with check ((select private.is_admin()));
create policy learning_units_admin_update on public.learning_units for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy learning_units_admin_delete on public.learning_units for delete to authenticated using ((select private.is_admin()));

drop policy if exists learning_lessons_public_read on public.learning_lessons;
drop policy if exists learning_lessons_admin_manage on public.learning_lessons;
create policy learning_lessons_anon_read on public.learning_lessons for select to anon using (
  is_published = true and exists (
    select 1 from public.learning_units u join public.learning_subjects s on s.id = u.subject_id
    where u.id = learning_lessons.unit_id and u.is_published = true and s.is_published = true
  )
);
create policy learning_lessons_authenticated_read on public.learning_lessons for select to authenticated using (
  (is_published = true and exists (
    select 1 from public.learning_units u join public.learning_subjects s on s.id = u.subject_id
    where u.id = learning_lessons.unit_id and u.is_published = true and s.is_published = true
  )) or (select private.is_admin())
);
create policy learning_lessons_admin_insert on public.learning_lessons for insert to authenticated with check ((select private.is_admin()));
create policy learning_lessons_admin_update on public.learning_lessons for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy learning_lessons_admin_delete on public.learning_lessons for delete to authenticated using ((select private.is_admin()));

drop policy if exists learning_experiments_public_read on public.learning_experiments;
drop policy if exists learning_experiments_admin_manage on public.learning_experiments;
create policy learning_experiments_anon_read on public.learning_experiments for select to anon using (
  is_published = true
  and exists (select 1 from public.learning_subjects s where s.id = learning_experiments.subject_id and s.is_published = true)
  and (unit_id is null or exists (select 1 from public.learning_units u where u.id = learning_experiments.unit_id and u.is_published = true))
  and (lesson_id is null or exists (select 1 from public.learning_lessons l where l.id = learning_experiments.lesson_id and l.is_published = true))
);
create policy learning_experiments_authenticated_read on public.learning_experiments for select to authenticated using (
  (is_published = true
    and exists (select 1 from public.learning_subjects s where s.id = learning_experiments.subject_id and s.is_published = true)
    and (unit_id is null or exists (select 1 from public.learning_units u where u.id = learning_experiments.unit_id and u.is_published = true))
    and (lesson_id is null or exists (select 1 from public.learning_lessons l where l.id = learning_experiments.lesson_id and l.is_published = true)))
  or (select private.is_admin())
);
create policy learning_experiments_admin_insert on public.learning_experiments for insert to authenticated with check ((select private.is_admin()));
create policy learning_experiments_admin_update on public.learning_experiments for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy learning_experiments_admin_delete on public.learning_experiments for delete to authenticated using ((select private.is_admin()));

create index if not exists learning_subjects_created_by_idx on public.learning_subjects(created_by);
create index if not exists learning_units_created_by_idx on public.learning_units(created_by);
create index if not exists learning_lessons_created_by_idx on public.learning_lessons(created_by);
create index if not exists learning_experiments_created_by_idx on public.learning_experiments(created_by);
create index if not exists learning_experiments_lesson_unit_fk_idx on public.learning_experiments(lesson_id, unit_id);
create index if not exists learning_experiments_unit_subject_fk_idx on public.learning_experiments(unit_id, subject_id);
