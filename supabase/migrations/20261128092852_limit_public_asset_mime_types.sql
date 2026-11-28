-- Public site assets must only contain display-safe image formats.
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]::text[]
where id = 'tay-assets';
