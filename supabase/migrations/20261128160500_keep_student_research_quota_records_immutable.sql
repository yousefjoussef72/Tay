revoke all privileges on table public.learning_research_projects from anon, authenticated, public;
grant select on table public.learning_research_projects to authenticated;
drop policy if exists learning_research_projects_delete_own
  on public.learning_research_projects;
