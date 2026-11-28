-- Learning hub schema, storage and exam grading for Tay Space.
create table if not exists public.learning_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 180),
  description text not null default '',
  resource_type text not null check (resource_type in ('pdf', 'image', 'document', 'link')),
  file_path text,
  file_name text,
  mime_type text,
  file_size bigint check (file_size is null or file_size >= 0),
  external_url text,
  category text not null default 'عام',
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_resources_has_source check (
    (resource_type = 'link' and external_url is not null and length(trim(external_url)) > 0)
    or (resource_type <> 'link' and file_path is not null and length(trim(file_path)) > 0)
  )
);
create index if not exists learning_resources_published_created_idx on public.learning_resources (is_published, created_at desc);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 180),
  description text not null default '',
  duration_minutes integer not null default 30 check (duration_minutes between 1 and 300),
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  prompt text not null check (length(trim(prompt)) between 1 and 3000),
  question_type text not null check (question_type in ('mcq', 'true_false', 'short_answer')),
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  points integer not null default 1 check (points between 1 and 100),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists exam_questions_exam_sort_idx on public.exam_questions (exam_id, sort_order, created_at);

-- The answer key is a separate admin-only table.
create table if not exists public.exam_answer_keys (
  question_id uuid primary key references public.exam_questions(id) on delete cascade,
  correct_answer text not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  score integer not null default 0 check (score >= 0),
  max_score integer not null default 0 check (max_score >= 0),
  submitted_at timestamptz not null default now()
);
create index if not exists exam_attempts_exam_submitted_idx on public.exam_attempts (exam_id, submitted_at desc);
create index if not exists exam_attempts_user_submitted_idx on public.exam_attempts (user_id, submitted_at desc);

alter table public.learning_resources enable row level security;
alter table public.exams enable row level security;
alter table public.exam_questions enable row level security;
alter table public.exam_answer_keys enable row level security;
alter table public.exam_attempts enable row level security;

create policy "learning_resources_public_read_published" on public.learning_resources for select to anon using (is_published = true);
create policy "learning_resources_authenticated_read_published_or_admin" on public.learning_resources for select to authenticated using (is_published = true or (select private.is_admin()));
create policy "learning_resources_admin_insert" on public.learning_resources for insert to authenticated with check ((select private.is_admin()));
create policy "learning_resources_admin_update" on public.learning_resources for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "learning_resources_admin_delete" on public.learning_resources for delete to authenticated using ((select private.is_admin()));

create policy "exams_public_read_published" on public.exams for select to anon using (is_published = true);
create policy "exams_authenticated_read_published_or_admin" on public.exams for select to authenticated using (is_published = true or (select private.is_admin()));
create policy "exams_admin_insert" on public.exams for insert to authenticated with check ((select private.is_admin()));
create policy "exams_admin_update" on public.exams for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "exams_admin_delete" on public.exams for delete to authenticated using ((select private.is_admin()));

create policy "exam_questions_read_for_published_exam_or_admin" on public.exam_questions for select to anon, authenticated using (
  (select private.is_admin()) or exists (select 1 from public.exams e where e.id = exam_questions.exam_id and e.is_published = true)
);
create policy "exam_questions_admin_insert" on public.exam_questions for insert to authenticated with check ((select private.is_admin()));
create policy "exam_questions_admin_update" on public.exam_questions for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "exam_questions_admin_delete" on public.exam_questions for delete to authenticated using ((select private.is_admin()));

create policy "exam_answer_keys_admin_only" on public.exam_answer_keys for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "exam_attempts_read_own_or_admin" on public.exam_attempts for select to authenticated using (user_id = (select auth.uid()) or (select private.is_admin()));

grant select on public.learning_resources, public.exams, public.exam_questions to anon, authenticated;
grant select, insert, update, delete on public.learning_resources, public.exams, public.exam_questions to authenticated;
grant select, insert, update, delete on public.exam_answer_keys to authenticated;
grant select on public.exam_attempts to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tay-assets', 'tay-assets', true, 52428800, array[
  'application/pdf','image/jpeg','image/png','image/webp','image/gif',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]::text[])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "tay_assets_admin_list" on storage.objects for select to authenticated using (bucket_id = 'tay-assets' and (select private.is_admin()));
create policy "tay_assets_admin_upload" on storage.objects for insert to authenticated with check (bucket_id = 'tay-assets' and (select private.is_admin()));
create policy "tay_assets_admin_update" on storage.objects for update to authenticated using (bucket_id = 'tay-assets' and (select private.is_admin())) with check (bucket_id = 'tay-assets' and (select private.is_admin()));
create policy "tay_assets_admin_delete" on storage.objects for delete to authenticated using (bucket_id = 'tay-assets' and (select private.is_admin()));

create or replace function public.submit_exam(p_exam_id uuid, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_max_score integer := 0;
  v_score integer := 0;
  v_attempt_id uuid;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if coalesce(jsonb_typeof(p_answers), '') <> 'object' then raise exception 'invalid_answers'; end if;
  if not exists (select 1 from public.exams e where e.id = p_exam_id and e.is_published = true) then raise exception 'exam_not_available'; end if;
  if not exists (select 1 from public.exam_questions q where q.exam_id = p_exam_id) then raise exception 'exam_has_no_questions'; end if;

  select coalesce(sum(q.points), 0)::integer into v_max_score
  from public.exam_questions q where q.exam_id = p_exam_id;

  select coalesce(sum(q.points) filter (
    where lower(btrim(coalesce(p_answers ->> q.id::text, ''))) = lower(btrim(k.correct_answer))
  ), 0)::integer into v_score
  from public.exam_questions q
  join public.exam_answer_keys k on k.question_id = q.id
  where q.exam_id = p_exam_id;

  insert into public.exam_attempts (exam_id, user_id, answers, score, max_score)
  values (p_exam_id, v_user_id, p_answers, v_score, v_max_score)
  returning id into v_attempt_id;

  return jsonb_build_object('attempt_id', v_attempt_id, 'score', v_score, 'max_score', v_max_score,
    'percentage', case when v_max_score > 0 then round((v_score::numeric / v_max_score) * 100, 1) else 0 end);
end;
$$;
revoke all on function public.submit_exam(uuid, jsonb) from public, anon;
grant execute on function public.submit_exam(uuid, jsonb) to authenticated;
