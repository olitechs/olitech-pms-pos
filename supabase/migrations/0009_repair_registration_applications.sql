-- OliTechs PMS+POS — robust registration/application repair.
--
-- Repairs accounts that exist in profiles/auth.users but have no owner
-- property, and adds an admin-only synchronization RPC. This does not weaken
-- client RLS: the synchronization RPC is SECURITY DEFINER and checks the
-- platform-owner role before it can write anything.

create or replace function public.admin_sync_pending_applications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  u record;
  v_property public.properties;
  v_business_name text;
  v_full_name text;
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
    v_full_name := nullif(trim(coalesce(u.full_name, u.raw_user_meta_data->>'full_name')), '');
    v_business_name := nullif(trim(u.raw_user_meta_data->>'pending_business_name'), '');

    begin
      insert into public.properties (
        name, business_name, created_by, email, contact_person, status, package
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
      returning * into v_property;

      insert into public.property_users (property_id, user_id, role)
      values (v_property.id, u.id, 'owner');

      v_created := v_created + 1;
    exception
      when unique_violation then null;
    end;
  end loop;

  return v_created;
end;
$$;

grant execute on function public.admin_sync_pending_applications() to authenticated;
revoke execute on function public.admin_sync_pending_applications() from anon, public;


-- Re-install the signup trigger as part of this final migration so a fresh
-- registration creates its pending application even if an earlier migration
-- was skipped during deployment. The frontend supplies pending_owner_signup
-- and pending_business_name in auth metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_business_name text;
  v_property public.properties;
begin
  v_full_name := nullif(trim(new.raw_user_meta_data->>'full_name'), '');
  v_business_name := nullif(trim(new.raw_user_meta_data->>'pending_business_name'), '');

  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, v_full_name)
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        updated_at = now();

  if coalesce((new.raw_user_meta_data->>'pending_owner_signup')::boolean, false) then
    if not exists (
      select 1 from public.property_users pu
      where pu.user_id = new.id and pu.role = 'owner'
    ) then
      insert into public.properties (
        name, business_name, created_by, email, contact_person, status, package
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

-- One-time repair for the current database. This will repair the user's
-- existing account even if signup metadata was missing.
do $$
declare
  u record;
  v_property_id uuid;
  v_business_name text;
  v_full_name text;
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
    v_full_name := nullif(trim(coalesce(u.full_name, u.raw_user_meta_data->>'full_name')), '');
    v_business_name := nullif(trim(u.raw_user_meta_data->>'pending_business_name'), '');

    begin
      insert into public.properties (
        name, business_name, created_by, email, contact_person, status, package
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
    exception
      when unique_violation then null;
    end;
  end loop;
end;
$$;
