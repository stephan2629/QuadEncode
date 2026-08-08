-- Path regeneration is no longer a product feature, so its quota has no
-- callers and should not remain in deployed databases.
drop function if exists public.consume_path_retry();
drop table if exists public.path_retry_usage;
