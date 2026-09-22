-- ============================================================================
-- 0011_expense_idempotency.sql
-- Run in the Supabase SQL Editor after 0010_financial_integrity.sql.
--
-- Each "create expense" intent carries a client-generated request id. A
-- repeat of the same intent — double tap, the automatic Server Action retry
-- next.config.ts enables after a dropped connection, a re-sent receipt
-- confirmation — hits this unique index instead of creating a second
-- expense, and the app treats that as "already saved".
-- ============================================================================
begin;

alter table public.expenses add column if not exists client_request_id uuid;

-- Per user: ids are client-generated, so scoping by user_id means one user's
-- id can never collide with (or be used to probe for) another user's expense.
create unique index if not exists expenses_client_request_unique
  on public.expenses (user_id, client_request_id)
  where client_request_id is not null;

commit;
