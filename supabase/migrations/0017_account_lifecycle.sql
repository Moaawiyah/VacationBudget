-- ============================================================================
-- 0017_account_lifecycle.sql — deleting an account must not corrupt a trip
-- other people still share.
-- Run in the Supabase SQL Editor after 0016_historical_fx.sql.
--
-- Today, expenses.user_id and trips.user_id cascade: deleting a profile
-- would silently delete every trip that person owns (everyone else's
-- expenses, splits and settlements inside it too) and every expense they
-- ever authored, even in trips they don't own. That's exactly the
-- corruption the app must avoid, so both are changed to RESTRICT — a raw
-- profile delete now fails loudly instead of cascading history away. The
-- app itself never hard-deletes an active profile (see
-- lib/sdk/account-service.ts): it tombstones one instead, which needs no
-- special-casing here since it only ever updates the row, never deletes it.
--
-- The FK name isn't hardcoded (Postgres auto-generates it, and guessing
-- wrong against a live database is worse than this being a few lines
-- longer) — each block finds its own constraint by table/column and drops
-- exactly that one.
-- ============================================================================
begin;

alter table public.profiles add column deleted_at timestamptz;

do $$
declare
  fk text;
begin
  select conname into fk from pg_constraint
   where conrelid = 'public.expenses'::regclass and contype = 'f'
     and conkey = (select array_agg(attnum) from pg_attribute
                   where attrelid = 'public.expenses'::regclass and attname = 'user_id');
  execute format('alter table public.expenses drop constraint %I', fk);
end $$;
alter table public.expenses
  add constraint expenses_user_id_fkey foreign key (user_id) references public.profiles (id);

do $$
declare
  fk text;
begin
  select conname into fk from pg_constraint
   where conrelid = 'public.trips'::regclass and contype = 'f'
     and conkey = (select array_agg(attnum) from pg_attribute
                   where attrelid = 'public.trips'::regclass and attname = 'user_id');
  execute format('alter table public.trips drop constraint %I', fk);
end $$;
alter table public.trips
  add constraint trips_user_id_fkey foreign key (user_id) references public.profiles (id);

commit;
