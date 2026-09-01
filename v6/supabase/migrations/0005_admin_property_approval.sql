-- Atomic platform-owner approval + package assignment.
-- Keeps the state transition and audit entry together so a property cannot
-- be activated without a package or end up half-approved if logging fails.

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
    auth.uid(),
    'property_approved',
    v_property.id,
    jsonb_build_object('status', v_old_status, 'package', v_old_package),
    jsonb_build_object('status', 'active', 'package', p_package)
  );

  return v_property;
end;
$$;

grant execute on function public.approve_property(uuid, property_package) to authenticated;
revoke execute on function public.approve_property(uuid, property_package) from anon, public;
