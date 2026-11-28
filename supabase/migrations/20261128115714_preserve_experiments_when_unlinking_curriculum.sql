alter table public.learning_experiments drop constraint if exists learning_experiments_unit_subject_fk;
alter table public.learning_experiments drop constraint if exists learning_experiments_lesson_unit_fk;
alter table public.learning_experiments
  add constraint learning_experiments_unit_subject_fk
    foreign key (unit_id, subject_id)
    references public.learning_units (id, subject_id)
    on delete no action;
alter table public.learning_experiments
  add constraint learning_experiments_lesson_unit_fk
    foreign key (lesson_id, unit_id)
    references public.learning_lessons (id, unit_id)
    on delete no action;
