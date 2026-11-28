-- Username/password authentication support. Existing auth.users and passwords remain intact.
alter table public.profiles
  add column if not exists username text;

update public.profiles as p
set username = left(
  lower(regexp_replace(split_part(u.email, '@', 1), '[^a-zA-Z0-9_]+', '_', 'g')),
  24
)
from auth.users as u
where u.id = p.id
  and (p.username is null or btrim(p.username) = '');

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_username_format_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_username_format_check
      check (username is null or username ~ '^[a-z0-9_]{3,24}$');
  end if;
end
$$;

create unique index if not exists profiles_username_lower_uidx
  on public.profiles (lower(username))
  where username is not null;

create table if not exists public.username_signup_attempts (
  id bigserial primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

alter table public.username_signup_attempts enable row level security;
revoke all on table public.username_signup_attempts from public, anon, authenticated;
grant select, insert, delete on table public.username_signup_attempts to service_role;
grant usage, select on sequence public.username_signup_attempts_id_seq to service_role;

create index if not exists username_signup_attempts_ip_created_idx
  on public.username_signup_attempts (ip_hash, created_at desc);

grant select, update on public.profiles to service_role;
