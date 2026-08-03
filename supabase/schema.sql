-- Quad Encode schema (section 6 of CLAUDE.md)
-- Run this in the Supabase SQL editor for a new project (Phase 0).

create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
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
  updated_at timestamptz not null default now()
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

-- Auto-create a profile row for every new auth user, covering both
-- email/password signup and OAuth (Google) signup uniformly, since OAuth
-- users never go through the app's own signup server action.
create function public.handle_new_user()
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
