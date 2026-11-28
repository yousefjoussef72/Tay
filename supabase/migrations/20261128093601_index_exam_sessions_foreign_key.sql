drop index if exists public.exam_sessions_user_exam_started_idx;
create index if not exists exam_sessions_exam_user_started_idx
  on public.exam_sessions (exam_id, user_id, started_at desc);
