-- ============================================================================
-- 0004_expenses.sql
-- Run in the Supabase SQL Editor after 0003_categories.sql.
-- ============================================================================

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- restrict (the default): a category can't be deleted while expenses still
  -- reference it, so historical expenses never lose their category silently.
  category_id uuid not null references public.categories (id),
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  -- amount converted into the trip's base_currency, using exchange_rate.
  -- Stored (not recomputed) so historical expenses stay accurate even if the
  -- rate is edited later. See lib/currency/convert.ts for the calculation.
  converted_amount numeric(12, 2) not null check (converted_amount >= 0),
  exchange_rate numeric(18, 8) not null check (exchange_rate > 0),
  description text not null,
  expense_date date not null,
  merchant text,
  location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expenses_trip_id_idx on public.expenses (trip_id);
create index expenses_trip_id_expense_date_idx on public.expenses (trip_id, expense_date desc);
create index expenses_user_id_idx on public.expenses (user_id);

alter table public.expenses enable row level security;

-- Ownership is scoped through user_id, exactly like trips. The insert policy
-- additionally checks that trip_id actually belongs to the same user — this
-- stops a client from attaching an expense to someone else's trip even
-- though the expense's own user_id would otherwise pass RLS.
create policy "expenses_select_own"
  on public.expenses for select
  using (auth.uid() = user_id);

create policy "expenses_insert_own"
  on public.expenses for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.trips t
      where t.id = trip_id and t.user_id = auth.uid()
    )
  );

create policy "expenses_update_own"
  on public.expenses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "expenses_delete_own"
  on public.expenses for delete
  using (auth.uid() = user_id);

create trigger set_expenses_updated_at
  before update on public.expenses
  for each row
  execute function public.set_updated_at();
