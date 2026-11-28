alter table private.learning_research_generation_attempts
  add column if not exists refunded_at timestamptz;

-- Refund only stale reservations that never produced a saved project.
-- The AI request timeout is 45 seconds, so two minutes safely excludes active requests.
update private.learning_research_generation_attempts
set refunded_at = now()
where project_id is null
  and refunded_at is null
  and created_at < now() - interval '2 minutes';

create or replace function private.reserve_learning_research_generation_impl()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_used integer;
  v_reservation_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select count(*)::integer into v_used
  from private.learning_research_generation_attempts a
  where a.user_id = v_user_id
    and a.created_at >= now() - interval '24 hours'
    and a.refunded_at is null;

  if v_used >= 5 then
    raise exception using errcode = 'P0001', message = 'research_daily_limit';
  end if;

  insert into private.learning_research_generation_attempts (user_id)
  values (v_user_id)
  returning id into v_reservation_id;

  return jsonb_build_object('id', v_reservation_id, 'remaining', 4 - v_used);
end;
$$;

create or replace function private.save_learning_research_project_impl(
  p_reservation_id uuid,
  p_subject_id uuid,
  p_topic text,
  p_title text,
  p_content_json jsonb,
  p_simulator_type text default null,
  p_simulation_config jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_project public.learning_research_projects;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if p_subject_id is null
     or length(trim(coalesce(p_topic, ''))) < 3
     or length(trim(coalesce(p_topic, ''))) > 240
     or length(trim(coalesce(p_title, ''))) < 3
     or length(trim(coalesce(p_title, ''))) > 180
     or p_content_json is null
     or jsonb_typeof(p_content_json) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid_research_project';
  end if;

  if not exists (
    select 1
    from private.learning_research_generation_attempts a
    where a.id = p_reservation_id
      and a.user_id = v_user_id
      and a.created_at >= now() - interval '24 hours'
      and a.project_id is null
      and a.refunded_at is null
  ) then
    raise exception using errcode = '42501', message = 'invalid_or_used_research_reservation';
  end if;

  if not exists (
    select 1 from public.learning_subjects s
    where s.id = p_subject_id and s.is_published = true
  ) then
    raise exception using errcode = '22023', message = 'subject_not_available';
  end if;

  insert into public.learning_research_projects (
    user_id, subject_id, topic, title, content_json, simulator_type, simulation_config
  ) values (
    v_user_id, p_subject_id, trim(p_topic), trim(p_title), p_content_json,
    p_simulator_type, coalesce(p_simulation_config, '{}'::jsonb)
  )
  returning * into v_project;

  update private.learning_research_generation_attempts
  set project_id = v_project.id
  where id = p_reservation_id
    and user_id = v_user_id
    and project_id is null
    and refunded_at is null;

  if not found then
    raise exception using errcode = '42501', message = 'invalid_or_used_research_reservation';
  end if;

  return to_jsonb(v_project);
end;
$$;

create or replace function private.refund_learning_research_generation_impl(
  p_reservation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  update private.learning_research_generation_attempts
  set refunded_at = now()
  where id = p_reservation_id
    and user_id = v_user_id
    and project_id is null
    and refunded_at is null
    and created_at >= now() - interval '24 hours';

  return found;
end;
$$;

revoke all on function private.refund_learning_research_generation_impl(uuid)
  from public, anon, authenticated;
grant execute on function private.refund_learning_research_generation_impl(uuid)
  to authenticated;

create or replace function public.refund_learning_research_generation(
  p_reservation_id uuid
)
returns boolean
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.refund_learning_research_generation_impl(p_reservation_id);
$$;

revoke all on function public.refund_learning_research_generation(uuid)
  from public, anon, authenticated;
grant execute on function public.refund_learning_research_generation(uuid)
  to authenticated;

