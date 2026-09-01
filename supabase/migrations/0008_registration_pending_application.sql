-- OliTechs PMS+POS — create the property application at registration time.
--
-- Why this migration exists:
-- Supabase can require email confirmation. In that case signUp() creates an
-- auth.users row but does not give the browser a session, so a client-side
-- INSERT into properties cannot safely happen yet. The old implementation
-- therefore deferred property creation until first login, which made the
-- owner see a "Pending Approval" screen while the admin had no application
-- to review.
--
-- The secure solution is a server-side auth.users trigger. The trigger runs
-- with SECURITY DEFINER privileges and uses only the signup metadata supplied
-- at registration. It creates the application as pending/none and adds the
-- registrant as its owner before the signup transaction completes. No RLS
-- policy is weakened and the property can never be self-approved here.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_name text;
  v_full_name text;
  v_property public.properties;
begin
  v_full_name := nullif(trim(new.raw_user_meta_data->>'full_name'), '');
  v_business_name := nullif(trim(new.raw_user_meta_data->>'pending_business_name'), '');

  -- Always keep the profile in sync with the auth user.
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, v_full_name)
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        updated_at = now();

  -- Only the normal self-service registration flow gets a property.
  -- Platform-owner accounts are created separately from the app and do not
  -- carry this marker.
  if coalesce((new.raw_user_meta_data->>'pending_owner_signup')::boolean, false) then
    -- The unique owner index from 0004 makes this idempotent.
    select p.* into v_property
    from public.properties p
    join public.property_users pu on pu.property_id = p.id
    where pu.user_id = new.id and pu.role = 'owner'
    limit 1;

    if not found then
      insert into public.properties (
        name,
        business_name,
        created_by,
        email,
        contact_person,
        status,
        package
      )
      values (
        coalesce(v_business_name, v_full_name || '''s Property', 'New Property'),
        v_business_name,
        new.id,
        new.email,
        v_full_name,
        'pending',
        'none'
      )
      returning * into v_property;

      insert into public.property_users (property_id, user_id, role)
      values (v_property.id, new.id, 'owner');
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill applications for users who registered before this migration and
-- therefore may have a profile + pending_owner_signup metadata but no property.
do $$
declare
  u record;
  v_property_id uuid;
  v_business_name text;
  v_full_name text;
begin
  for u in
    select au.id, au.email, au.raw_user_meta_data
    from auth.users au
    where coalesce((au.raw_user_meta_data->>'pending_owner_signup')::boolean, false)
      and not exists (
        select 1
        from public.property_users pu
        where pu.user_id = au.id and pu.role = 'owner'
      )
  loop
    v_full_name := nullif(trim(u.raw_user_meta_data->>'full_name'), '');
    v_business_name := nullif(trim(u.raw_user_meta_data->>'pending_business_name'), '');

    insert into public.properties (
      name,
      business_name,
      created_by,
      email,
      contact_person,
      status,
      package
    )
    values (
      coalesce(v_business_name, v_full_name || '''s Property', 'New Property'),
      v_business_name,
      u.id,
      u.email,
      v_full_name,
      'pending',
      'none'
    )
    returning id into v_property_id;

    insert into public.property_users (property_id, user_id, role)
    values (v_property_id, u.id, 'owner');
  end loop;
end;
$$;

-- A small admin-safe RPC makes it possible to recover an application if an
-- older account was created without the signup metadata. It is intentionally
-- restricted to the authenticated user and always creates pending/none.
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

  insert into public.properties (name, business_name, created_by, status, package)
  values (
    coalesce(nullif(trim(p_business_name), ''), v_full_name || '''s Property', 'New Property'),
    nullif(trim(p_business_name), ''),
    auth.uid(),
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
    return v_property;
end;
$$;

grant execute on function public.ensure_my_pending_property(text) to authenticated;
revoke execute on function public.ensure_my_pending_property(text) from anon, public;
