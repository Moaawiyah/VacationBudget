-- ============================================================================
-- 0003_categories.sql
-- Run in the Supabase SQL Editor after 0002_trips.sql.
-- ============================================================================

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  -- null user_id = a system default category, visible to everyone.
  -- non-null = a custom category, visible only to the user who made it.
  user_id uuid references public.profiles (id) on delete cascade,
  name text not null,
  icon text not null,
  created_at timestamptz not null default now()
);

create index categories_user_id_idx on public.categories (user_id);

alter table public.categories enable row level security;

-- Everyone can see the system categories (user_id is null) plus their own
-- custom ones. Nobody can see another user's custom categories.
create policy "categories_select_visible"
  on public.categories for select
  using (user_id is null or auth.uid() = user_id);

-- A user may only ever create a category owned by themselves — never a
-- system category (user_id null) and never one owned by someone else.
create policy "categories_insert_own"
  on public.categories for insert
  with check (auth.uid() = user_id);

create policy "categories_update_own"
  on public.categories for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "categories_delete_own"
  on public.categories for delete
  using (auth.uid() = user_id);

insert into public.categories (name, icon) values
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
  ('Other', 'more-horizontal');
