-- Performance indexes and safe deletion access for private contact attachments.
create index if not exists learning_resources_lesson_unit_fk_idx
  on public.learning_resources (lesson_id, unit_id);

create index if not exists learning_resources_unit_subject_fk_idx
  on public.learning_resources (unit_id, subject_id);

drop policy if exists tay_contact_attachments_admin_delete on storage.objects;
create policy tay_contact_attachments_admin_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'tay-contact-attachments'
    and (select private.is_admin())
  );
