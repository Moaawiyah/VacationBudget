-- ============================================================================
-- 0006_expenses_update_policy_fix.sql
-- Run in the Supabase SQL Editor after 0005_planned_budgets.sql.
-- ============================================================================

-- expenses_update_own (0004_expenses.sql) only checked user_id, unlike the
-- insert policy, which also verifies trip_id belongs to the caller. That gap
-- meant an update could repoint an expense's trip_id at another trip the
-- same user owns without the ownership check insert enforces. Tighten update
-- to match insert.
drop policy if exists "expenses_update_own" on public.expenses;

create policy "expenses_update_own"
  on public.expenses for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.trips t
      where t.id = trip_id and t.user_id = auth.uid()
    )
  );
