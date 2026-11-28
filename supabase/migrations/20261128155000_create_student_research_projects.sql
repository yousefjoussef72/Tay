-- Private, user-owned AI-generated research projects.
create table if not exists public.learning_research_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.learning_subjects(id) on delete cascade,
  topic text not null check (length(trim(topic)) between 3 and 240),
  title text not null check (length(trim(title)) between 3 and 180),
  content_json jsonb not null default '{}'::jsonb
    check (jsonb_typeof(content_json) = 'object'),
  simulator_type text
    check (simulator_type is null or simulator_type in ('harmonic_spring','simple_pendulum','wave_motion','projectile_motion','free_fall')),
  simulation_config jsonb not null default '{}'::jsonb
    check (jsonb_typeof(simulation_config) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists learning_research_projects_user_created_idx
  on public.learning_research_projects (user_id, created_at desc);
create index if not exists learning_research_projects_subject_idx
  on public.learning_research_projects (subject_id, created_at desc);

alter table public.learning_research_projects enable row level security;

drop policy if exists learning_research_projects_read_own
  on public.learning_research_projects;
create policy learning_research_projects_read_own
  on public.learning_research_projects
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists learning_research_projects_insert_own
  on public.learning_research_projects;
create policy learning_research_projects_insert_own
  on public.learning_research_projects
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.learning_subjects s
      where s.id = learning_research_projects.subject_id
        and s.is_published = true
    )
  );

drop policy if exists learning_research_projects_delete_own
  on public.learning_research_projects;
create policy learning_research_projects_delete_own
  on public.learning_research_projects
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Supabase Data API access must be explicitly granted for newly created public tables.
grant select, insert, delete on public.learning_research_projects to authenticated;
