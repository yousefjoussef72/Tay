alter table public.learning_research_projects
  drop constraint if exists learning_research_projects_simulator_type_check;

alter table public.learning_research_projects
  add constraint learning_research_projects_simulator_type_check
  check (
    simulator_type is null
    or simulator_type in (
      'harmonic_spring',
      'simple_pendulum',
      'wave_motion',
      'projectile_motion',
      'free_fall',
      'generic_model'
    )
  );
