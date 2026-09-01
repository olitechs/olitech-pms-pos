-- OliTechs PMS+POS — single, idempotent repair for the complete
-- registration -> pending -> admin approval -> package -> active flow.
--
-- This migration is intentionally self-contained with respect to the
-- approval/application RPCs. It fixes deployments where 0009 was not
-- actually applied (which otherwise produces PostgREST's
-- "function ... was not found in the schema cache" error).

-- One self-service owner can have only one owner property.
create unique index if not exists property_users_one_owner_property_per_user
  on public.property_users (user_id)
  where role = 'owner';

-- -------------------------------------------------------------------------
-- Auth trigger: every new owner registration creates the application on the
-- server, even when Supabase requires email confirmation and no browser
-- session exists yet.
-- -------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_business_name text;
  v_property_id uuid;
begin
  v_full_name := nullif(trim(new.raw_user_meta_data->>'full_name'), '');
  v_business_name := nullif(trim(new.raw_user_meta_data->>'pending_business_name'), '');

  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, v_full_name)
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        updated_at = now();

  if coalesce((new.raw_user_meta_data->>'pending_owner_signup')::boolean, false)
     and not exists (
       select 1 from public.property_users pu
       where pu.user_id = new.id and pu.role = 'owner'
     ) then
    insert into public.properties
      (name, business_name, created_by, email, contact_person, status, package)
    values
      (coalesce(v_business_name, v_full_name || '''s Property', 'New Property'),
       v_business_name, new.id, new.email, v_full_name, 'pending', 'none')
    returning id into v_property_id;

    insert into public.property_users (property_id, user_id, role)
    values (v_property_id, new.id, 'owner');
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- -------------------------------------------------------------------------
-- Authenticated user's idempotent safety net. This also repairs older
-- accounts whose signup metadata was missing.
-- -------------------------------------------------------------------------
create or replace function public.ensure_my_pending_property(p_business_name text default null)
returns public.properties
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_property public.properties;
  v_full_name text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if public.is_platform_owner() then
    raise exception 'Platform owners do not have a self-service property.' using errcode = '42501';
  end if;

  select p.* into v_property
  from public.properties p
  join public.property_users pu on pu.property_id = p.id
  where pu.user_id = auth.uid() and pu.role = 'owner'
  limit 1;

  if found then
    return v_property;
  end if;

  select full_name into v_full_name
  from public.profiles
  where id = auth.uid();

  insert into public.properties (name, business_name, created_by, email, contact_person, status, package)
  values (
    coalesce(nullif(trim(p_business_name), ''), v_full_name || '''s Property', 'New Property'),
    nullif(trim(p_business_name), ''),
    auth.uid(),
    (select email from public.profiles where id = auth.uid()),
    v_full_name,
    'pending',
    'none'
  )
  returning * into v_property;

  insert into public.property_users (property_id, user_id, role)
  values (v_property.id, auth.uid(), 'owner');

  return v_property;
exception
  when unique_violation then
    select p.* into v_property
    from public.properties p
    join public.property_users pu on pu.property_id = p.id
    where pu.user_id = auth.uid() and pu.role = 'owner'
    limit 1;
    if found then return v_property; end if;
    raise;
end;
$$;

grant execute on function public.ensure_my_pending_property(text) to authenticated;
revoke execute on function public.ensure_my_pending_property(text) from anon, public;

-- Compatibility wrapper for older frontend builds.
create or replace function public.claim_owner_property(p_business_name text default null)
returns public.properties
language plpgsql
security invoker
set search_path = public
as $$
begin
  return public.ensure_my_pending_property(p_business_name);
end;
$$;

grant execute on function public.claim_owner_property(text) to authenticated;
revoke execute on function public.claim_owner_property(text) from anon, public;

-- -------------------------------------------------------------------------
-- Admin application repair. Restricted to platform_owner and safe to call
-- repeatedly. It creates a pending/none property for every normal profile
-- that has no owner membership. This is what repairs the existing account
-- that currently says "Pending Approval" but has no property row.
-- -------------------------------------------------------------------------
create or replace function public.admin_sync_pending_applications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  u record;
  v_property_id uuid;
  v_created integer := 0;
  v_name text;
  v_business_name text;
begin
  if not public.is_platform_owner() then
    raise exception 'Only a platform owner can synchronize applications.' using errcode = '42501';
  end if;

  for u in
    select p.id, p.email, p.full_name, au.raw_user_meta_data
    from public.profiles p
    join auth.users au on au.id = p.id
    where p.platform_role = 'user'
      and not exists (
        select 1 from public.property_users pu
        where pu.user_id = p.id and pu.role = 'owner'
      )
  loop
    v_business_name := nullif(trim(u.raw_user_meta_data->>'pending_business_name'), '');
    v_name := coalesce(v_business_name, nullif(trim(u.full_name), '') || '''s Property', 'New Property');

    begin
      insert into public.properties
        (name, business_name, created_by, email, contact_person, status, package)
      values
        (v_name, v_business_name, u.id, u.email, u.full_name, 'pending', 'none')
      returning id into v_property_id;

      insert into public.property_users (property_id, user_id, role)
      values (v_property_id, u.id, 'owner');

      v_created := v_created + 1;
    exception when unique_violation then
      -- Another request repaired this user first.
      null;
    end;
  end loop;

  return v_created;
end;
$$;

grant execute on function public.admin_sync_pending_applications() to authenticated;
revoke execute on function public.admin_sync_pending_applications() from anon, public;

-- -------------------------------------------------------------------------
-- Admin read RPCs. Re-created here so the final migration can repair a
-- partially deployed database without relying on 0006/0007 having been
-- applied in the expected order.
-- -------------------------------------------------------------------------
create or replace function public.admin_list_properties()
returns table (
  id uuid,
  name text,
  business_name text,
  status property_status,
  package property_package,
  created_at timestamptz,
  owner_full_name text,
  owner_email text
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.name, p.business_name, p.status, p.package, p.created_at,
         pr.full_name, pr.email
  from public.properties p
  left join public.property_users pu on pu.property_id = p.id and pu.role = 'owner'
  left join public.profiles pr on pr.id = pu.user_id
  where public.is_platform_owner()
  order by p.created_at desc;
$$;

grant execute on function public.admin_list_properties() to authenticated;
revoke execute on function public.admin_list_properties() from anon, public;

create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  result jsonb;
begin
  if not public.is_platform_owner() then
    raise exception 'Only a platform owner can view the admin dashboard.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'totalProperties', count(*),
    'pendingProperties', count(*) filter (where status = 'pending'),
    'activeProperties', count(*) filter (where status = 'active'),
    'suspendedProperties', count(*) filter (where status = 'suspended'),
    'activeUsers', (select count(*) from public.profiles),
    'activePackages', jsonb_build_object(
      'standard', count(*) filter (where status = 'active' and package = 'standard'),
      'premium', count(*) filter (where status = 'active' and package = 'premium'),
      'professional', count(*) filter (where status = 'active' and package = 'professional'),
      'none', count(*) filter (where package = 'none')
    )
  ) into result
  from public.properties;

  return result;
end;
$$;

grant execute on function public.admin_dashboard_stats() to authenticated;
revoke execute on function public.admin_dashboard_stats() from anon, public;

-- -------------------------------------------------------------------------
-- Atomic approval + package assignment.
-- -------------------------------------------------------------------------
create or replace function public.approve_property(
  p_property_id uuid,
  p_package property_package
)
returns public.properties
language plpgsql
security definer
set search_path = public
as $$
declare
  v_property public.properties;
  v_old_status property_status;
  v_old_package property_package;
begin
  if not public.is_platform_owner() then
    raise exception 'Only a platform owner can approve properties.' using errcode = '42501';
  end if;

  if p_package is null or p_package = 'none' then
    raise exception 'An active property must have a package.' using errcode = '22023';
  end if;

  select * into v_property
  from public.properties
  where id = p_property_id
  for update;

  if not found then
    raise exception 'Property not found.' using errcode = 'P0002';
  end if;

  v_old_status := v_property.status;
  v_old_package := v_property.package;

  update public.properties
  set status = 'active', package = p_package, updated_at = now()
  where id = p_property_id
  returning * into v_property;

  insert into public.audit_logs (actor_id, action, property_id, old_value, new_value)
  values (
    auth.uid(), 'property_approved', v_property.id,
    jsonb_build_object('status', v_old_status, 'package', v_old_package),
    jsonb_build_object('status', 'active', 'package', p_package)
  );

  return v_property;
end;
$$;

grant execute on function public.approve_property(uuid, property_package) to authenticated;
revoke execute on function public.approve_property(uuid, property_package) from anon, public;

-- -------------------------------------------------------------------------
-- Repair existing normal accounts immediately. This deliberately does not
-- rely on pending_owner_signup metadata, because older accounts may not have
-- that metadata. Platform owners are excluded.
-- -------------------------------------------------------------------------
do $$
declare
  u record;
  v_property_id uuid;
  v_name text;
  v_business_name text;
begin
  for u in
    select p.id, p.email, p.full_name, au.raw_user_meta_data
    from public.profiles p
    join auth.users au on au.id = p.id
    where p.platform_role = 'user'
      and not exists (
        select 1 from public.property_users pu
        where pu.user_id = p.id and pu.role = 'owner'
      )
  loop
    v_business_name := nullif(trim(u.raw_user_meta_data->>'pending_business_name'), '');
    v_name := coalesce(v_business_name, nullif(trim(u.full_name), '') || '''s Property', 'New Property');

    begin
      insert into public.properties
        (name, business_name, created_by, email, contact_person, status, package)
      values
        (v_name, v_business_name, u.id, u.email, u.full_name, 'pending', 'none')
      returning id into v_property_id;

      insert into public.property_users (property_id, user_id, role)
      values (v_property_id, u.id, 'owner');
    exception when unique_violation then
      null;
    end;
  end loop;
end;
$$;

-- Ask PostgREST to refresh its function schema cache immediately.
notify pgrst, 'reload schema';
