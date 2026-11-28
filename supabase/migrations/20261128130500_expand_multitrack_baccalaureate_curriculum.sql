-- Expand Tay Space into a multi-track Egyptian Baccalaureate learning platform.
create table if not exists public.learning_tracks (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  slug text not null unique,
  description text not null default '',
  icon text not null default 'book-open',
  color text not null default 'teal',
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.learning_subjects
  add column if not exists track_id uuid references public.learning_tracks(id) on delete set null,
  add column if not exists curriculum_year smallint not null default 2 check (curriculum_year between 1 and 3),
  add column if not exists subject_kind text not null default 'core'
    check (subject_kind in ('core','specialized','non_counting','activity','elective')),
  add column if not exists choice_group text not null default '',
  add column if not exists choice_rule text not null default 'none'
    check (choice_rule in ('none','choose_one','all_required'));

alter table public.exams
  add column if not exists track_id uuid references public.learning_tracks(id) on delete set null,
  add column if not exists subject_id uuid references public.learning_subjects(id) on delete set null,
  add column if not exists grade_level text not null default '',
  add column if not exists curriculum_year smallint check (curriculum_year is null or curriculum_year between 1 and 3);

alter table public.articles
  add column if not exists track_id uuid references public.learning_tracks(id) on delete set null,
  add column if not exists subject_id uuid references public.learning_subjects(id) on delete set null,
  add column if not exists grade_level text not null default '',
  add column if not exists curriculum_year smallint check (curriculum_year is null or curriculum_year between 1 and 3);

create index if not exists learning_subjects_track_year_idx
  on public.learning_subjects (track_id, curriculum_year, sort_order, name);
create index if not exists learning_subjects_kind_choice_idx
  on public.learning_subjects (subject_kind, choice_group);
create index if not exists learning_resources_track_fk_idx on public.learning_resources (subject_id);
create index if not exists exams_track_subject_year_idx on public.exams (track_id, subject_id, curriculum_year);
create index if not exists articles_track_subject_year_idx on public.articles (track_id, subject_id, curriculum_year);

alter table public.learning_tracks enable row level security;
drop policy if exists learning_tracks_public_read on public.learning_tracks;
create policy learning_tracks_public_read on public.learning_tracks
  for select to anon, authenticated using (is_published = true);
drop policy if exists learning_tracks_admin_manage on public.learning_tracks;
create policy learning_tracks_admin_manage on public.learning_tracks
  for all to authenticated using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists learning_subjects_public_read on public.learning_subjects;
create policy learning_subjects_public_read on public.learning_subjects
  for select to anon, authenticated using (
    is_published = true and (
      track_id is null or exists (
        select 1 from public.learning_tracks t
        where t.id = learning_subjects.track_id and t.is_published = true
      )
    )
  );

grant select on public.learning_tracks to anon, authenticated;
grant insert, update, delete on public.learning_tracks to authenticated;

drop trigger if exists learning_tracks_set_updated_at on public.learning_tracks;
create trigger learning_tracks_set_updated_at before update on public.learning_tracks
  for each row execute function private.set_updated_at();

insert into public.learning_tracks (name,slug,description,icon,color,sort_order,is_published)
values
 ('الطب وعلوم الحياة','medicine-life-sciences','مسار يركّز على العلوم الحيوية والطبيعية، ويمهّد لدراسة مجالات الطب والعلوم الصحية والحياة.','atom','teal',1,true),
 ('الهندسة وعلوم الحاسب','engineering-computer-science','مسار يهتم بالرياضيات والفيزياء والكيمياء والبرمجة والذكاء الاصطناعي والتطبيقات التقنية.','cpu','blue',2,true),
 ('الأعمال','business','مسار يركّز على المحاسبة وإدارة الأعمال والاقتصاد والمهارات الكمية والإدارية.','briefcase-business','amber',3,true),
 ('الآداب والفنون','arts-humanities','مسار يركّز على العلوم الإنسانية واللغات وعلم النفس والجغرافيا والإحصاء ومجالات الفنون.','landmark','coral',4,true)
on conflict (slug) do update set
  name=excluded.name, description=excluded.description, icon=excluded.icon,
  color=excluded.color, sort_order=excluded.sort_order, is_published=true, updated_at=now();

-- The existing Arabic, English, and History records are common to all tracks in grade 2.
update public.learning_subjects
set track_id=null, track='جميع المسارات', curriculum_year=2, subject_kind='core',
    choice_group='', choice_rule='none', grade_level='الصف الثاني',
    description=case slug
      when 'arabic' then 'المادة الأساسية المشتركة: اللغة العربية لجميع مسارات الصف الثاني.'
      when 'english' then 'المادة الأساسية المشتركة: اللغة الإنجليزية بوصفها اللغة الأجنبية الأولى، وفق نظام المدرسة.'
      when 'history' then 'المادة الأساسية المشتركة: التاريخ المصري لجميع مسارات الصف الثاني.'
      else description end,
    updated_at=now()
where slug in ('arabic','english','history');

update public.learning_subjects
set track_id=(select id from public.learning_tracks where slug='medicine-life-sciences'),
    track='مسار الطب وعلوم الحياة', curriculum_year=2,
    subject_kind='specialized', choice_group='grade2-specialization',
    choice_rule='choose_one', grade_level='الصف الثاني', updated_at=now()
where slug='physics';

-- Grade 2: common non-total course and required practical activity.
insert into public.learning_subjects
 (name,slug,academic_stage,grade_level,track,term,description,icon,color,is_published,sort_order,curriculum_year,subject_kind,choice_group,choice_rule)
values
 ('الثقافة المالية','financial-culture-grade-2','البكالوريا المصرية','الصف الثاني','جميع المسارات','','مادة مشتركة للثقافة المالية، لا تضاف درجاتها إلى المجموع الكلي.','wallet','amber',true,10,2,'non_counting','','none'),
 ('التربية الرياضية','physical-education-grade-2','البكالوريا المصرية','الصف الثاني','جميع المسارات','','نشاط عملي إلزامي لجميع المسارات، ولا تضاف درجاته إلى المجموع.','activity','green',true,11,2,'activity','','none')
on conflict (slug) do nothing;

-- Grade 2: one chosen specialist subject from each track.
insert into public.learning_subjects
 (name,slug,academic_stage,grade_level,track_id,track,description,icon,color,is_published,sort_order,curriculum_year,subject_kind,choice_group,choice_rule)
select v.name,v.slug,'البكالوريا المصرية','الصف الثاني',t.id,t.name,v.description,v.icon,v.color,true,v.sort_order,2,'specialized','grade2-specialization','choose_one'
from (values
 ('الرياضيات','mathematics-grade-2-medicine','medicine-life-sciences','مادة اختيارية تخصصية في مسار الطب وعلوم الحياة، يختارها الطالب بديلًا للفيزياء وفق الخطة المعتمدة.','calculator','teal',2),
 ('الكيمياء','chemistry-grade-2-engineering','engineering-computer-science','مادة اختيارية تخصصية في مسار الهندسة وعلوم الحاسب، يختارها الطالب بديلًا للبرمجة والذكاء الاصطناعي.','flask-conical','blue',2),
 ('البرمجة والذكاء الاصطناعي','programming-ai-grade-2-engineering','engineering-computer-science','مادة اختيارية تخصصية في مسار الهندسة وعلوم الحاسب، يختارها الطالب بديلًا للكيمياء.','code','blue',3),
 ('المحاسبة','accounting-grade-2-business','business','مادة اختيارية تخصصية في مسار الأعمال، يختارها الطالب بديلًا لإدارة الأعمال.','calculator','amber',2),
 ('إدارة الأعمال','business-administration-grade-2','business','مادة اختيارية تخصصية في مسار الأعمال، يختارها الطالب بديلًا للمحاسبة.','briefcase-business','amber',3),
 ('علم النفس','psychology-grade-2-arts','arts-humanities','مادة اختيارية تخصصية في مسار الآداب والفنون، يختارها الطالب بديلًا للغة الأجنبية الثانية.','brain','coral',2),
 ('اللغة الأجنبية الثانية','second-foreign-language-grade-2','arts-humanities','مادة اختيارية تخصصية في مسار الآداب والفنون، يختارها الطالب بديلًا لعلم النفس.','languages','coral',3)
) as v(name,slug,track_slug,description,icon,color,sort_order)
join public.learning_tracks t on t.slug=v.track_slug
on conflict (slug) do nothing;

-- Grade 3: Religious Education is mandatory and not included in the total.
insert into public.learning_subjects
 (name,slug,academic_stage,grade_level,track,description,icon,color,is_published,sort_order,curriculum_year,subject_kind,choice_group,choice_rule)
values
 ('التربية الدينية','religious-education-grade-3','البكالوريا المصرية','الصف الثالث','جميع المسارات','مادة أساسية إلزامية في الصف الثالث، ولا تضاف إلى المجموع، ويشترط للنجاح فيها تحقيق الحد الأدنى المقرر رسميًا.','book-open','green',true,1,3,'non_counting','','none'),
 ('التربية الرياضية','physical-education-grade-3','البكالوريا المصرية','الصف الثالث','جميع المسارات','نشاط عملي إلزامي لجميع المسارات، ولا تضاف درجاته إلى المجموع.','activity','green',true,2,3,'activity','','none')
on conflict (slug) do nothing;

-- Grade 3: both specialist subjects are required in each track.
insert into public.learning_subjects
 (name,slug,academic_stage,grade_level,track_id,track,description,icon,color,is_published,sort_order,curriculum_year,subject_kind,choice_group,choice_rule)
select v.name,v.slug,'البكالوريا المصرية','الصف الثالث',t.id,t.name,v.description,v.icon,v.color,true,v.sort_order,3,'specialized','grade3-specialization','all_required'
from (values
 ('الأحياء (مستوى متقدم)','biology-advanced-grade-3-medicine','medicine-life-sciences','مادة تخصصية أساسية بمستوى متقدم في مسار الطب وعلوم الحياة.','dna','teal',1),
 ('الكيمياء (مستوى متقدم)','chemistry-advanced-grade-3-medicine','medicine-life-sciences','مادة تخصصية أساسية بمستوى متقدم في مسار الطب وعلوم الحياة.','flask-conical','teal',2),
 ('الرياضيات (مستوى متقدم)','mathematics-advanced-grade-3-engineering','engineering-computer-science','مادة تخصصية أساسية بمستوى متقدم في مسار الهندسة وعلوم الحاسب.','calculator','blue',1),
 ('الفيزياء (مستوى متقدم)','physics-advanced-grade-3-engineering','engineering-computer-science','مادة تخصصية أساسية بمستوى متقدم في مسار الهندسة وعلوم الحاسب.','atom','blue',2),
 ('الاقتصاد (مستوى متقدم)','economics-advanced-grade-3-business','business','مادة تخصصية أساسية بمستوى متقدم في مسار الأعمال.','chart-no-axes-combined','amber',1),
 ('الرياضيات','mathematics-grade-3-business','business','مادة تخصصية أساسية في مسار الأعمال.','calculator','amber',2),
 ('الجغرافيا (مستوى متقدم)','geography-advanced-grade-3-arts','arts-humanities','مادة تخصصية أساسية بمستوى متقدم في مسار الآداب والفنون.','globe','coral',1),
 ('الإحصاء','statistics-grade-3-arts','arts-humanities','مادة تخصصية أساسية في مسار الآداب والفنون.','chart-no-axes-combined','coral',2)
) as v(name,slug,track_slug,description,icon,color,sort_order)
join public.learning_tracks t on t.slug=v.track_slug
on conflict (slug) do nothing;

-- Keep every curriculum branch visible independently of its subject records.
update public.learning_subjects set updated_at=now() where updated_at is null;
