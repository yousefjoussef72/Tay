-- Ensure unpublished learning tracks and their dependent content stay hidden from students.
drop policy if exists learning_subjects_anon_read on public.learning_subjects;
drop policy if exists learning_subjects_authenticated_read on public.learning_subjects;
drop policy if exists learning_subjects_public_read on public.learning_subjects;

create policy learning_subjects_anon_read
on public.learning_subjects for select to anon
using (
  is_published = true
  and (
    track_id is null
    or exists (
      select 1 from public.learning_tracks t
      where t.id = learning_subjects.track_id and t.is_published = true
    )
  )
);

create policy learning_subjects_authenticated_read
on public.learning_subjects for select to authenticated
using (
  (
    is_published = true
    and (
      track_id is null
      or exists (
        select 1 from public.learning_tracks t
        where t.id = learning_subjects.track_id and t.is_published = true
      )
    )
  )
  or (select private.is_admin())
);

-- Published articles are visible only when their linked track and subject are published.
drop policy if exists articles_public_read_published on public.articles;
drop policy if exists articles_authenticated_read_published_or_admin on public.articles;

create policy articles_public_read_published
on public.articles for select to anon
using (
  is_published = true
  and (
    track_id is null
    or exists (
      select 1 from public.learning_tracks t
      where t.id = articles.track_id and t.is_published = true
    )
  )
  and (
    subject_id is null
    or exists (
      select 1 from public.learning_subjects s
      where s.id = articles.subject_id
        and s.is_published = true
        and (s.track_id is null or exists (
          select 1 from public.learning_tracks t
          where t.id = s.track_id and t.is_published = true
        ))
    )
  )
  and (
    track_id is null or subject_id is null
    or exists (
      select 1 from public.learning_subjects s
      where s.id = articles.subject_id and s.track_id = articles.track_id
    )
  )
);

create policy articles_authenticated_read_published_or_admin
on public.articles for select to authenticated
using (
  (
    is_published = true
    and (
      track_id is null
      or exists (
        select 1 from public.learning_tracks t
        where t.id = articles.track_id and t.is_published = true
      )
    )
    and (
      subject_id is null
      or exists (
        select 1 from public.learning_subjects s
        where s.id = articles.subject_id
          and s.is_published = true
          and (s.track_id is null or exists (
            select 1 from public.learning_tracks t
            where t.id = s.track_id and t.is_published = true
          ))
      )
    )
    and (
      track_id is null or subject_id is null
      or exists (
        select 1 from public.learning_subjects s
        where s.id = articles.subject_id and s.track_id = articles.track_id
      )
    )
  )
  or (select private.is_admin())
);

-- Published exams follow the same curriculum visibility rules as articles.
drop policy if exists exams_public_read_published on public.exams;
drop policy if exists exams_authenticated_read_published_or_admin on public.exams;

create policy exams_public_read_published
on public.exams for select to anon
using (
  is_published = true
  and (
    track_id is null
    or exists (
      select 1 from public.learning_tracks t
      where t.id = exams.track_id and t.is_published = true
    )
  )
  and (
    subject_id is null
    or exists (
      select 1 from public.learning_subjects s
      where s.id = exams.subject_id
        and s.is_published = true
        and (s.track_id is null or exists (
          select 1 from public.learning_tracks t
          where t.id = s.track_id and t.is_published = true
        ))
    )
  )
  and (
    track_id is null or subject_id is null
    or exists (
      select 1 from public.learning_subjects s
      where s.id = exams.subject_id and s.track_id = exams.track_id
    )
  )
);

create policy exams_authenticated_read_published_or_admin
on public.exams for select to authenticated
using (
  (
    is_published = true
    and (
      track_id is null
      or exists (
        select 1 from public.learning_tracks t
        where t.id = exams.track_id and t.is_published = true
      )
    )
    and (
      subject_id is null
      or exists (
        select 1 from public.learning_subjects s
        where s.id = exams.subject_id
          and s.is_published = true
          and (s.track_id is null or exists (
            select 1 from public.learning_tracks t
            where t.id = s.track_id and t.is_published = true
          ))
      )
    )
    and (
      track_id is null or subject_id is null
      or exists (
        select 1 from public.learning_subjects s
        where s.id = exams.subject_id and s.track_id = exams.track_id
      )
    )
  )
  or (select private.is_admin())
);
