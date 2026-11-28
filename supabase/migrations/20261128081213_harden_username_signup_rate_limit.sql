-- Harden username-only signup throttling.
-- The function serializes attempts per IP hash so concurrent requests cannot race the limit.
create policy "username_signup_attempts_service_role_only"
  on public.username_signup_attempts
  for all
  to service_role
  using (true)
  with check (true);

create index if not exists username_signup_attempts_created_at_idx
  on public.username_signup_attempts (created_at);

create or replace function public.consume_username_signup_attempt(p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent_attempts integer;
begin
  if p_ip_hash is null or p_ip_hash !~ '^[a-f0-9]{64}$' then
    return false;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_ip_hash, 0)
  );

  delete from public.username_signup_attempts
  where created_at < pg_catalog.now() - interval '24 hours';

  select count(*)::integer
    into recent_attempts
  from public.username_signup_attempts
  where ip_hash = p_ip_hash
    and created_at >= pg_catalog.now() - interval '15 minutes';

  if recent_attempts >= 5 then
    return false;
  end if;

  insert into public.username_signup_attempts (ip_hash)
  values (p_ip_hash);

  return true;
end;
$$;

revoke all on function public.consume_username_signup_attempt(text)
  from public, anon, authenticated;
grant execute on function public.consume_username_signup_attempt(text)
  to service_role;
