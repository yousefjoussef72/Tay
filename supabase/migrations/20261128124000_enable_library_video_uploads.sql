-- Add uploaded video support to the private learning library.
-- The current Supabase organization is on the Free plan, whose global upload limit is 50 MB.
-- Keep the bucket cap aligned with that enforced global maximum; 200 MB requires a plan that allows it.

alter table public.learning_resources
  drop constraint if exists learning_resources_resource_type_check;

alter table public.learning_resources
  add constraint learning_resources_resource_type_check
  check (resource_type in ('pdf', 'image', 'document', 'video', 'link'));

update storage.buckets
set
  allowed_mime_types = array[
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
  ]::text[],
  file_size_limit = 52428800
where id = 'tay-library';
