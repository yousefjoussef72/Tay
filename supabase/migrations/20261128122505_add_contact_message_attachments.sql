-- Allow public contact submissions to include a small set of private attachments.
alter table public.messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

alter table public.messages
  drop constraint if exists messages_attachments_array_check;

alter table public.messages
  add constraint messages_attachments_array_check
  check (
    case
      when jsonb_typeof(attachments) = 'array'
        then jsonb_array_length(attachments) <= 5
      else false
    end
  );

drop policy if exists "messages_public_insert" on public.messages;
create policy "messages_public_insert" on public.messages
  for insert to anon, authenticated
  with check (
    length(trim(name)) between 1 and 120
    and length(trim(email)) between 3 and 254
    and (
      length(trim(message)) between 1 and 5000
      or jsonb_array_length(attachments) > 0
    )
    and jsonb_typeof(attachments) = 'array'
    and jsonb_array_length(attachments) <= 5
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tay-contact-attachments',
  'tay-contact-attachments',
  false,
  52428800,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/ogg'
  ]::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists tay_contact_attachments_public_upload on storage.objects;
create policy tay_contact_attachments_public_upload
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'tay-contact-attachments'
  and (storage.foldername(name))[1] = 'incoming'
);

drop policy if exists tay_contact_attachments_admin_read on storage.objects;
create policy tay_contact_attachments_admin_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'tay-contact-attachments'
  and (select private.is_admin())
);
