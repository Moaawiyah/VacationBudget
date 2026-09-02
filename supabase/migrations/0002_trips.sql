-- ============================================================================
-- 0002_trips.sql
-- Run in the Supabase SQL Editor after 0001_profiles.sql.
-- ============================================================================

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  destination text not null,
  start_date date not null,
  end_date date not null,
  base_currency text not null check (base_currency ~ '^[A-Z]{3}$'),
  total_budget numeric(12, 2) not null check (total_budget >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_dates_valid check (end_date >= start_date)
);

create index trips_user_id_idx on public.trips (user_id);
create index trips_user_id_start_date_idx on public.trips (user_id, start_date);

alter table public.trips enable row level security;

-- A user may only see, create, edit, or delete their own trips.
-- "with check" on insert/update enforces that user_id can never be someone
-- else's id, even if a client tried to send a different one — the database
-- rejects it regardless of what the app code does.
create policy "trips_select_own"
  on public.trips for select
  using (auth.uid() = user_id);

create policy "trips_insert_own"
  on public.trips for insert
  with check (auth.uid() = user_id);

create policy "trips_update_own"
  on public.trips for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "trips_delete_own"
  on public.trips for delete
  using (auth.uid() = user_id);

create trigger set_trips_updated_at
  before update on public.trips
  for each row
  execute function public.set_updated_at();
