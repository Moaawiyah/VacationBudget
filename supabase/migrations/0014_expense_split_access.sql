-- ============================================================================
-- 0014_expense_split_access.sql — who may see and change splits.
-- Run in the Supabase SQL Editor after 0013_expense_splits.sql.
--
-- An expense (and its split) may be changed by the trip owner, or by its
-- author or payer while they're a participant. Everyone in the trip can read
-- splits; nobody outside it can. Writes go through create_expense /
-- update_expense: one call = one transaction, so an expense and its shares
-- land together (the web client can't run multi-statement transactions).
-- ============================================================================
begin;

-- Answers only about the caller (auth.uid()), so it's no oracle about others.
create or replace function public.can_modify_expense_row(trip uuid, author uuid, payer uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select private.is_trip_owner(trip, auth.uid())
    or (auth.uid() in (author, payer) and private.is_trip_participant(trip, auth.uid()))
$$;

create or replace function public.can_modify_expense(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.expenses e where e.id = target
                 and public.can_modify_expense_row(e.trip_id, e.user_id, e.paid_by))
$$;

revoke all on function public.can_modify_expense_row(uuid, uuid, uuid) from public, anon;
revoke all on function public.can_modify_expense(uuid) from public, anon;
grant execute on function public.can_modify_expense_row(uuid, uuid, uuid) to authenticated;
grant execute on function public.can_modify_expense(uuid) to authenticated;

-- Expenses: the payer joins author and owner as someone who may edit/delete.
drop policy if exists "expenses_update_author_or_owner" on public.expenses;
create policy "expenses_update_author_payer_or_owner" on public.expenses for update
  using (public.can_modify_expense_row(trip_id, user_id, paid_by))
  with check (public.can_modify_expense_row(trip_id, user_id, paid_by)
              and public.can_use_category(category_id, trip_id, user_id));
drop policy if exists "expenses_delete_author_or_owner" on public.expenses;
create policy "expenses_delete_author_payer_or_owner" on public.expenses for delete
  using (public.can_modify_expense_row(trip_id, user_id, paid_by));

-- Splits: visible exactly when the expense is (the subquery runs under the
-- caller's own expenses RLS); writable by whoever may modify the expense.
alter table public.expense_splits enable row level security;
create policy "expense_splits_select_visible" on public.expense_splits for select
  using (exists (select 1 from public.expenses e where e.id = expense_id));
create policy "expense_splits_insert_modifier" on public.expense_splits for insert
  with check (public.can_modify_expense(expense_id));
create policy "expense_splits_update_modifier" on public.expense_splits for update
  using (public.can_modify_expense(expense_id))
  with check (public.can_modify_expense(expense_id));
create policy "expense_splits_delete_modifier" on public.expense_splits for delete
  using (public.can_modify_expense(expense_id));

-- Creates an expense and its shares atomically. Idempotent: a repeated
-- p_request_id returns the expense that request already created.
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
    paid_by, split_method)
  values (
    p_trip_id, auth.uid(), p_request_id, (p_expense->>'category_id')::uuid,
    (p_expense->>'amount')::numeric, p_expense->>'currency',
    (p_expense->>'exchange_rate')::numeric, 0, -- converted_amount: derived (0010)
    p_expense->>'description', (p_expense->>'expense_date')::date,
    p_expense->>'merchant', p_expense->>'location', p_expense->>'notes',
    coalesce((p_expense->>'paid_by')::uuid, auth.uid()),
    coalesce(p_expense->>'split_method', 'equal'))
  returning id into new_id;
  insert into public.expense_splits (expense_id, user_id, share_amount, share_percent)
  select new_id, (s->>'user_id')::uuid, (s->>'share_amount')::numeric,
         (s->>'share_percent')::numeric
  from jsonb_array_elements(p_splits) as s;
  return new_id;
end;
$$;

-- Updates an expense; replaces its shares only when p_splits is given, so an
-- edit that doesn't touch the split leaves historical shares untouched.
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
    split_method = coalesce(p_expense->>'split_method', split_method)
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

revoke all on function public.create_expense(uuid, jsonb, jsonb, uuid) from public, anon;
revoke all on function public.update_expense(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.create_expense(uuid, jsonb, jsonb, uuid) to authenticated;
grant execute on function public.update_expense(uuid, jsonb, jsonb) to authenticated;

commit;
