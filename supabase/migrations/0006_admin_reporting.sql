-- Platform-owner reporting helpers.
-- profiles intentionally expose only the signed-in user's row through RLS,
-- so admin screens use narrowly-scoped SECURITY DEFINER functions instead
-- of weakening profile RLS or relying on client-side joins.

create or replace function public.admin_profile_count()
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select count(*) from public.profiles where public.is_platform_owner();
$$;

grant execute on function public.admin_profile_count() to authenticated;
revoke execute on function public.admin_profile_count() from anon, public;

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

create or replace function public.admin_property_users(p_property_id uuid)
returns table (
  id uuid,
  role property_member_role,
  created_at timestamptz,
  full_name text,
  email text
)
language sql
security definer
set search_path = public
stable
as $$
  select pu.id, pu.role, pu.created_at, pr.full_name, pr.email
  from public.property_users pu
  join public.profiles pr on pr.id = pu.user_id
  where pu.property_id = p_property_id
    and public.is_platform_owner()
  order by case when pu.role = 'owner' then 0 else 1 end, pu.created_at;
$$;

grant execute on function public.admin_property_users(uuid) to authenticated;
revoke execute on function public.admin_property_users(uuid) from anon, public;

create or replace function public.admin_audit_log(p_property_id uuid default null)
returns table (
  id uuid,
  action text,
  property_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz,
  actor_full_name text,
  actor_email text
)
language sql
security definer
set search_path = public
stable
as $$
  select a.id, a.action, a.property_id, a.old_value, a.new_value, a.created_at,
         pr.full_name, pr.email
  from public.audit_logs a
  left join public.profiles pr on pr.id = a.actor_id
  where public.is_platform_owner()
    and (p_property_id is null or a.property_id = p_property_id)
  order by a.created_at desc
  limit 100;
$$;

grant execute on function public.admin_audit_log(uuid) to authenticated;
revoke execute on function public.admin_audit_log(uuid) from anon, public;
