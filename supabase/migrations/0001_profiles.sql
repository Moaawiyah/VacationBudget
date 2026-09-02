-- ============================================================================
-- 0001_profiles.sql
-- Run this in the Supabase SQL Editor (or via `supabase db push` if you use
-- the CLI) once your project exists. See README.md for exact steps.
-- ============================================================================

-- Shared trigger function: keeps `updated_at` current on every UPDATE.
-- Reused by every table going forward (trips, expenses, ...).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- profiles: one row per authenticated user, mirroring auth.users.
-- auth.users is managed by Supabase Auth and isn't directly usable in RLS
-- policies on app tables, so app tables reference public.profiles(id) instead.
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A user may only ever see or edit their own profile row.
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- No insert/delete policy for regular users on purpose: rows are created by
-- the trigger below (as the postgres role) and deleted via the
-- "on delete cascade" from auth.users, never directly by the client.

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Auto-create a profile row whenever a new user signs up via Supabase Auth.
-- security definer lets this trigger insert into public.profiles even though
-- the signing-up user has no insert policy on that table.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
