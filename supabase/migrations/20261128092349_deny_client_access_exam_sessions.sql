-- Explicitly deny direct API access to exam session records.
create policy exam_sessions_deny_client_access
on public.exam_sessions
for all
to anon, authenticated
using (false)
with check (false);
