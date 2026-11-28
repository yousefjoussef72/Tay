-- Curriculum, lessons, experiments, and student progress for the integrated learning studio.
create table if not exists public.learning_subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  slug text not null unique,
  academic_stage text not null default 'البكالوريا المصرية',
  grade_level text not null default 'الصف الثاني',
  track text not null default 'مسار الطب وعلوم الحياة',
  term text not null default '',
  description text not null default '',
  icon text not null default 'book-open',
  color text not null default 'teal',
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_units (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.learning_subjects(id) on delete cascade,
  title text not null check (length(trim(title)) between 2 and 180),
  slug text not null,
  term text not null default '',
  description text not null default '',
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(subject_id, slug)
);

create table if not exists public.learning_lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.learning_units(id) on delete cascade,
  title text not null check (length(trim(title)) between 2 and 180),
  slug text not null,
  summary text not null default '',
  content_json jsonb not null default '{}'::jsonb check (jsonb_typeof(content_json) = 'object'),
  learning_objectives jsonb not null default '[]'::jsonb check (jsonb_typeof(learning_objectives) = 'array'),
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(unit_id, slug)
);

create table if not exists public.learning_experiments (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.learning_subjects(id) on delete cascade,
  unit_id uuid references public.learning_units(id) on delete set null,
  lesson_id uuid references public.learning_lessons(id) on delete set null,
  title text not null check (length(trim(title)) between 2 and 180),
  slug text not null unique,
  description text not null default '',
  experience_type text not null default 'simulation'
    check (experience_type in ('simulation', 'virtual_lab', 'guided_activity', 'interactive_demo')),
  simulator_type text
    check (simulator_type is null or simulator_type in ('harmonic_spring', 'simple_pendulum', 'wave_motion', 'projectile_motion', 'free_fall')),
  simulation_config jsonb not null default '{}'::jsonb check (jsonb_typeof(simulation_config) = 'object'),
  content_json jsonb not null default '{}'::jsonb check (jsonb_typeof(content_json) = 'object'),
  is_ai_generated boolean not null default false,
  ai_prompt text not null default '',
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_experiments_simulator_required check (
    experience_type not in ('simulation', 'virtual_lab') or simulator_type is not null
  )
);

create table if not exists public.learning_experiment_attempts (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.learning_experiments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  observations text not null default '',
  is_completed boolean not null default true,
  duration_seconds integer not null default 0 check (duration_seconds between 0 and 86400),
  started_at timestamptz not null default now(),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists learning_subjects_published_order_idx on public.learning_subjects (is_published, sort_order, name);
create index if not exists learning_units_subject_order_idx on public.learning_units (subject_id, is_published, sort_order);
create index if not exists learning_lessons_unit_order_idx on public.learning_lessons (unit_id, is_published, sort_order);
create index if not exists learning_experiments_subject_order_idx on public.learning_experiments (subject_id, is_published, sort_order, created_at desc);
create index if not exists learning_experiments_unit_idx on public.learning_experiments (unit_id);
create index if not exists learning_experiments_lesson_idx on public.learning_experiments (lesson_id);
create index if not exists learning_experiment_attempts_user_idx on public.learning_experiment_attempts (user_id, completed_at desc);
create index if not exists learning_experiment_attempts_experiment_idx on public.learning_experiment_attempts (experiment_id, completed_at desc);

alter table public.learning_subjects enable row level security;
alter table public.learning_units enable row level security;
alter table public.learning_lessons enable row level security;
alter table public.learning_experiments enable row level security;
alter table public.learning_experiment_attempts enable row level security;

drop policy if exists learning_subjects_public_read on public.learning_subjects;
create policy learning_subjects_public_read on public.learning_subjects for select to anon, authenticated using (is_published = true);
drop policy if exists learning_subjects_admin_manage on public.learning_subjects;
create policy learning_subjects_admin_manage on public.learning_subjects for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists learning_units_public_read on public.learning_units;
create policy learning_units_public_read on public.learning_units for select to anon, authenticated using (
  is_published = true and exists (
    select 1 from public.learning_subjects s where s.id = learning_units.subject_id and s.is_published = true
  )
);
drop policy if exists learning_units_admin_manage on public.learning_units;
create policy learning_units_admin_manage on public.learning_units for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists learning_lessons_public_read on public.learning_lessons;
create policy learning_lessons_public_read on public.learning_lessons for select to anon, authenticated using (
  is_published = true and exists (
    select 1 from public.learning_units u
    join public.learning_subjects s on s.id = u.subject_id
    where u.id = learning_lessons.unit_id and u.is_published = true and s.is_published = true
  )
);
drop policy if exists learning_lessons_admin_manage on public.learning_lessons;
create policy learning_lessons_admin_manage on public.learning_lessons for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists learning_experiments_public_read on public.learning_experiments;
create policy learning_experiments_public_read on public.learning_experiments for select to anon, authenticated using (
  is_published = true
  and exists (select 1 from public.learning_subjects s where s.id = learning_experiments.subject_id and s.is_published = true)
  and (unit_id is null or exists (select 1 from public.learning_units u where u.id = learning_experiments.unit_id and u.is_published = true))
  and (lesson_id is null or exists (select 1 from public.learning_lessons l where l.id = learning_experiments.lesson_id and l.is_published = true))
);
drop policy if exists learning_experiments_admin_manage on public.learning_experiments;
create policy learning_experiments_admin_manage on public.learning_experiments for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists learning_experiment_attempts_read_own_or_admin on public.learning_experiment_attempts;
create policy learning_experiment_attempts_read_own_or_admin on public.learning_experiment_attempts for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
drop policy if exists learning_experiment_attempts_insert_own on public.learning_experiment_attempts;
create policy learning_experiment_attempts_insert_own on public.learning_experiment_attempts for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.learning_experiments e
    join public.learning_subjects s on s.id = e.subject_id
    where e.id = learning_experiment_attempts.experiment_id and e.is_published = true and s.is_published = true
  )
);
drop policy if exists learning_experiment_attempts_admin_update on public.learning_experiment_attempts;
create policy learning_experiment_attempts_admin_update on public.learning_experiment_attempts for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

grant select on public.learning_subjects, public.learning_units, public.learning_lessons, public.learning_experiments to anon, authenticated;
grant insert, update, delete on public.learning_subjects, public.learning_units, public.learning_lessons, public.learning_experiments to authenticated;
grant select, insert, update, delete on public.learning_experiment_attempts to authenticated;

drop trigger if exists learning_subjects_set_updated_at on public.learning_subjects;
create trigger learning_subjects_set_updated_at before update on public.learning_subjects for each row execute function private.set_updated_at();
drop trigger if exists learning_units_set_updated_at on public.learning_units;
create trigger learning_units_set_updated_at before update on public.learning_units for each row execute function private.set_updated_at();
drop trigger if exists learning_lessons_set_updated_at on public.learning_lessons;
create trigger learning_lessons_set_updated_at before update on public.learning_lessons for each row execute function private.set_updated_at();
drop trigger if exists learning_experiments_set_updated_at on public.learning_experiments;
create trigger learning_experiments_set_updated_at before update on public.learning_experiments for each row execute function private.set_updated_at();
