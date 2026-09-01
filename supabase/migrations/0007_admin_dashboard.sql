-- Admin dashboard visibility fix.
-- The admin dashboard uses this single RPC for its platform-wide counts.
-- It deliberately checks the caller's platform role and then reads the
-- property/profile tables inside a SECURITY DEFINER function, so normal
-- client RLS cannot make a legitimate admin see zero rows.

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
    'activePackages', jsonb_build_object(
      'standard', count(*) filter (where status = 'active' and package = 'standard'),
      'premium', count(*) filter (where status = 'active' and package = 'premium'),
      'professional', count(*) filter (where status = 'active' and package = 'professional'),
      'none', count(*) filter (where package = 'none')
    )
  ) into result
  from public.properties;

  result := result || jsonb_build_object(
    'activeUsers', (select count(*) from public.profiles)
  );

  return result;
end;
$$;

grant execute on function public.admin_dashboard_stats() to authenticated;
revoke execute on function public.admin_dashboard_stats() from anon, public;
