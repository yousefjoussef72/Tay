-- Support manual marking for essay questions that are not assigned to AI.
alter table public.exam_attempts
  add column if not exists manual_essay_score integer not null default 0
    check (manual_essay_score >= 0),
  add column if not exists manual_feedback text not null default '';
