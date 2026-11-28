alter table public.exams
  add column if not exists cover_image_url text;

alter table public.exam_questions
  add column if not exists image_url text;
