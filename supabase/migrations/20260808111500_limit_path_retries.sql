create table if not exists public.path_retry_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  retry_count int not null default 0 check (retry_count between 0 and 3),
  window_started_at timestamptz not null default now()
);
alter table public.path_retry_usage enable row level security;
create policy "own path retry usage" on public.path_retry_usage
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.consume_path_retry()
returns table (remaining int)
language plpgsql security invoker set search_path = public
as $$
declare usage_row public.path_retry_usage%rowtype; next_count int;
begin
  if auth.uid() is null then raise exception 'Sign in to try another path'; end if;
  insert into public.path_retry_usage(user_id) values(auth.uid()) on conflict do nothing;
  select * into usage_row from public.path_retry_usage where user_id = auth.uid() for update;
  next_count := case when usage_row.window_started_at <= now() - interval '24 hours' then 1 else usage_row.retry_count + 1 end;
  if next_count > 3 then raise exception 'Path retry limit reached (3/3 used). Try again after the 24-hour window resets.'; end if;
  update public.path_retry_usage set retry_count = next_count, window_started_at = case when usage_row.window_started_at <= now() - interval '24 hours' then now() else usage_row.window_started_at end where user_id = auth.uid();
  return query select 3 - next_count;
end;
$$;
revoke execute on function public.consume_path_retry() from anon, public;
grant execute on function public.consume_path_retry() to authenticated;
