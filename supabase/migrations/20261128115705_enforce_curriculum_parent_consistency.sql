alter table public.learning_units
  add constraint learning_units_id_subject_unique unique (id, subject_id);
alter table public.learning_lessons
  add constraint learning_lessons_id_unit_unique unique (id, unit_id);
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
alter table public.learning_experiments
  add constraint learning_experiments_lesson_requires_unit
    check (lesson_id is null or unit_id is not null);
