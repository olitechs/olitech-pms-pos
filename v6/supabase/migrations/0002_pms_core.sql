-- OliTechs PMS+POS — Phase 2: core PMS data (rooms, reservations, guests, folio)
--
-- Builds on 0001_platform_admin.sql (properties, property_users,
-- is_member_of_property()). Run this in the SQL editor after 0001.
--
-- KNOWN SIMPLIFICATION (documented, not hidden): every property member can
-- read/write these tables for their own property regardless of their
-- property_member_role. Section 38 of the spec asks for finer per-role
-- permissions (e.g. only reception+ can check guests in). That's a
-- follow-up pass — flagging it explicitly rather than pretending it's
-- done. Tenant isolation (the part that actually protects one hotel's
-- data from another) IS fully enforced below.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. TABLES
-- ─────────────────────────────────────────────────────────────────────────

do $$ begin
  create type room_status as enum (
    'available', 'occupied', 'booked', 'dirty', 'cleaning',
    'maintenance', 'out_of_service', 'blocked'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type reservation_status as enum ('booked', 'checked-in', 'checked-out', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  nationality text,
  id_number text,
  address text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists guests_property_idx on public.guests(property_id);
create index if not exists guests_phone_idx on public.guests(property_id, phone);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  number int not null,
  floor int,
  room_type text,
  capacity int default 2,
  beds text,
  amenities jsonb not null default '[]'::jsonb,
  base_rate numeric(12,2) default 0,
  status room_status not null default 'available',
  created_at timestamptz not null default now(),
  unique (property_id, number)
);
create index if not exists rooms_property_idx on public.rooms(property_id);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  guest_id uuid references public.guests(id),
  guest_name text not null,
  phone text,
  arrival date not null,
  departure date not null,
  party_size int default 1,
  rate numeric(12,2) default 0,
  status reservation_status not null default 'booked',
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists reservations_property_idx on public.reservations(property_id);
create index if not exists reservations_room_idx on public.reservations(room_id);
create index if not exists reservations_status_idx on public.reservations(room_id, status);

-- Folio: every charge/payment against a stay. `source` distinguishes room
-- charges from POS charges (the POS↔PMS "charge to room" integration in
-- Phase 3 inserts rows here with source='pos').
create table if not exists public.folio_charges (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  source text not null default 'room' check (source in ('room', 'pos', 'other')),
  description text not null,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);
create index if not exists folio_charges_reservation_idx on public.folio_charges(reservation_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  amount numeric(12,2) not null,
  method text not null default 'cash',
  created_at timestamptz not null default now()
);
create index if not exists payments_reservation_idx on public.payments(reservation_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. RLS — every table scoped to property membership.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.guests enable row level security;
alter table public.rooms enable row level security;
alter table public.reservations enable row level security;
alter table public.folio_charges enable row level security;
alter table public.payments enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['guests', 'rooms', 'reservations', 'folio_charges', 'payments']
  loop
    execute format('drop policy if exists "%1$s_select" on public.%1$s', t);
    execute format(
      'create policy "%1$s_select" on public.%1$s for select using (public.is_platform_owner() or public.is_member_of_property(property_id))',
      t
    );
    execute format('drop policy if exists "%1$s_insert" on public.%1$s', t);
    execute format(
      'create policy "%1$s_insert" on public.%1$s for insert with check (public.is_platform_owner() or public.is_member_of_property(property_id))',
      t
    );
    execute format('drop policy if exists "%1$s_update" on public.%1$s', t);
    execute format(
      'create policy "%1$s_update" on public.%1$s for update using (public.is_platform_owner() or public.is_member_of_property(property_id))',
      t
    );
    execute format('drop policy if exists "%1$s_delete" on public.%1$s', t);
    execute format(
      'create policy "%1$s_delete" on public.%1$s for delete using (public.is_platform_owner() or public.is_member_of_property(property_id))',
      t
    );
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Transactional operations. Each function body runs as a single
--    Postgres transaction (spec section 26/27: "use database transactions
--    where necessary"), and executes as the calling user (SECURITY
--    INVOKER, the default) so RLS still applies inside — nobody can call
--    these to touch a property they're not a member of.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.fn_upsert_guest(
  p_property_id uuid, p_name text, p_phone text
) returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  if p_phone is not null and p_phone <> '' then
    select id into v_id from public.guests
      where property_id = p_property_id and phone = p_phone
      limit 1;
  end if;
  if v_id is null then
    insert into public.guests (property_id, name, phone)
      values (p_property_id, p_name, nullif(p_phone, ''))
      returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- Book a room for a future stay (spec section 25).
create or replace function public.fn_add_reservation(
  p_property_id uuid, p_room_id uuid, p_guest_name text, p_phone text,
  p_arrival date, p_departure date, p_party_size int, p_rate numeric
) returns public.reservations
language plpgsql
as $$
declare
  v_guest_id uuid;
  v_res public.reservations;
begin
  if exists (
    select 1 from public.rooms where id = p_room_id and property_id = p_property_id and status <> 'available'
  ) then
    raise exception 'Room is not available for booking.';
  end if;

  v_guest_id := public.fn_upsert_guest(p_property_id, p_guest_name, p_phone);

  insert into public.reservations (property_id, room_id, guest_id, guest_name, phone, arrival, departure, party_size, rate, status)
    values (p_property_id, p_room_id, v_guest_id, p_guest_name, p_phone, p_arrival, p_departure, coalesce(p_party_size, 1), coalesce(p_rate, 0), 'booked')
    returning * into v_res;

  update public.rooms set status = 'booked' where id = p_room_id and property_id = p_property_id;

  return v_res;
end;
$$;

-- Check in an existing booking (spec section 26).
create or replace function public.fn_check_in_reservation(p_reservation_id uuid)
returns public.reservations
language plpgsql
as $$
declare
  v_res public.reservations;
begin
  update public.reservations set status = 'checked-in'
    where id = p_reservation_id and status = 'booked'
    returning * into v_res;

  if v_res.id is null then
    raise exception 'Reservation not found or not in a bookable state.';
  end if;

  update public.rooms set status = 'occupied' where id = v_res.room_id;

  -- Opening room charge on the folio for the length of stay.
  insert into public.folio_charges (property_id, reservation_id, source, description, amount)
    values (v_res.property_id, v_res.id, 'room', 'Room charge', v_res.rate * greatest(1, (v_res.departure - v_res.arrival)));

  return v_res;
end;
$$;

-- Walk-in guest, no prior reservation (spec section 25/26 combined for the
-- common front-desk case).
create or replace function public.fn_walk_in_check_in(
  p_property_id uuid, p_room_id uuid, p_guest_name text, p_phone text,
  p_check_in date, p_check_out date, p_party_size int, p_rate numeric
) returns public.reservations
language plpgsql
as $$
declare
  v_guest_id uuid;
  v_res public.reservations;
begin
  if exists (
    select 1 from public.rooms where id = p_room_id and property_id = p_property_id and status <> 'available'
  ) then
    raise exception 'Room is not available.';
  end if;

  v_guest_id := public.fn_upsert_guest(p_property_id, p_guest_name, p_phone);

  insert into public.reservations (property_id, room_id, guest_id, guest_name, phone, arrival, departure, party_size, rate, status)
    values (p_property_id, p_room_id, v_guest_id, p_guest_name, p_phone, p_check_in, p_check_out, coalesce(p_party_size, 1), coalesce(p_rate, 0), 'checked-in')
    returning * into v_res;

  update public.rooms set status = 'occupied' where id = p_room_id;

  insert into public.folio_charges (property_id, reservation_id, source, description, amount)
    values (v_res.property_id, v_res.id, 'room', 'Room charge', v_res.rate * greatest(1, (v_res.departure - v_res.arrival)));

  return v_res;
end;
$$;

-- Check-out (spec section 27). NOTE: per the spec's default workflow this
-- should leave the room 'dirty' for housekeeping to clear — but the
-- current Rooms.jsx grid only styles available/booked/occupied, so
-- flipping straight to 'dirty' would render as an unstyled/blank tile
-- today. Room goes to 'dirty' in the data model (so the upcoming
-- Housekeeping module has something real to work with); Phase 3 adds the
-- housekeeping board UI and the "dirty" tile style at the same time.
create or replace function public.fn_check_out_room(p_room_id uuid)
returns void
language plpgsql
as $$
declare
  v_res_id uuid;
begin
  select id into v_res_id from public.reservations
    where room_id = p_room_id and status = 'checked-in'
    order by created_at desc limit 1;

  if v_res_id is not null then
    update public.reservations set status = 'checked-out' where id = v_res_id;
  end if;

  update public.rooms set status = 'dirty' where id = p_room_id;
end;
$$;

-- Cancel/remove a still-pending booking (spec section 25).
create or replace function public.fn_remove_reservation(p_reservation_id uuid)
returns void
language plpgsql
as $$
declare
  v_room_id uuid;
begin
  select room_id into v_room_id from public.reservations where id = p_reservation_id;

  update public.reservations set status = 'cancelled' where id = p_reservation_id and status = 'booked';

  -- Only free the room if it's not holding a different active booking.
  if v_room_id is not null and not exists (
    select 1 from public.reservations where room_id = v_room_id and status in ('booked', 'checked-in')
  ) then
    update public.rooms set status = 'available' where id = v_room_id;
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Folio total, computed on demand rather than stored (spec section 29).
-- ─────────────────────────────────────────────────────────────────────────

create or replace view public.folio_totals as
select
  r.id as reservation_id,
  r.property_id,
  coalesce(sum(fc.amount), 0) as subtotal,
  coalesce((select sum(p.amount) from public.payments p where p.reservation_id = r.id), 0) as paid,
  coalesce(sum(fc.amount), 0) - coalesce((select sum(p.amount) from public.payments p where p.reservation_id = r.id), 0) as balance
from public.reservations r
left join public.folio_charges fc on fc.reservation_id = r.id
group by r.id, r.property_id;

alter view public.folio_totals set (security_invoker = true);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Guest directory summary (spec section 28) — computed, not stored, so
--    visit counts/spend can never drift from the underlying reservations
--    and payments.
-- ─────────────────────────────────────────────────────────────────────────

create or replace view public.guest_summary as
select
  g.id,
  g.property_id,
  g.name,
  g.email,
  g.phone,
  g.nationality as country,
  count(distinct r.id) filter (where r.status in ('checked-in', 'checked-out')) as visits,
  max(r.departure) filter (where r.status = 'checked-out') as last_visit,
  coalesce(sum(p.amount), 0) as total_spend
from public.guests g
left join public.reservations r on r.guest_id = g.id
left join public.payments p on p.reservation_id = r.id
group by g.id;

alter view public.guest_summary set (security_invoker = true);

