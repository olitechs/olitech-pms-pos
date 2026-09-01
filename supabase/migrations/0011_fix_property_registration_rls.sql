-- OliTechs PMS+POS — final fix for property application creation under RLS.
--
-- The browser must NEVER insert a property directly during registration.
-- Property creation is performed by SECURITY DEFINER server-side functions.
-- This fixes: "new row violates row-level security policy for table properties"
-- on projects where the previous ensure function was SECURITY INVOKER.

-- Server-side application creator. It is deliberately not exposed to anon or
-- authenticated clients; only other trusted SECURITY DEFINER routines call it.
create or replace function public.create_pending_property_for_user(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_business_name text default null
)
returns public.properties
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_property public.properties;
  v_name text;
begin
  if p_user_id is null then
    raise exception 'User id is required.' using errcode = '22023';
  end if;

  -- Idempotent: never create a second owner property for the same user.
  select p.* into v_property
  from public.properties p
  join public.property_users pu on pu.property_id = p.id
  where pu.user_id = p_user_id and pu.role = 'owner'
  order by p.created_at desc
  limit 1;

  if found then
    return v_property;
  end if;

  v_name := coalesce(
    nullif(trim(p_business_name), ''),
    nullif(trim(p_full_name), '') || '''s Property',
    'New Property'
  );

  insert into public.properties
    (name, business_name, created_by, email, contact_person, status, package)
  values
    (v_name,
     nullif(trim(p_business_name), ''),
     p_user_id,
     nullif(trim(p_email), ''),
     nullif(trim(p_full_name), ''),
     'pending',
     'none')
  returning * into v_property;

  insert into public.property_users (property_id, user_id, role)
  values (v_property.id, p_user_id, 'owner');

  return v_property;
exception
  when unique_violation then
    select p.* into v_property
    from public.properties p
    join public.property_users pu on pu.property_id = p.id
    where pu.user_id = p_user_id and pu.role = 'owner'
    order by p.created_at desc
    limit 1;
    if found then return v_property; end if;
    raise;
end;
$$;

revoke all on function public.create_pending_property_for_user(uuid, text, text, text) from public, anon, authenticated;

-- Ensure function used by the authenticated app. SECURITY DEFINER is critical:
-- auth.uid() users should not need an INSERT policy on properties just to have
-- their server-created application repaired.
create or replace function public.ensure_my_pending_property(p_business_name text default null)
returns public.properties
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_property public.properties;
  v_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if public.is_platform_owner() then
    raise exception 'Platform owners do not have a self-service property.' using errcode = '42501';
  end if;

  select * into v_profile
  from public.profiles
  where id = auth.uid();

  if not found then
    raise exception 'Profile not found.' using errcode = 'P0002';
  end if;

  return public.create_pending_property_for_user(
    auth.uid(),
    v_profile.email,
    v_profile.full_name,
    p_business_name
  );
end;
$$;

grant execute on function public.ensure_my_pending_property(text) to authenticated;
revoke execute on function public.ensure_my_pending_property(text) from anon, public;

-- The auth trigger must also use the trusted creator. This works even when
-- email confirmation means the registering browser has no session.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_full_name text;
  v_business_name text;
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
    perform public.create_pending_property_for_user(
      new.id,
      new.email,
      v_full_name,
      v_business_name
    );
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Keep the compatibility wrapper secure as well.
create or replace function public.claim_owner_property(p_business_name text default null)
returns public.properties
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  return public.ensure_my_pending_property(p_business_name);
end;
$$;

grant execute on function public.claim_owner_property(text) to authenticated;
revoke execute on function public.claim_owner_property(text) from anon, public;

-- Repair all existing normal users who still have no owner property.
create or replace function public.admin_sync_pending_applications()
returns integer
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  u record;
  v_created integer := 0;
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
    perform public.create_pending_property_for_user(
      u.id,
      u.email,
      u.full_name,
      nullif(trim(u.raw_user_meta_data->>'pending_business_name'), '')
    );
    v_created := v_created + 1;
  end loop;

  return v_created;
end;
$$;

grant execute on function public.admin_sync_pending_applications() to authenticated;
revoke execute on function public.admin_sync_pending_applications() from anon, public;

-- Make sure PostgREST sees the newly replaced routines immediately.
notify pgrst, 'reload schema';
