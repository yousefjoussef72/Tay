-- Remove the unverified grade-three physical education placeholder.
-- The published 2026 Baccalaureate structure for grade three lists religion and
-- two specialist subjects per track; keep grade-two PE as the confirmed activity.
delete from public.learning_subjects
where slug = 'physical-education-grade-3'
  and not exists (select 1 from public.learning_units u where u.subject_id=learning_subjects.id)
  and not exists (select 1 from public.learning_resources r where r.subject_id=learning_subjects.id)
  and not exists (select 1 from public.learning_experiments e where e.subject_id=learning_subjects.id);
