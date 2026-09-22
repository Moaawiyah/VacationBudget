-- ============================================================================
-- 0016_historical_fx.sql — where an expense's exchange rate came from.
-- Run in the Supabase SQL Editor after 0015_settlements.sql.
--
-- exchange_rate itself was already permanent (0010 derives converted_amount
-- from whatever rate is stored, once, at write time — it's never recomputed
-- from "today's" rate on read). This adds only provenance: was the rate
-- looked up or typed in, and as of what date. create_expense/update_expense
-- (0014) are replaced (same signature) to carry the two new fields; every
-- other trigger and policy from 0013/0014 applies to them unchanged.
-- ============================================================================
begin;

alter table public.expenses add column rate_date date;
update public.expenses set rate_date = created_at::date;
alter table public.expenses alter column rate_date set not null;
alter table public.expenses alter column rate_date set default current_date;

-- Every existing expense really was priced manually — no provider existed
-- before this migration — so 'manual' is accurate for the backfill, not
-- just a placeholder.
alter table public.expenses add column rate_source text not null default 'manual'
  check (rate_source in ('manual', 'frankfurter'));

create or replace function public.create_expense(
  p_trip_id uuid, p_expense jsonb, p_splits jsonb, p_request_id uuid default null
) returns uuid language plpgsql security invoker set search_path = public as $$
declare
  new_id uuid;
begin
  if p_request_id is not null then
    select id into new_id from public.expenses
     where user_id = auth.uid() and client_request_id = p_request_id;
    if found then return new_id; end if;
  end if;
  insert into public.expenses (
    trip_id, user_id, client_request_id, category_id, amount, currency, exchange_rate,
    converted_amount, description, expense_date, merchant, location, notes,
    paid_by, split_method, rate_source, rate_date)
  values (
    p_trip_id, auth.uid(), p_request_id, (p_expense->>'category_id')::uuid,
    (p_expense->>'amount')::numeric, p_expense->>'currency',
    (p_expense->>'exchange_rate')::numeric, 0, -- converted_amount: derived (0010)
    p_expense->>'description', (p_expense->>'expense_date')::date,
    p_expense->>'merchant', p_expense->>'location', p_expense->>'notes',
    coalesce((p_expense->>'paid_by')::uuid, auth.uid()),
    coalesce(p_expense->>'split_method', 'equal'),
    coalesce(p_expense->>'rate_source', 'manual'),
    coalesce((p_expense->>'rate_date')::date, current_date))
  returning id into new_id;
  insert into public.expense_splits (expense_id, user_id, share_amount, share_percent)
  select new_id, (s->>'user_id')::uuid, (s->>'share_amount')::numeric,
         (s->>'share_percent')::numeric
  from jsonb_array_elements(p_splits) as s;
  return new_id;
end;
$$;

create or replace function public.update_expense(
  p_expense_id uuid, p_expense jsonb, p_splits jsonb default null
) returns void language plpgsql security invoker set search_path = public as $$
begin
  update public.expenses set
    category_id = (p_expense->>'category_id')::uuid,
    amount = (p_expense->>'amount')::numeric,
    currency = p_expense->>'currency',
    exchange_rate = (p_expense->>'exchange_rate')::numeric,
    description = p_expense->>'description',
    expense_date = (p_expense->>'expense_date')::date,
    merchant = p_expense->>'merchant',
    location = p_expense->>'location',
    notes = p_expense->>'notes',
    paid_by = coalesce((p_expense->>'paid_by')::uuid, paid_by),
    split_method = coalesce(p_expense->>'split_method', split_method),
    rate_source = coalesce(p_expense->>'rate_source', rate_source),
    rate_date = coalesce((p_expense->>'rate_date')::date, rate_date)
  where id = p_expense_id;
  if not found then
    raise exception 'expense not found or not permitted' using errcode = '42501';
  end if;
  if p_splits is not null then
    delete from public.expense_splits where expense_id = p_expense_id;
    insert into public.expense_splits (expense_id, user_id, share_amount, share_percent)
    select p_expense_id, (s->>'user_id')::uuid, (s->>'share_amount')::numeric,
           (s->>'share_percent')::numeric
    from jsonb_array_elements(p_splits) as s;
  end if;
end;
$$;

commit;
