-- ============================================================================
-- 0009_authorization_hardening.sql
-- Run in the Supabase SQL Editor after 0008_trip_companions.sql.
--
-- Closes authorization gaps in the trip-sharing model. Roles:
--   OWNER  (trips.user_id)            manage trip, members, budgets, any expense
--   MEMBER (accepted trip_members row) view trip, create expenses, edit/delete
--                                      only their own expenses
-- ============================================================================
begin;

-- ---------------------------------------------------------------------------
-- Participation helpers. The 0008 versions answered "is user X in trip Y?"
-- for any X, callable by any signed-in user — a membership-enumeration
-- oracle. The unrestricted versions now live in a schema `authenticated`
-- can't reach; the public ones keep their signature (policies call them with
-- auth.uid()) but refuse to answer about anyone other than the caller.
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;

create or replace function private.is_trip_owner(target_trip_id uuid, target_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.trips where id = target_trip_id and user_id = target_user_id) $$;

create or replace function private.is_trip_participant(target_trip_id uuid, target_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select private.is_trip_owner(target_trip_id, target_user_id)
    or exists(select 1 from public.trip_members where trip_id = target_trip_id
              and user_id = target_user_id and status = 'accepted')
$$;

create or replace function public.is_trip_owner(target_trip_id uuid, target_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select target_user_id = auth.uid() and private.is_trip_owner(target_trip_id, target_user_id) $$;

create or replace function public.is_trip_participant(target_trip_id uuid, target_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select target_user_id = auth.uid() and private.is_trip_participant(target_trip_id, target_user_id) $$;

-- A category may be attached to a trip's rows only if it's a system category,
-- the caller's own, the row author's own, or the trip owner's — never a
-- stranger's private category (which also used to make that stranger's
-- account undeletable: expenses.category_id restricts category deletes).
create or replace function public.can_use_category(
  target_category_id uuid, target_trip_id uuid, author_id uuid
) returns boolean language sql stable security definer set search_path = public
as $$
  select private.is_trip_participant(target_trip_id, auth.uid()) and exists (
    select 1 from public.categories c
    where c.id = target_category_id
      and (c.user_id is null or c.user_id = auth.uid() or c.user_id = author_id
           or private.is_trip_owner(target_trip_id, c.user_id))
  )
$$;
revoke all on function public.can_use_category(uuid, uuid, uuid) from public, anon;
grant execute on function public.can_use_category(uuid, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Expenses: members edit/delete only their own; the trip owner, any.
-- (0008's "*_own_in_trip" policies checked participation only.)
-- ---------------------------------------------------------------------------
drop policy if exists "expenses_insert_participant" on public.expenses;
create policy "expenses_insert_participant" on public.expenses for insert
  with check (
    auth.uid() = user_id
    and public.is_trip_participant(trip_id, auth.uid())
    and public.can_use_category(category_id, trip_id, user_id)
  );

drop policy if exists "expenses_update_own_in_trip" on public.expenses;
create policy "expenses_update_author_or_owner" on public.expenses for update
  using (
    public.is_trip_owner(trip_id, auth.uid())
    or (user_id = auth.uid() and public.is_trip_participant(trip_id, auth.uid()))
  )
  with check (
    (public.is_trip_owner(trip_id, auth.uid())
     or (user_id = auth.uid() and public.is_trip_participant(trip_id, auth.uid())))
    and public.can_use_category(category_id, trip_id, user_id)
  );

drop policy if exists "expenses_delete_own_in_trip" on public.expenses;
create policy "expenses_delete_author_or_owner" on public.expenses for delete
  using (
    public.is_trip_owner(trip_id, auth.uid())
    or (user_id = auth.uid() and public.is_trip_participant(trip_id, auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- Planned budgets: members may read; only the owner may write.
-- ---------------------------------------------------------------------------
drop policy if exists "planned_budgets_insert_participant" on public.planned_budgets;
create policy "planned_budgets_insert_owner" on public.planned_budgets for insert
  with check (public.is_trip_owner(trip_id, auth.uid())
              and public.can_use_category(category_id, trip_id, auth.uid()));
drop policy if exists "planned_budgets_update_participant" on public.planned_budgets;
create policy "planned_budgets_update_owner" on public.planned_budgets for update
  using (public.is_trip_owner(trip_id, auth.uid()))
  with check (public.is_trip_owner(trip_id, auth.uid())
              and public.can_use_category(category_id, trip_id, auth.uid()));
drop policy if exists "planned_budgets_delete_participant" on public.planned_budgets;
create policy "planned_budgets_delete_owner" on public.planned_budgets for delete
  using (public.is_trip_owner(trip_id, auth.uid()));

-- ---------------------------------------------------------------------------
-- Memberships. An invitee could previously UPDATE any column of their own
-- row — including trip_id — turning one invitation into access to any trip.
-- Now: owners may only create *pending* invitations (no forcing someone into
-- a trip), and an invitee may only flip their own pending row to accepted.
-- ---------------------------------------------------------------------------
drop policy if exists "trip_members_insert_owner" on public.trip_members;
create policy "trip_members_insert_owner" on public.trip_members for insert
  with check (public.is_trip_owner(trip_id, auth.uid())
              and invited_by = auth.uid() and status = 'pending');

drop policy if exists "trip_members_update_invitee" on public.trip_members;
create policy "trip_members_accept_own_invitation" on public.trip_members for update
  using (user_id = auth.uid() and status = 'pending')
  with check (user_id = auth.uid() and status = 'accepted');
revoke update on public.trip_members from anon, authenticated;
grant update (status, responded_at) on public.trip_members to authenticated;

-- ---------------------------------------------------------------------------
-- Profiles: email and username are identity keys (login-by-username,
-- "already registered" checks, invitations) — not user-editable directly.
-- ---------------------------------------------------------------------------
revoke update on public.profiles from anon, authenticated;
grant update (first_name, surname) on public.profiles to authenticated;

commit;
