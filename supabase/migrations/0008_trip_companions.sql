-- Shared trips, invitation state, and participant-aware access control.
begin;

create table public.trip_members (
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  invited_by uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (trip_id, user_id),
  check (user_id <> invited_by)
);

create index trip_members_user_status_idx on public.trip_members (user_id, status);

create or replace function public.is_trip_owner(target_trip_id uuid, target_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.trips where id = target_trip_id and user_id = target_user_id) $$;

create or replace function public.is_trip_participant(target_trip_id uuid, target_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select public.is_trip_owner(target_trip_id, target_user_id)
    or exists(select 1 from public.trip_members where trip_id = target_trip_id and user_id = target_user_id and status = 'accepted')
$$;

revoke all on function public.is_trip_owner(uuid, uuid) from public, anon;
revoke all on function public.is_trip_participant(uuid, uuid) from public, anon;
grant execute on function public.is_trip_owner(uuid, uuid) to authenticated;
grant execute on function public.is_trip_participant(uuid, uuid) to authenticated;

alter table public.trip_members enable row level security;
create policy "trip_members_select_relevant" on public.trip_members for select
  using (user_id = auth.uid() or public.is_trip_owner(trip_id, auth.uid()));
create policy "trip_members_insert_owner" on public.trip_members for insert
  with check (public.is_trip_owner(trip_id, auth.uid()) and invited_by = auth.uid());
create policy "trip_members_update_invitee" on public.trip_members for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "trip_members_delete_relevant" on public.trip_members for delete
  using (user_id = auth.uid() or public.is_trip_owner(trip_id, auth.uid()));

drop policy if exists "trips_select_own" on public.trips;
create policy "trips_select_participant" on public.trips for select
  using (public.is_trip_participant(id, auth.uid()));

drop policy if exists "expenses_select_own" on public.expenses;
create policy "expenses_select_participant" on public.expenses for select
  using (public.is_trip_participant(trip_id, auth.uid()));
drop policy if exists "expenses_insert_own" on public.expenses;
create policy "expenses_insert_participant" on public.expenses for insert
  with check (auth.uid() = user_id and public.is_trip_participant(trip_id, auth.uid()));
drop policy if exists "expenses_update_own" on public.expenses;
create policy "expenses_update_own_in_trip" on public.expenses for update
  using (public.is_trip_participant(trip_id, auth.uid()))
  with check (public.is_trip_participant(trip_id, auth.uid()));
drop policy if exists "expenses_delete_own" on public.expenses;
create policy "expenses_delete_own_in_trip" on public.expenses for delete
  using (public.is_trip_participant(trip_id, auth.uid()));

drop policy if exists "planned_budgets_select_own" on public.planned_budgets;
create policy "planned_budgets_select_participant" on public.planned_budgets for select
  using (public.is_trip_participant(trip_id, auth.uid()));
drop policy if exists "planned_budgets_insert_own" on public.planned_budgets;
create policy "planned_budgets_insert_participant" on public.planned_budgets for insert
  with check (public.is_trip_participant(trip_id, auth.uid()));
drop policy if exists "planned_budgets_update_own" on public.planned_budgets;
create policy "planned_budgets_update_participant" on public.planned_budgets for update
  using (public.is_trip_participant(trip_id, auth.uid()))
  with check (public.is_trip_participant(trip_id, auth.uid()));
drop policy if exists "planned_budgets_delete_own" on public.planned_budgets;
create policy "planned_budgets_delete_participant" on public.planned_budgets for delete
  using (public.is_trip_participant(trip_id, auth.uid()));

drop policy if exists "categories_select_visible" on public.categories;
create policy "categories_select_visible" on public.categories for select using (
  user_id is null or auth.uid() = user_id or exists (
    select 1 from public.expenses e
    where e.category_id = categories.id and public.is_trip_participant(e.trip_id, auth.uid())
  )
);

commit;
