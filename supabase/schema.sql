-- Quad Encode schema (section 6 of CLAUDE.md)
-- Run this in the Supabase SQL editor for a new project (Phase 0).

create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  quiz_count_today int not null default 0,
  last_quiz_reset_at timestamptz not null default now()
);

create table subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table paths (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  generated_at timestamptz not null default now()
);

create table resources (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  title text not null,
  url text not null,
  provider text,
  is_free boolean not null default true,
  cost text,
  format text,
  description text,
  rank int
);

create table path_steps (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references paths(id) on delete cascade,
  "order" int not null,
  resource_id uuid not null references resources(id) on delete cascade,
  status text not null default 'not_started'
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  section text,
  title text,
  body_md text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  pdf_path text,
  video_id text
);

create table cards (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references notes(id) on delete cascade,
  line int not null,
  tier text not null check (tier in ('authored', 'imported')),
  type text not null default 'basic',
  prompt text not null,
  answer text not null default '',
  confusable_with uuid[] not null default '{}',
  source_excerpt text,
  explanation text,
  video_id text,
  t int,
  box int not null default 0 check (box between 0 and 5),
  due timestamptz not null default now(),
  fails int not null default 0
);

-- Guards against the race between autosave and manual save both deciding
-- the same **Vocab:**/**Quiz:** line is new and inserting it twice
-- (syncCardsFromNote in src/app/notes/[id]/actions.ts). Partial, not a
-- full-table constraint: cloze cards are meant to share a line with each
-- other (two different selections on one line is a normal cloze workflow)
-- and with a vocab/quiz card on that line, so the predicate keeps them out
-- of this check entirely. See docs/decisions/0009.
create unique index cards_vocab_basic_note_line_key on cards (note_id, line)
  where type in ('basic', 'vocab');

create table reviews (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references cards(id) on delete cascade,
  rated text not null,
  reviewed_at timestamptz not null default now()
);

create table imports (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  kind text not null,
  raw_ref text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- One row per subject makes AI import limits independent between subjects.
-- The database function below locks this row before spending a scan.
create table ai_subject_import_usage (
  subject_id uuid primary key references subjects(id) on delete cascade,
  scan_count int not null default 0 check (scan_count between 0 and 3),
  window_started_at timestamptz not null default now()
);

-- Public registry of subjects that have been searched, decoupled from any
-- one user's private `subjects` rows. Backs the /study/[slug] sitemap: those
-- pages are public and searchable signed out, but `subjects` is per-user and
-- RLS-locked, so it can never answer "what should the sitemap list."
create table indexed_subjects (
  slug text primary key,
  name text not null,
  first_searched_at timestamptz not null default now()
);

-- Shared cache of a generated path, keyed by slug. Search works signed out
-- and a given subject's path is the same for every visitor, so like
-- indexed_subjects above this holds no user data and is not scoped per
-- user - one row serves everyone who searches that slug until it goes
-- stale. Saves a Serper + YouTube + Gemini + link-check pass (~20s) on
-- every visit after the first. See docs/decisions/0006.
create table path_cache (
  slug text primary key,
  subject_name text not null,
  overview text not null,
  resources jsonb not null,
  generated_at timestamptz not null default now()
);

-- Row level security: every table, owned rows only.
alter table profiles enable row level security;
alter table subjects enable row level security;
alter table paths enable row level security;
alter table resources enable row level security;
alter table path_steps enable row level security;
alter table notes enable row level security;
alter table cards enable row level security;
alter table reviews enable row level security;
alter table imports enable row level security;
alter table ai_subject_import_usage enable row level security;
alter table indexed_subjects enable row level security;
alter table path_cache enable row level security;

-- Anyone can read public search indexes; server-side generation writes them
-- with the service role so an anonymous client cannot poison shared results.
create policy "public read indexed subjects" on indexed_subjects
  for select using (true);

create policy "public read path cache" on path_cache
  for select using (true);

create policy "own profile" on profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own subjects" on subjects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own paths" on paths
  for all using (exists (select 1 from subjects s where s.id = paths.subject_id and s.user_id = auth.uid()))
  with check (exists (select 1 from subjects s where s.id = paths.subject_id and s.user_id = auth.uid()));

create policy "own resources" on resources
  for all using (exists (select 1 from subjects s where s.id = resources.subject_id and s.user_id = auth.uid()))
  with check (exists (select 1 from subjects s where s.id = resources.subject_id and s.user_id = auth.uid()));

create policy "own path_steps" on path_steps
  for all using (exists (
    select 1 from paths p join subjects s on s.id = p.subject_id
    where p.id = path_steps.path_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from paths p join subjects s on s.id = p.subject_id
    where p.id = path_steps.path_id and s.user_id = auth.uid()
  ));

create policy "own notes" on notes
  for all using (exists (select 1 from subjects s where s.id = notes.subject_id and s.user_id = auth.uid()))
  with check (exists (select 1 from subjects s where s.id = notes.subject_id and s.user_id = auth.uid()));

create policy "own cards" on cards
  for all using (exists (
    select 1 from notes n join subjects s on s.id = n.subject_id
    where n.id = cards.note_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from notes n join subjects s on s.id = n.subject_id
    where n.id = cards.note_id and s.user_id = auth.uid()
  ));

create policy "own reviews" on reviews
  for all using (exists (
    select 1 from cards c
    join notes n on n.id = c.note_id
    join subjects s on s.id = n.subject_id
    where c.id = reviews.card_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from cards c
    join notes n on n.id = c.note_id
    join subjects s on s.id = n.subject_id
    where c.id = reviews.card_id and s.user_id = auth.uid()
  ));

create policy "own imports" on imports
  for all using (exists (select 1 from subjects s where s.id = imports.subject_id and s.user_id = auth.uid()))
  with check (exists (select 1 from subjects s where s.id = imports.subject_id and s.user_id = auth.uid()));

create policy "own subject import usage" on ai_subject_import_usage
  for all using (exists (select 1 from subjects s where s.id = ai_subject_import_usage.subject_id and s.user_id = auth.uid()))
  with check (exists (select 1 from subjects s where s.id = ai_subject_import_usage.subject_id and s.user_id = auth.uid()));

-- Storage bucket for the original PDF behind an import (notes.pdf_path),
-- kept as a private file so the source stays visible only to the user who
-- imported it (section 20). Objects are stored at {user_id}/{note_id}/{name}
-- so the folder-prefix check below is the whole ownership rule; getNote()
-- turns pdf_path into a short-lived signed URL rather than a public one.
insert into storage.buckets (id, name, public)
values ('note-pdfs', 'note-pdfs', false)
on conflict (id) do nothing;

create policy "own pdf uploads" on storage.objects
  for all using (bucket_id = 'note-pdfs' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'note-pdfs' and (storage.foldername(name))[1] = auth.uid()::text);

-- AI-backed imports are limited to three scans per subject per rolling
-- 24-hour window. The row lock makes the count safe against simultaneous
-- Server Action requests, and the note lookup rejects forged note ids.
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

  if not found then
    raise exception 'Import usage record not found' using errcode = 'P0002';
  end if;

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

-- Auto-create a profile row for every new auth user, covering both
-- email/password signup and OAuth (Google) signup uniformly, since OAuth
-- users never go through the app's own signup server action.
-- This section is idempotent and safe to run on its own against an
-- existing database.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- This runs inside the signup transaction, so any error here rolls the whole
  -- signup back. A leftover profile row (deleting a user mid-testing is enough
  -- to leave one) would otherwise trip the unique constraint on user_id and
  -- fail every subsequent signup with an opaque database error.
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any users created before the trigger existed.
insert into public.profiles (user_id, display_name)
select u.id, coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')
from auth.users u
where not exists (select 1 from public.profiles p where p.user_id = u.id);

-- Self-service account deletion. Deleting the auth.users row cascades
-- through profiles and subjects (and from subjects through notes, cards,
-- reviews, paths, imports) via the FKs above. security definer lets the
-- authenticated user delete their own auth row without the service key.
create or replace function public.delete_own_account()
returns void
language sql
security definer set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke execute on function public.delete_own_account() from anon, public;
grant execute on function public.delete_own_account() to authenticated;

-- A subject receives three newly started quiz sessions in a rolling 24-hour
-- window. Imports are intentionally not counted here.
create table if not exists public.subject_quiz_session_usage (
  subject_id uuid primary key references public.subjects(id) on delete cascade,
  session_count int not null default 0 check (session_count between 0 and 3),
  window_started_at timestamptz not null default now()
);

alter table public.subject_quiz_session_usage enable row level security;
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

-- Protect the global three-active-path limit from concurrent requests. The
-- application check remains for immediate UI feedback; this trigger is the
-- final authority.
create or replace function public.enforce_active_path_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  owner_id uuid;
  active_path_count integer;
begin
  select user_id into owner_id
  from public.subjects
  where id = new.subject_id;

  if owner_id is null then
    raise exception 'Subject not found';
  end if;

  perform pg_advisory_xact_lock(hashtext(owner_id::text));

  select count(*) into active_path_count
  from public.paths p
  join public.subjects s on s.id = p.subject_id
  where s.user_id = owner_id;

  if active_path_count >= 3 then
    raise exception 'You already have 3 active learning paths. Delete one before saving another.';
  end if;

  return new;
end;
$$;

create trigger enforce_active_path_limit
  before insert on public.paths
  for each row execute function public.enforce_active_path_limit();
