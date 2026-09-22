-- ============================================================================
-- 0012_integrity_followup.sql
-- Run in the Supabase SQL Editor after 0011_expense_idempotency.sql.
--
-- 1. VALIDATE the constraints 0010 added as NOT VALID. A read-only scan of
--    production (2026-09-22) found no violating rows, so each check can now
--    cover existing data too. If this fails, the error names the constraint;
--    fix those rows and re-run — nothing here is partially applied.
-- 2. Restore the system categories. Production had none: every expense needs
--    a category, so an empty table left new users unable to add expenses.
--    Idempotent — each category is inserted only if it's missing.
-- ============================================================================
begin;

alter table public.expenses validate constraint expenses_description_length;
alter table public.expenses validate constraint expenses_merchant_length;
alter table public.expenses validate constraint expenses_location_length;
alter table public.expenses validate constraint expenses_notes_length;
alter table public.categories validate constraint categories_name_length;

insert into public.categories (name, icon)
select seed.name, seed.icon
from (values
  ('Flights', 'plane'),
  ('Accommodation', 'hotel'),
  ('Car Rental', 'car'),
  ('Fuel', 'fuel'),
  ('Public Transport', 'bus'),
  ('Food', 'utensils-crossed'),
  ('Activities', 'ticket'),
  ('Shopping', 'shopping-bag'),
  ('Parking', 'parking-circle'),
  ('Tolls', 'route'),
  ('Insurance', 'shield-check'),
  ('Coffee', 'coffee'),
  ('Other', 'more-horizontal')
) as seed(name, icon)
where not exists (
  select 1 from public.categories c where c.user_id is null and c.name = seed.name
);

commit;
