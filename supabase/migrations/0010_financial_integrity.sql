-- ============================================================================
-- 0010_financial_integrity.sql
-- Run in the Supabase SQL Editor after 0009_authorization_hardening.sql.
--
-- Invariants the app already respects, now enforced by the database so a
-- direct API call (the browser holds a user JWT and the anon key) can't
-- violate them. Custom SQLSTATEs (class VB) let the app map each to a
-- specific user-facing message instead of a raw database error.
-- ============================================================================
begin;

-- ---------------------------------------------------------------------------
-- Expenses: the database, not the client, derives the converted amount. A
-- same-currency expense always converts at 1. An expense can't be handed to
-- another user or moved to another trip after it's created.
-- ---------------------------------------------------------------------------
create or replace function public.expenses_derive_amounts()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  trip_currency text;
begin
  if tg_op = 'UPDATE'
     and (new.user_id is distinct from old.user_id
          or new.trip_id is distinct from old.trip_id) then
    raise exception 'expense owner and trip cannot change'
      using errcode = 'VB002';
  end if;

  select base_currency into trip_currency from public.trips where id = new.trip_id;
  if new.currency = trip_currency then
    new.exchange_rate := 1;
  end if;
  new.converted_amount := round(new.amount * new.exchange_rate, 2);
  return new;
end;
$$;

drop trigger if exists derive_expense_amounts on public.expenses;
create trigger derive_expense_amounts
  before insert or update on public.expenses
  for each row execute function public.expenses_derive_amounts();

-- ---------------------------------------------------------------------------
-- Trips: every stored conversion is relative to the trip's base currency, so
-- changing it once expenses exist would silently make every total wrong.
-- ---------------------------------------------------------------------------
create or replace function public.trips_lock_currency()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.base_currency is distinct from old.base_currency
     and exists (select 1 from public.expenses where trip_id = new.id) then
    raise exception 'base currency cannot change once a trip has expenses'
      using errcode = 'VB001';
  end if;
  return new;
end;
$$;

drop trigger if exists lock_trip_currency on public.trips;
create trigger lock_trip_currency
  before update of base_currency on public.trips
  for each row execute function public.trips_lock_currency();

-- ---------------------------------------------------------------------------
-- Length limits mirroring lib/validation/*.ts. NOT VALID: they bind new and
-- updated rows without failing this migration on any pre-existing data.
-- ---------------------------------------------------------------------------
alter table public.expenses
  add constraint expenses_description_length
    check (char_length(btrim(description)) between 1 and 200) not valid,
  add constraint expenses_merchant_length
    check (merchant is null or char_length(merchant) <= 200) not valid,
  add constraint expenses_location_length
    check (location is null or char_length(location) <= 200) not valid,
  add constraint expenses_notes_length
    check (notes is null or char_length(notes) <= 1000) not valid;

alter table public.categories
  add constraint categories_name_length
    check (char_length(btrim(name)) between 1 and 50) not valid;

commit;
