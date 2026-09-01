-- OliTechs PMS/POS — Room Planner schema repair
-- Safe to run after any previous PMS migrations. It repairs installations
-- where 0012 was not applied or PostgREST has not refreshed the schema.

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

alter table public.room_types enable row level security;
alter table public.rate_plans enable row level security;

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

notify pgrst, 'reload schema';
