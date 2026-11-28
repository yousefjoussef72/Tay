revoke all privileges on table public.learning_research_projects from anon, authenticated, public;
grant select, delete on table public.learning_research_projects to authenticated;

drop policy if exists learning_research_projects_insert_own
  on public.learning_research_projects;

create or replace function public.save_learning_research_project(
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
  v_recent_count integer;
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

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  if not exists (
    select 1 from public.learning_subjects s
    where s.id = p_subject_id and s.is_published = true
  ) then
    raise exception using errcode = '22023', message = 'subject_not_available';
  end if;

  select count(*)::integer into v_recent_count
  from public.learning_research_projects rp
  where rp.user_id = v_user_id
    and rp.created_at >= now() - interval '24 hours';

  if v_recent_count >= 5 then
    raise exception using errcode = 'P0001', message = 'research_daily_limit';
  end if;

  insert into public.learning_research_projects (
    user_id, subject_id, topic, title, content_json, simulator_type, simulation_config
  ) values (
    v_user_id, p_subject_id, trim(p_topic), trim(p_title), p_content_json,
    p_simulator_type, coalesce(p_simulation_config, '{}'::jsonb)
  )
  returning * into v_project;

  return to_jsonb(v_project);
end;
$$;

revoke all on function public.save_learning_research_project(uuid, text, text, jsonb, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_learning_research_project(uuid, text, text, text, text, jsonb)
  to authenticated;
