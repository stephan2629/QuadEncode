create table if not exists public.subject_quiz_session_usage (
  subject_id uuid primary key references public.subjects(id) on delete cascade,
  session_count int not null default 0 check (session_count between 0 and 3),
  window_started_at timestamptz not null default now()
);
alter table public.subject_quiz_session_usage enable row level security;

drop policy if exists "own subject quiz usage" on public.subject_quiz_session_usage;
create policy "own subject quiz usage" on public.subject_quiz_session_usage
  for all using (
    exists (
      select 1 from public.subjects s
      where s.id = subject_quiz_session_usage.subject_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.subjects s
      where s.id = subject_quiz_session_usage.subject_id and s.user_id = auth.uid()
    )
  );

create or replace function public.consume_subject_quiz_session(p_note_id uuid)
returns table (remaining int)
language plpgsql
security invoker set search_path = public
as $$
declare
  note_subject_id uuid;
  usage_row public.subject_quiz_session_usage%rowtype;
  next_count int;
  hours_until_reset int;
begin
  select n.subject_id into note_subject_id
  from public.notes n
  join public.subjects s on s.id = n.subject_id
  where n.id = p_note_id and s.user_id = auth.uid();

  if note_subject_id is null then raise exception 'Note not found'; end if;

  insert into public.subject_quiz_session_usage(subject_id) values(note_subject_id)
  on conflict do nothing;

  select * into usage_row from public.subject_quiz_session_usage
  where subject_id = note_subject_id for update;

  next_count := case
    when usage_row.window_started_at <= now() - interval '24 hours' then 1
    else usage_row.session_count + 1
  end;

  if next_count > 3 then
    hours_until_reset := greatest(1, ceil(extract(epoch from (usage_row.window_started_at + interval '24 hours' - now())) / 3600.0)::int);
    raise exception 'Quiz limit reached (3/3 used). Try again in about % hour(s).', hours_until_reset;
  end if;

  update public.subject_quiz_session_usage
  set session_count = next_count,
      window_started_at = case when usage_row.window_started_at <= now() - interval '24 hours' then now() else usage_row.window_started_at end
  where subject_id = note_subject_id;

  return query select 3 - next_count;
end;
$$;
revoke execute on function public.consume_subject_quiz_session(uuid) from anon, public;
grant execute on function public.consume_subject_quiz_session(uuid) to authenticated;
