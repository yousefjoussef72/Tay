insert into public.learning_subjects
  (name, slug, academic_stage, grade_level, track, description, icon, color, is_published, sort_order)
values
  ('اللغة العربية', 'arabic', 'البكالوريا المصرية', 'الصف الثاني', 'مسار الطب وعلوم الحياة',
   'مساحة جاهزة لإضافة وحدات ودروس وأنشطة اللغة العربية من لوحة الإدارة.',
   'book-open', 'coral', true, 1),
  ('اللغة الإنجليزية', 'english', 'البكالوريا المصرية', 'الصف الثاني', 'مسار الطب وعلوم الحياة',
   'مساحة جاهزة لإضافة وحدات ودروس وأنشطة اللغة الإنجليزية من لوحة الإدارة.',
   'languages', 'blue', true, 2),
  ('التاريخ', 'history', 'البكالوريا المصرية', 'الصف الثاني', 'مسار الطب وعلوم الحياة',
   'مساحة جاهزة لإضافة وحدات ودروس وأنشطة التاريخ من لوحة الإدارة.',
   'landmark', 'amber', true, 3)
on conflict (slug) do nothing;

update public.learning_subjects
set sort_order = 4, updated_at = now()
where slug = 'physics';
