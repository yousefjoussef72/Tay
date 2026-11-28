-- Add essay questions, optional AI grading and admin-visible grading records.
alter table public.exam_questions
  drop constraint if exists exam_questions_question_type_check;

alter table public.exam_questions
  add constraint exam_questions_question_type_check
  check (question_type in ('mcq', 'true_false', 'short_answer', 'essay'));

alter table public.exam_questions
  add column if not exists grading_mode text not null default 'auto'
  check (grading_mode in ('auto', 'ai', 'manual'));

alter table public.exam_answer_keys
  add column if not exists grading_rubric text not null default '';

alter table public.exam_attempts
  add column if not exists objective_score integer not null default 0
    check (objective_score >= 0),
  add column if not exists ai_essay_score integer not null default 0
    check (ai_essay_score >= 0),
  add column if not exists ai_feedback jsonb not null default '{}'::jsonb
    check (jsonb_typeof(ai_feedback) = 'object'),
  add column if not exists grading_status text not null default 'not_required'
    check (grading_status in ('not_required', 'pending_ai', 'processing', 'graded', 'needs_review', 'failed')),
  add column if not exists ai_graded_at timestamptz,
  add column if not exists ai_model text;

update public.exam_attempts
set objective_score = score
where objective_score = 0 and score > 0;

drop policy if exists exam_attempts_admin_update on public.exam_attempts;
create policy exam_attempts_admin_update
on public.exam_attempts
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

grant update on public.exam_attempts to authenticated;

create index if not exists exam_attempts_grading_status_submitted_idx
  on public.exam_attempts (grading_status, submitted_at desc);

create or replace function public.grade_exam_session_internal(
  p_session_id uuid,
  p_user_id uuid,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_session public.exam_sessions%rowtype;
  v_now timestamptz;
  v_max_score integer := 0;
  v_score integer := 0;
  v_attempt_id uuid;
  v_answer_count integer := 0;
  v_ai_essay_count integer := 0;
  v_manual_essay_count integer := 0;
  v_grading_status text := 'not_required';
begin
  if p_user_id is null or p_session_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_session');
  end if;

  if coalesce(jsonb_typeof(p_answers), '') <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'invalid_answers');
  end if;

  select count(*)::integer into v_answer_count
  from jsonb_each(p_answers);

  if v_answer_count > 1000 then
    return jsonb_build_object('ok', false, 'error', 'invalid_answers');
  end if;

  select *
    into v_session
  from public.exam_sessions
  where id = p_session_id
    and user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'exam_session_not_found');
  end if;

  if v_session.submitted_at is not null then
    return jsonb_build_object('ok', false, 'error', 'exam_session_already_submitted');
  end if;

  v_now := clock_timestamp();

  if v_now > v_session.expires_at + interval '30 seconds' then
    update public.exam_sessions
      set submitted_at = v_now
    where id = v_session.id;
    return jsonb_build_object('ok', false, 'error', 'exam_time_expired');
  end if;

  if not exists (
    select 1
    from public.exams e
    where e.id = v_session.exam_id
      and e.is_published = true
  ) then
    return jsonb_build_object('ok', false, 'error', 'exam_not_available');
  end if;

  if not exists (
    select 1
    from public.exam_questions q
    where q.exam_id = v_session.exam_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'exam_has_no_questions');
  end if;

  if exists (
    select 1
    from jsonb_each(p_answers) as answer(key, value)
    where jsonb_typeof(answer.value) <> 'string'
      or char_length(answer.value #>> '{}') > 12000
      or not exists (
        select 1
        from public.exam_questions q
        where q.exam_id = v_session.exam_id
          and q.id::text = answer.key
      )
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_answers');
  end if;

  select coalesce(sum(q.points), 0)::integer
    into v_max_score
  from public.exam_questions q
  where q.exam_id = v_session.exam_id;

  select coalesce(sum(q.points) filter (
    where q.question_type <> 'essay'
      and lower(btrim(coalesce(p_answers ->> q.id::text, '')))
        = lower(btrim(k.correct_answer))
  ), 0)::integer
    into v_score
  from public.exam_questions q
  left join public.exam_answer_keys k on k.question_id = q.id
  where q.exam_id = v_session.exam_id;

  select
    count(*) filter (where question_type = 'essay' and grading_mode = 'ai')::integer,
    count(*) filter (where question_type = 'essay' and grading_mode = 'manual')::integer
  into v_ai_essay_count, v_manual_essay_count
  from public.exam_questions
  where exam_id = v_session.exam_id;

  if v_ai_essay_count > 0 then
    v_grading_status := 'pending_ai';
  elsif v_manual_essay_count > 0 then
    v_grading_status := 'needs_review';
  end if;

  insert into public.exam_attempts (
    exam_id, user_id, answers, score, max_score, objective_score,
    ai_essay_score, ai_feedback, grading_status
  )
  values (
    v_session.exam_id, v_session.user_id, p_answers, v_score, v_max_score, v_score,
    0, '{}'::jsonb, v_grading_status
  )
  returning id into v_attempt_id;

  update public.exam_sessions
    set submitted_at = v_now
  where id = v_session.id;

  return jsonb_build_object(
    'ok', true,
    'result', jsonb_build_object(
      'attempt_id', v_attempt_id,
      'score', v_score,
      'max_score', v_max_score,
      'percentage', case
        when v_max_score > 0
          then round((v_score::numeric / v_max_score) * 100, 1)
        else 0
      end,
      'grading_status', v_grading_status
    )
  );
end;
$function$;

revoke all on function public.grade_exam_session_internal(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.grade_exam_session_internal(uuid, uuid, jsonb) to service_role;
