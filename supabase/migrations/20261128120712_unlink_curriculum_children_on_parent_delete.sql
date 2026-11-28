-- Preserve experiments and library resources when a linked lesson or unit is deleted.
-- The specific nullable FK column is cleared; the parent subject relationship is retained.
alter table public.learning_experiments
  drop constraint if exists learning_experiments_unit_subject_fk,
  drop constraint if exists learning_experiments_lesson_unit_fk;
alter table public.learning_experiments
  add constraint learning_experiments_unit_subject_fk
    foreign key (unit_id, subject_id)
    references public.learning_units (id, subject_id)
    on delete set null (unit_id),
  add constraint learning_experiments_lesson_unit_fk
    foreign key (lesson_id, unit_id)
    references public.learning_lessons (id, unit_id)
    on delete set null (lesson_id);

alter table public.learning_resources
  drop constraint if exists learning_resources_unit_subject_fk,
  drop constraint if exists learning_resources_lesson_unit_fk;
alter table public.learning_resources
  add constraint learning_resources_unit_subject_fk
    foreign key (unit_id, subject_id)
    references public.learning_units (id, subject_id)
    on delete set null (unit_id),
  add constraint learning_resources_lesson_unit_fk
    foreign key (lesson_id, unit_id)
    references public.learning_lessons (id, unit_id)
    on delete set null (lesson_id);
