drop policy if exists "exam_questions_read_for_published_exam_or_admin" on public.exam_questions;
create policy "exam_questions_public_read_published" on public.exam_questions for select to anon
using (exists (select 1 from public.exams e where e.id = exam_questions.exam_id and e.is_published = true));
create policy "exam_questions_authenticated_read_published_or_admin" on public.exam_questions for select to authenticated
using ((select private.is_admin()) or exists (select 1 from public.exams e where e.id = exam_questions.exam_id and e.is_published = true));
