-- The dashboard's count-before-insert check is useful feedback, but it is
-- not safe against concurrent requests. This trigger serializes new paths
-- per owner and rejects the fourth path in the database itself.
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

drop trigger if exists enforce_active_path_limit on public.paths;
create trigger enforce_active_path_limit
  before insert on public.paths
  for each row execute function public.enforce_active_path_limit();
