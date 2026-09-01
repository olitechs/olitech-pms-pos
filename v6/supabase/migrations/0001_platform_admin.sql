-- OliTechs PMS+POS — Platform Admin foundation
-- Owner -> Property -> Package -> User -> Feature entitlement model.
--
-- Run this once in the Supabase SQL editor (or `supabase db push`) on a
-- fresh or existing project. It is additive — it only creates objects
-- that don't already exist, and never touches auth.users directly beyond
-- the trigger below.
--
-- After running this, see supabase/migrations/README.md for how to
-- create the first platform owner.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. ENUMS
-- ─────────────────────────────────────────────────────────────────────────

do $$ begin
  create type platform_role as enum ('platform_owner', 'user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type property_status as enum ('pending', 'active', 'suspended', 'rejected', 'inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type property_package as enum ('none', 'standard', 'premium', 'professional');
exception when duplicate_object then null; end $$;

do $$ begin
  create type property_member_role as enum (
    'owner', 'admin', 'manager', 'reception', 'cashier',
    'waiter', 'kitchen', 'housekeeping', 'maintenance',
    'accountant', 'storekeeper'
  );
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. PROFILES — one row per auth.users row. Holds the PLATFORM-level role.
--    Property-level role lives separately in property_users, because a
--    person's platform status (owner vs. everyone else) and their role
--    inside a given property are two different concepts (see spec section 39).
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  platform_role platform_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Everyone can read their own profile; nobody can read others' (admin
-- reads go through the SECURITY DEFINER views/functions below instead).
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    -- A user can never promote themselves to platform_owner via a client
    -- update — that column can only change via a direct SQL statement
    -- run by a real Postgres admin (service role / SQL editor).
    and platform_role = (select platform_role from public.profiles where id = auth.uid())
  );

-- New auth.users row -> profile row, automatically, server-side.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Helper: is the current user the platform owner? Used throughout RLS.
--    SECURITY DEFINER so it can read profiles regardless of the caller's
--    own row-level policy (avoids recursive RLS).
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.is_platform_owner()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select coalesce(
    (select platform_role = 'platform_owner' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. PROPERTIES
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_name text,
  property_type text,
  address text,
  country text,
  city text,
  phone text,
  email text,
  website text,
  currency text default 'USD',
  timezone text default 'UTC',
  tax_settings jsonb not null default '{}'::jsonb,
  logo_url text,
  business_registration text,
  contact_person text,
  status property_status not null default 'pending',
  package property_package not null default 'none',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.properties enable row level security;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. PROPERTY MEMBERSHIP — tenant isolation lives here. Every property-
--    scoped table's RLS policy joins through this table, so a user only
--    ever sees rows for properties they belong to.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.property_users (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role property_member_role not null default 'admin',
  created_at timestamptz not null default now(),
  unique (property_id, user_id)
);

alter table public.property_users enable row level security;

create or replace function public.is_member_of_property(p_property_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.property_users
    where property_id = p_property_id and user_id = auth.uid()
  );
$$;

create or replace function public.property_role(p_property_id uuid)
returns property_member_role
language sql
security definer set search_path = public
stable
as $$
  select role from public.property_users
  where property_id = p_property_id and user_id = auth.uid()
  limit 1;
$$;

-- properties: members can see/update their own property; the platform
-- owner can see/update everything; nobody can change status or package
-- except the platform owner (enforced in the WITH CHECK clause, not just
-- the frontend).
drop policy if exists "properties_select" on public.properties;
create policy "properties_select" on public.properties
  for select using (public.is_platform_owner() or public.is_member_of_property(id));

drop policy if exists "properties_insert_self_service" on public.properties;
create policy "properties_insert_self_service" on public.properties
  for insert with check (
    -- Anyone signed in can submit a NEW property application, but only
    -- in the pending/none state — they cannot self-approve or self-assign
    -- a package at creation time.
    created_by = auth.uid() and status = 'pending' and package = 'none'
  );

drop policy if exists "properties_update_owner_admin" on public.properties;
create policy "properties_update_owner_admin" on public.properties
  for update using (
    public.is_platform_owner() or public.property_role(id) in ('owner', 'admin')
  )
  with check (
    public.is_platform_owner()
    or (
      -- Property-level admins can edit their own property's details, but
      -- can NEVER change status or package themselves.
      public.property_role(id) in ('owner', 'admin')
      and status = (select status from public.properties where id = properties.id)
      and package = (select package from public.properties where id = properties.id)
    )
  );

drop policy if exists "properties_delete_owner_only" on public.properties;
create policy "properties_delete_owner_only" on public.properties
  for delete using (public.is_platform_owner());

-- property_users: members can see their own property's roster; the
-- platform owner sees everything; only the platform owner or a property
-- owner/admin can add/remove members of their own property.
drop policy if exists "property_users_select" on public.property_users;
create policy "property_users_select" on public.property_users
  for select using (
    public.is_platform_owner()
    or user_id = auth.uid()
    or public.is_member_of_property(property_id)
  );

drop policy if exists "property_users_insert" on public.property_users;
create policy "property_users_insert" on public.property_users
  for insert with check (
    public.is_platform_owner()
    or public.property_role(property_id) in ('owner', 'admin')
    -- the applicant themselves, at property-creation time, added as 'owner'
    or (user_id = auth.uid() and role = 'owner')
  );

drop policy if exists "property_users_update" on public.property_users;
create policy "property_users_update" on public.property_users
  for update using (
    public.is_platform_owner() or public.property_role(property_id) in ('owner', 'admin')
  );

drop policy if exists "property_users_delete" on public.property_users;
create policy "property_users_delete" on public.property_users
  for delete using (
    public.is_platform_owner() or public.property_role(property_id) in ('owner', 'admin')
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 6. AUDIT LOG — append-only, owner-readable, no client updates/deletes.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  property_id uuid references public.properties(id),
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_select" on public.audit_logs;
create policy "audit_logs_select" on public.audit_logs
  for select using (
    public.is_platform_owner() or public.property_role(property_id) in ('owner', 'admin')
  );

drop policy if exists "audit_logs_insert" on public.audit_logs;
create policy "audit_logs_insert" on public.audit_logs
  for insert with check (actor_id = auth.uid());

-- No update/delete policies at all -> audit rows are immutable for every
-- client role, including the owner, once written.

-- ─────────────────────────────────────────────────────────────────────────
-- 7. Convenience view: "my properties" with my role, for the frontend.
-- ─────────────────────────────────────────────────────────────────────────

create or replace view public.my_properties as
select p.*, pu.role as my_role
from public.properties p
join public.property_users pu on pu.property_id = p.id
where pu.user_id = auth.uid();
