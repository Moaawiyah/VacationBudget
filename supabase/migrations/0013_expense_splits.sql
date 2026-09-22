-- ============================================================================
-- 0013_expense_splits.sql — who paid, and who owes what share.
-- Run in the Supabase SQL Editor after 0012_integrity_followup.sql.
--
-- Shares are in the expense's own currency (sum = expenses.amount): that's
-- how people split ("CHF 20 each"). Base-currency balances are derived from
-- the database-computed converted_amount (see lib/finance/balances.ts).
-- Every existing expense becomes a 100% share for its author — unchanged.
-- Error codes: VB003 shares ≠ amount · VB004 percentages ≠ 100
-- VB005 unequal "equal" split · VB006 not a trip participant · VB007 sub-unit.
-- ============================================================================
begin;

alter table public.expenses
  add column paid_by uuid references public.profiles (id),
  add column split_method text not null default 'equal'
    check (split_method in ('equal', 'exact', 'percentage'));
update public.expenses set paid_by = user_id where paid_by is null;
alter table public.expenses alter column paid_by set not null;
create index expenses_paid_by_idx on public.expenses (paid_by);

create table public.expense_splits (
  expense_id uuid not null references public.expenses (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  share_amount numeric(12, 2) not null check (share_amount >= 0),
  share_percent numeric(7, 4) check (share_percent between 0 and 100),
  created_at timestamptz not null default now(),
  primary key (expense_id, user_id) -- one share per traveler per expense
);
create index expense_splits_user_id_idx on public.expense_splits (user_id);

insert into public.expense_splits (expense_id, user_id, share_amount)
select id, user_id, amount from public.expenses;

-- JPY has no minor unit; every other supported currency has cents.
create or replace function private.currency_exponent(code text)
returns int language sql immutable as $$ select case code when 'JPY' then 0 else 2 end $$;

-- The whole-expense invariants. Deferred to commit, when all rows exist.
create or replace function private.check_expense_split(target uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  e public.expenses%rowtype;
  unit numeric;
  n int; share_sum numeric; percent_sum numeric; percent_n int; hi numeric; lo numeric;
begin
  select * into e from public.expenses where id = target;
  if not found then return; end if; -- the expense itself was deleted
  unit := power(10::numeric, -private.currency_exponent(e.currency));
  select count(*), coalesce(sum(share_amount), 0), sum(share_percent), count(share_percent),
         max(share_amount), min(share_amount)
    into n, share_sum, percent_sum, percent_n, hi, lo
    from public.expense_splits where expense_id = target;

  if n = 0 or share_sum <> e.amount then
    raise exception 'shares (%) must add up to the expense amount (%)', share_sum, e.amount
      using errcode = 'VB003';
  end if;
  if e.split_method = 'percentage' and (percent_n <> n or percent_sum <> 100) then
    raise exception 'percentages must add up to 100' using errcode = 'VB004';
  end if;
  if e.split_method = 'percentage' and exists (
    select 1 from public.expense_splits where expense_id = target
      and abs(share_amount - e.amount * share_percent / 100) >= unit) then
    raise exception 'a share does not match its percentage' using errcode = 'VB004';
  end if;
  if e.split_method = 'equal' and hi - lo > unit then
    raise exception 'equal shares may differ by at most one minor unit' using errcode = 'VB005';
  end if;
  if exists (select 1 from public.expense_splits where expense_id = target
             and share_amount <> round(share_amount, private.currency_exponent(e.currency))) then
    raise exception '% has no smaller unit than %', e.currency, unit using errcode = 'VB007';
  end if;
end;
$$;

create or replace function private.expense_split_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'expenses' then
    perform private.check_expense_split(new.id);
  else
    perform private.check_expense_split(coalesce(new.expense_id, old.expense_id));
  end if;
  return null;
end;
$$;

create constraint trigger expense_splits_balanced
  after insert or update or delete on public.expense_splits
  deferrable initially deferred for each row
  execute function private.expense_split_guard();
create constraint trigger expenses_split_balanced
  after insert or update of amount, currency, split_method on public.expenses
  deferrable initially deferred for each row
  execute function private.expense_split_guard();

-- Participation is checked on the rows being *written*: a traveler who has
-- since left still appears on old expenses, and editing an old expense's
-- description must not require rewriting that history.
create or replace function private.require_trip_participant()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  trip uuid;
  person uuid;
begin
  if tg_table_name = 'expenses' then
    new.paid_by := coalesce(new.paid_by, new.user_id);
    if tg_op = 'UPDATE' and new.paid_by = old.paid_by then return new; end if;
    trip := new.trip_id;
    person := new.paid_by;
  else
    select trip_id into trip from public.expenses where id = new.expense_id;
    person := new.user_id;
  end if;
  if not private.is_trip_participant(trip, person) then
    raise exception 'user is not a participant of this trip' using errcode = 'VB006';
  end if;
  return new;
end;
$$;

create trigger require_payer_participant
  before insert or update of paid_by on public.expenses
  for each row execute function private.require_trip_participant();
create trigger require_split_participant
  before insert or update on public.expense_splits
  for each row execute function private.require_trip_participant();

commit;
