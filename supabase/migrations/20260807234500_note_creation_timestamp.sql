alter table public.notes
  add column if not exists created_at timestamptz;

update public.notes
set created_at = updated_at
where created_at is null;

alter table public.notes
  alter column created_at set default now(),
  alter column created_at set not null;
