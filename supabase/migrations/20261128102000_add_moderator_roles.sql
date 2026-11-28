-- Keep syznstwr as the sole master administrator and allow delegated moderators.
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('member', 'admin', 'moderator'));

do $migration$
begin
  if not exists (
    select 1
    from public.profiles
    where lower(username) = 'syznstwr'
      and role = 'admin'
  ) then
    raise exception 'master_admin_syznstwr_not_found';
  end if;

  update public.profiles
  set role = 'member'
  where role = 'admin'
    and lower(coalesce(username, '')) <> 'syznstwr';
end;
$migration$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.profiles as p
    where p.id = (select auth.uid())
      and p.role in ('admin', 'moderator')
      and (
        p.role = 'moderator'
        or lower(coalesce(p.username, '')) = 'syznstwr'
      )
  );
$function$;

revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

create or replace function private.is_master_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.profiles as p
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and lower(coalesce(p.username, '')) = 'syznstwr'
  );
$function$;

revoke all on function private.is_master_admin() from public, anon;
grant execute on function private.is_master_admin() to authenticated;
