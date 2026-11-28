create table if not exists private.telegram_signup_notifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'sending'
    check (status in ('sending', 'sent', 'failed')),
  attempts integer not null default 1 check (attempts >= 1),
  updated_at timestamptz not null default now()
);

alter table private.telegram_signup_notifications enable row level security;
revoke all on table private.telegram_signup_notifications from public, anon, authenticated;

create or replace function public.claim_telegram_signup_notification()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_created_at timestamptz;
  v_rows integer;
begin
  if v_user_id is null then
    return false;
  end if;

  select u.created_at
    into v_created_at
    from auth.users as u
    where u.id = v_user_id;

  if v_created_at is null
     or v_created_at < now() - interval '15 minutes'
     or v_created_at > now() + interval '1 minute' then
    return false;
  end if;

  insert into private.telegram_signup_notifications as notification
    (user_id, status, attempts, updated_at)
  values
    (v_user_id, 'sending', 1, now())
  on conflict (user_id) do update
    set status = 'sending',
        attempts = notification.attempts + 1,
        updated_at = now()
    where notification.status = 'failed'
       or (notification.status = 'sending' and notification.updated_at < now() - interval '2 minutes');

  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

create or replace function public.complete_telegram_signup_notification(p_sent boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  update private.telegram_signup_notifications
    set status = case when p_sent then 'sent' else 'failed' end,
        updated_at = now()
    where user_id = auth.uid()
      and status = 'sending';

  return found;
end;
$$;

revoke all on function public.claim_telegram_signup_notification() from public, anon;
revoke all on function public.complete_telegram_signup_notification(boolean) from public, anon;
grant execute on function public.claim_telegram_signup_notification() to authenticated;
grant execute on function public.complete_telegram_signup_notification(boolean) to authenticated;
