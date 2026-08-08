create table if not exists public.ai_subject_import_usage (
  subject_id uuid primary key references public.subjects(id) on delete cascade,
  scan_count int not null default 0 check (scan_count between 0 and 3),
  window_started_at timestamptz not null default now()
);

alter table public.ai_subject_import_usage enable row level security;

drop policy if exists "own subject import usage" on public.ai_subject_import_usage;
create policy "own subject import usage" on public.ai_subject_import_usage
  for all using (exists (
    select 1 from public.subjects s
    where s.id = ai_subject_import_usage.subject_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.subjects s
    where s.id = ai_subject_import_usage.subject_id and s.user_id = auth.uid()
  ));

create or replace function public.consume_subject_ai_import(p_note_id uuid)
returns table (remaining int, reset_at timestamptz)
language plpgsql
security invoker
set search_path = public
as $$
declare
  note_subject_id uuid;
  subject_usage public.ai_subject_import_usage%rowtype;
  next_count int;
  next_reset_at timestamptz;
  hours_until_reset int;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized' using errcode = '28000';
  end if;

  select n.subject_id into note_subject_id
  from public.notes n
  join public.subjects s on s.id = n.subject_id
  where n.id = p_note_id and s.user_id = auth.uid();

  if note_subject_id is null then
    raise exception 'Note not found' using errcode = 'P0002';
  end if;

  insert into public.ai_subject_import_usage (subject_id)
  values (note_subject_id)
  on conflict (subject_id) do nothing;

  select * into subject_usage
  from public.ai_subject_import_usage
  where subject_id = note_subject_id
  for update;

  if subject_usage.window_started_at <= now() - interval '24 hours' then
    next_count := 1;
    next_reset_at := now();
  else
    next_count := subject_usage.scan_count + 1;
    next_reset_at := subject_usage.window_started_at;
  end if;

  if next_count > 3 then
    hours_until_reset := greatest(1, ceil(extract(epoch from (next_reset_at + interval '24 hours' - now())) / 3600.0)::int);
    raise exception 'Daily import scan limit reached (3/3 used). Try again in about % hour(s).', hours_until_reset using errcode = 'P0001';
  end if;

  update public.ai_subject_import_usage
  set scan_count = next_count,
      window_started_at = next_reset_at
  where subject_id = note_subject_id;

  return query select 3 - next_count, next_reset_at;
end;
$$;

revoke execute on function public.consume_subject_ai_import(uuid) from anon, public;
grant execute on function public.consume_subject_ai_import(uuid) to authenticated;

notify pgrst, 'reload schema';
