-- Correct the JSON object length validation for supported PostgreSQL versions.
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

  select * into v_session
  from public.exam_sessions
  where id = p_session_id and user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'exam_session_not_found');
  end if;

  if v_session.submitted_at is not null then
    return jsonb_build_object('ok', false, 'error', 'exam_session_already_submitted');
  end if;

  v_now := clock_timestamp();

  if v_now > v_session.expires_at + interval '30 seconds' then
    update public.exam_sessions set submitted_at = v_now where id = v_session.id;
    return jsonb_build_object(
      'ok', false,
      'error', 'exam_time_expired',
      'message', 'انتهى وقت الامتحان ولم تُحفظ المحاولة.'
    );
  end if;

  if not exists (
    select 1 from public.exams e
    where e.id = v_session.exam_id and e.is_published = true
  ) then
    return jsonb_build_object('ok', false, 'error', 'exam_not_available');
  end if;

  if not exists (
    select 1 from public.exam_questions q
    where q.exam_id = v_session.exam_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'exam_has_no_questions');
  end if;

  if exists (
    select 1
    from jsonb_each(p_answers) as answer(key, value)
    where jsonb_typeof(answer.value) <> 'string'
      or char_length(answer.value #>> '{}') > 1000
      or not exists (
        select 1 from public.exam_questions q
        where q.exam_id = v_session.exam_id and q.id::text = answer.key
      )
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_answers');
  end if;

  select coalesce(sum(q.points), 0)::integer into v_max_score
  from public.exam_questions q where q.exam_id = v_session.exam_id;

  select coalesce(sum(q.points) filter (
    where lower(btrim(coalesce(p_answers ->> q.id::text, '')))
      = lower(btrim(k.correct_answer))
  ), 0)::integer into v_score
  from public.exam_questions q
  left join public.exam_answer_keys k on k.question_id = q.id
  where q.exam_id = v_session.exam_id;

  insert into public.exam_attempts (exam_id, user_id, answers, score, max_score)
  values (v_session.exam_id, v_session.user_id, p_answers, v_score, v_max_score)
  returning id into v_attempt_id;

  update public.exam_sessions set submitted_at = v_now where id = v_session.id;

  return jsonb_build_object(
    'ok', true,
    'result', jsonb_build_object(
      'attempt_id', v_attempt_id,
      'score', v_score,
      'max_score', v_max_score,
      'percentage', case
        when v_max_score > 0 then round((v_score::numeric / v_max_score) * 100, 1)
        else 0
      end
    )
  );
end;
$function$;

revoke all on function public.grade_exam_session_internal(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.grade_exam_session_internal(uuid, uuid, jsonb) to service_role;
