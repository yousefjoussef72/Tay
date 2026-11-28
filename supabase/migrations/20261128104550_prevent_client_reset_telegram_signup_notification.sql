create or replace function private.complete_telegram_signup_notification(p_sent boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or p_sent is distinct from true then
    return false;
  end if;

  update private.telegram_signup_notifications
    set status = 'sent',
        updated_at = now()
    where user_id = auth.uid()
      and status = 'sending';

  return found;
end;
$$;

revoke all on function private.complete_telegram_signup_notification(boolean) from public, anon;
grant execute on function private.complete_telegram_signup_notification(boolean) to authenticated;