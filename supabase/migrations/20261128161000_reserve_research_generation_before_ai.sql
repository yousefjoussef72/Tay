create table if not exists private.learning_research_generation_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  project_id uuid references public.learning_research_projects(id) on delete set null
);

create index if not exists learning_research_generation_attempts_user_created_idx
  on private.learning_research_generation_attempts (user_id, created_at desc);

revoke all privileges on table private.learning_research_generation_attempts
  from public, anon, authenticated;

create or replace function public.reserve_learning_research_generation()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_used integer;
  v_reservation_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  -- Serialize reservations per student before any paid AI request starts.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select count(*)::integer into v_used
  from private.learning_research_generation_attempts a
  where a.user_id = v_user_id
    and a.created_at >= now() - interval '24 hours';

  if v_used >= 5 then
    raise exception using errcode = 'P0001', message = 'research_daily_limit';
  end if;

  insert into private.learning_research_generation_attempts (user_id)
  values (v_user_id)
  returning id into v_reservation_id;

  return jsonb_build_object('id', v_reservation_id, 'remaining', 4 - v_used);
end;
$$;

revoke all on function public.reserve_learning_research_generation()
  from public, anon, authenticated;
grant execute on function public.reserve_learning_research_generation()
  to authenticated;

drop function if exists public.save_learning_research_project(uuid, text, text, jsonb, text, jsonb);

create or replace function public.save_learning_research_project(
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
set search_path = pg_catalog, public
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
  where id = p_reservation_id and user_id = v_user_id and project_id is null;

  if not found then
    raise exception using errcode = '42501', message = 'invalid_or_used_research_reservation';
  end if;

  return to_jsonb(v_project);
end;
$$;

revoke all on function public.save_learning_research_project(uuid, uuid, text, text, jsonb, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_learning_research_project(uuid, uuid, text, text, jsonb, text, jsonb)
  to authenticated;

