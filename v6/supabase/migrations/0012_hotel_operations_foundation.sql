-- OliTechs PMS/POS — Hotel operations foundation
-- Adds room types, rate plans, richer room/reservation metadata and housekeeping tasks.

create table if not exists public.room_types (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  view_type text,
  bed_configuration text,
  max_occupancy int not null default 2 check (max_occupancy > 0),
  size_sqm numeric(8,2),
  base_rate numeric(12,2) not null default 0,
  amenities jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(property_id, code),
  unique(property_id, name)
);
create index if not exists room_types_property_idx on public.room_types(property_id);

create table if not exists public.rate_plans (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  meal_plan text not null default 'room_only',
  cancellation_policy text,
  default_rate numeric(12,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(property_id, code),
  unique(property_id, name)
);
create index if not exists rate_plans_property_idx on public.rate_plans(property_id);

alter table public.rooms add column if not exists room_type_id uuid references public.room_types(id) on delete set null;
alter table public.rooms add column if not exists name text;
alter table public.rooms add column if not exists description text;
alter table public.rooms add column if not exists housekeeping_notes text;
alter table public.rooms add column if not exists active boolean not null default true;
create index if not exists rooms_room_type_idx on public.rooms(room_type_id);

alter table public.reservations add column if not exists confirmation_code text;
alter table public.reservations add column if not exists adults int not null default 1;
alter table public.reservations add column if not exists children int not null default 0;
alter table public.reservations add column if not exists source text not null default 'front_desk';
alter table public.reservations add column if not exists special_requests text;
alter table public.reservations add column if not exists deposit_amount numeric(12,2) not null default 0;
alter table public.reservations add column if not exists rate_plan_id uuid references public.rate_plans(id) on delete set null;
create unique index if not exists reservations_confirmation_idx on public.reservations(property_id, confirmation_code) where confirmation_code is not null;

create table if not exists public.housekeeping_tasks (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  task_type text not null default 'cleaning' check (task_type in ('cleaning','inspection','turndown','deep_clean','linen_change')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'pending' check (status in ('pending','assigned','in_progress','completed','cancelled')),
  assigned_to uuid references public.profiles(id) on delete set null,
  notes text,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists housekeeping_tasks_property_idx on public.housekeeping_tasks(property_id, status);
create index if not exists housekeeping_tasks_room_idx on public.housekeeping_tasks(room_id, status);

alter table public.room_types enable row level security;
alter table public.rate_plans enable row level security;
alter table public.housekeeping_tasks enable row level security;

do $$ begin
  drop policy if exists room_types_select on public.room_types;
  create policy room_types_select on public.room_types for select using (public.is_platform_owner() or public.is_member_of_property(property_id));
  drop policy if exists room_types_insert on public.room_types;
  create policy room_types_insert on public.room_types for insert with check (public.is_platform_owner() or public.is_member_of_property(property_id));
  drop policy if exists room_types_update on public.room_types;
  create policy room_types_update on public.room_types for update using (public.is_platform_owner() or public.is_member_of_property(property_id));
  drop policy if exists room_types_delete on public.room_types;
  create policy room_types_delete on public.room_types for delete using (public.is_platform_owner() or public.is_member_of_property(property_id));

  drop policy if exists rate_plans_select on public.rate_plans;
  create policy rate_plans_select on public.rate_plans for select using (public.is_platform_owner() or public.is_member_of_property(property_id));
  drop policy if exists rate_plans_insert on public.rate_plans;
  create policy rate_plans_insert on public.rate_plans for insert with check (public.is_platform_owner() or public.is_member_of_property(property_id));
  drop policy if exists rate_plans_update on public.rate_plans;
  create policy rate_plans_update on public.rate_plans for update using (public.is_platform_owner() or public.is_member_of_property(property_id));
  drop policy if exists rate_plans_delete on public.rate_plans;
  create policy rate_plans_delete on public.rate_plans for delete using (public.is_platform_owner() or public.is_member_of_property(property_id));

  drop policy if exists housekeeping_tasks_select on public.housekeeping_tasks;
  create policy housekeeping_tasks_select on public.housekeeping_tasks for select using (public.is_platform_owner() or public.is_member_of_property(property_id));
  drop policy if exists housekeeping_tasks_insert on public.housekeeping_tasks;
  create policy housekeeping_tasks_insert on public.housekeeping_tasks for insert with check (public.is_platform_owner() or public.is_member_of_property(property_id));
  drop policy if exists housekeeping_tasks_update on public.housekeeping_tasks;
  create policy housekeeping_tasks_update on public.housekeeping_tasks for update using (public.is_platform_owner() or public.is_member_of_property(property_id));
  drop policy if exists housekeeping_tasks_delete on public.housekeeping_tasks;
  create policy housekeeping_tasks_delete on public.housekeeping_tasks for delete using (public.is_platform_owner() or public.is_member_of_property(property_id));
end $$;

-- Update reservation creation to prevent overlapping stays, not just rooms
-- currently marked unavailable.
create or replace function public.fn_add_reservation(
  p_property_id uuid, p_room_id uuid, p_guest_name text, p_phone text,
  p_arrival date, p_departure date, p_party_size int, p_rate numeric
) returns public.reservations
language plpgsql
as $$
declare
  v_guest_id uuid;
  v_res public.reservations;
  v_code text;
begin
  if p_departure <= p_arrival then
    raise exception 'Departure must be after arrival.';
  end if;

  if not exists (select 1 from public.rooms where id = p_room_id and property_id = p_property_id and active = true) then
    raise exception 'Room not found or inactive.';
  end if;

  if exists (
    select 1 from public.reservations r
    where r.room_id = p_room_id
      and r.status in ('booked','checked-in')
      and daterange(r.arrival, r.departure, '[)') && daterange(p_arrival, p_departure, '[)')
  ) then
    raise exception 'Room is already reserved for part of those dates.';
  end if;

  v_guest_id := public.fn_upsert_guest(p_property_id, p_guest_name, p_phone);
  v_code := 'RES-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.reservations (property_id, room_id, guest_id, guest_name, phone, arrival, departure, party_size, adults, children, rate, confirmation_code, status)
    values (p_property_id, p_room_id, v_guest_id, p_guest_name, p_phone, p_arrival, p_departure,
            greatest(coalesce(p_party_size,1),1), greatest(coalesce(p_party_size,1),1), 0,
            coalesce(p_rate,0), v_code, 'booked')
    returning * into v_res;

  update public.rooms set status = 'booked' where id = p_room_id and property_id = p_property_id and status = 'available';
  return v_res;
end;
$$;

-- Create a sensible set of starter room types for existing properties only
-- when none exist. Owners can edit/remove these after migration.
do $$
declare
  p record;
begin
  for p in select id from public.properties where status = 'active' loop
    if not exists (select 1 from public.room_types where property_id = p.id) then
      insert into public.room_types (property_id, code, name, description, view_type, bed_configuration, max_occupancy, base_rate, amenities)
      values
        (p.id, 'STD-GV', 'Standard Garden View', 'Comfortable standard room with garden-facing outlook.', 'Garden View', '1 King Bed', 2, 0, '["Wi-Fi","TV","Air Conditioning","Hot Shower"]'::jsonb),
        (p.id, 'DBL-T2', 'Double Terrace', 'Spacious double room with private terrace.', 'Garden / Terrace', '2 Double Beds', 4, 0, '["Wi-Fi","TV","Air Conditioning","Terrace"]'::jsonb),
        (p.id, '2BR-APT', '2 Bedroom Apartment', 'Two-bedroom apartment suitable for families and long stays.', 'City / Garden', '1 King + 2 Single Beds', 5, 0, '["Wi-Fi","Kitchen","Living Room","Terrace"]'::jsonb);
    end if;
  end loop;
end $$;

-- Keep PostgREST aware of newly-created functions/tables immediately.
notify pgrst, 'reload schema';
