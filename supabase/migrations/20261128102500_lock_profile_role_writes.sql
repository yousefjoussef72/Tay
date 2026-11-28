-- Profile role changes are service-managed only; authenticated clients may read permitted rows.
revoke insert, update, delete on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
