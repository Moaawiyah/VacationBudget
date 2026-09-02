-- ============================================================================
-- 0005_planned_budgets.sql
-- Run in the Supabase SQL Editor after 0004_expenses.sql.
-- ============================================================================

create table public.planned_budgets (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  category_id uuid not null references public.categories (id),
  planned_amount numeric(12, 2) not null check (planned_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One planned figure per category per trip — editing re-saves this row
  -- rather than creating a duplicate (see the upsert in plan/actions.ts).
  unique (trip_id, category_id)
);

create index planned_budgets_trip_id_idx on public.planned_budgets (trip_id);

alter table public.planned_budgets enable row level security;

-- This table has no user_id of its own — ownership flows through trip_id,
-- so every policy checks that the trip belongs to the caller.
create policy "planned_budgets_select_own"
  on public.planned_budgets for select
  using (
    exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid())
  );

create policy "planned_budgets_insert_own"
  on public.planned_budgets for insert
  with check (
    exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid())
  );

create policy "planned_budgets_update_own"
  on public.planned_budgets for update
  using (
    exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid())
  );

create policy "planned_budgets_delete_own"
  on public.planned_budgets for delete
  using (
    exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid())
  );

create trigger set_planned_budgets_updated_at
  before update on public.planned_budgets
  for each row
  execute function public.set_updated_at();
