-- Keep unpublished educational files private and allow signed links only for published resources.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tay-library',
  'tay-library',
  false,
  52428800,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy tay_library_public_read_published
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'tay-library'
  and exists (
    select 1
    from public.learning_resources r
    where r.file_path = name
      and r.is_published = true
  )
);

create policy tay_library_admin_read_private
on storage.objects
for select
to authenticated
using (
  bucket_id = 'tay-library'
  and (select private.is_admin())
);

create policy tay_library_admin_upload
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'tay-library'
  and (select private.is_admin())
);

create policy tay_library_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'tay-library'
  and (select private.is_admin())
)
with check (
  bucket_id = 'tay-library'
  and (select private.is_admin())
);

create policy tay_library_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'tay-library'
  and (select private.is_admin())
);
