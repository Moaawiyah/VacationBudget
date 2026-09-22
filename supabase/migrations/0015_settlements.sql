-- ============================================================================
-- 0015_settlements.sql — recording that someone actually paid someone back.
-- Run in the Supabase SQL Editor after 0014_expense_split_access.sql.
--
-- A settlement is its own domain model, not an expense: it doesn't affect
-- what anything cost, only who has since squared up. "Suggested" transfers
-- (lib/finance/settlement.ts) are computed live from balances and never
-- stored — only a transfer someone actually marks paid becomes a row here.
-- ============================================================================
begin;

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  from_user_id uuid not null references public.profiles (id), -- who paid
  to_user_id uuid not null references public.profiles (id),   -- who received it
  amount numeric(12, 2) not null check (amount > 0),
  note text,
  created_by uuid not null references public.profiles (id),
  client_request_id uuid,
  created_at timestamptz not null default now(),
  check (from_user_id <> to_user_id)
);
create index settlements_trip_id_idx on public.settlements (trip_id);
create index settlements_from_user_id_idx on public.settlements (from_user_id);
create index settlements_to_user_id_idx on public.settlements (to_user_id);
-- Mirrors 0011's expense idempotency key: a repeated "Mark Paid" tap must
-- not record the same transfer twice.
create unique index settlements_request_id_idx
  on public.settlements (created_by, client_request_id) where client_request_id is not null;

create or replace function private.require_settlement_participants()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not private.is_trip_participant(new.trip_id, new.from_user_id)
     or not private.is_trip_participant(new.trip_id, new.to_user_id) then
    raise exception 'both parties to a settlement must be trip participants' using errcode = 'VB006';
  end if;
  return new;
end;
$$;
create trigger require_settlement_participants
  before insert on public.settlements
  for each row execute function private.require_settlement_participants();

alter table public.settlements enable row level security;

-- Owner records any transfer; anyone else only one where they're a party
-- (they paid, or they were paid) — mirrors expenses' author/payer rule.
create or replace function public.can_record_settlement(trip uuid, payer uuid, payee uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select private.is_trip_owner(trip, auth.uid())
    or (auth.uid() in (payer, payee) and private.is_trip_participant(trip, auth.uid()))
$$;
revoke all on function public.can_record_settlement(uuid, uuid, uuid) from public, anon;
grant execute on function public.can_record_settlement(uuid, uuid, uuid) to authenticated;

create policy "settlements_select_participant" on public.settlements for select
  using (public.is_trip_participant(trip_id, auth.uid()));
create policy "settlements_insert_authorized" on public.settlements for insert
  with check (public.can_record_settlement(trip_id, from_user_id, to_user_id) and created_by = auth.uid());
create policy "settlements_delete_authorized" on public.settlements for delete
  using (public.can_record_settlement(trip_id, from_user_id, to_user_id));

-- Idempotent creation, same pattern as create_expense (0014).
create or replace function public.record_settlement(
  p_trip_id uuid, p_from_user_id uuid, p_to_user_id uuid, p_amount numeric,
  p_note text default null, p_request_id uuid default null
) returns uuid language plpgsql security invoker set search_path = public as $$
declare
  new_id uuid;
begin
  if p_request_id is not null then
    select id into new_id from public.settlements
     where created_by = auth.uid() and client_request_id = p_request_id;
    if found then return new_id; end if;
  end if;
  insert into public.settlements
    (trip_id, from_user_id, to_user_id, amount, note, created_by, client_request_id)
  values (p_trip_id, p_from_user_id, p_to_user_id, p_amount, p_note, auth.uid(), p_request_id)
  returning id into new_id;
  return new_id;
end;
$$;
revoke all on function public.record_settlement(uuid, uuid, uuid, numeric, text, uuid) from public, anon;
grant execute on function public.record_settlement(uuid, uuid, uuid, numeric, text, uuid) to authenticated;

commit;
