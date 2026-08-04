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

-- Public registry of subjects that have been searched, decoupled from any
-- one user's private `subjects` rows. Backs the /study/[slug] sitemap: those
-- pages are public and searchable signed out, but `subjects` is per-user and
-- RLS-locked, so it can never answer "what should the sitemap list."
create table indexed_subjects (
  slug text primary key,
  name text not null,
  first_searched_at timestamptz not null default now()
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
alter table indexed_subjects enable row level security;

-- Anyone, signed in or not, can look up or register a searched slug —
-- this table holds no user data, just what subjects exist to index.
create policy "public read indexed subjects" on indexed_subjects
  for select using (true);

create policy "anyone can register a searched subject" on indexed_subjects
  for insert with check (true);

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
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''));
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
