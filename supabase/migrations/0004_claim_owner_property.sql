-- OliTechs PMS+POS — fix registration RLS error caused by the
-- email-confirmation gap.
--
-- Root cause: when Supabase Auth email confirmation is enabled,
-- `supabase.auth.signUp()` returns a user object but NO session (the
-- session only exists after the user clicks the confirmation link and
-- logs in). The previous registration code inserted into `properties`
-- immediately after `signUp()` regardless of whether a session existed.
-- With no session, the request runs as the `anon` role, `auth.uid()` is
-- null, and the existing (correct) INSERT policy on `properties`
--   (created_by = auth.uid() and status = 'pending' and package = 'none')
-- rejects it — producing the reported error:
--   "new row violates row-level security policy for table properties"
--
-- The RLS policy itself was NOT the bug and is not weakened here. The
-- fix is architectural: never attempt the property insert without an
-- authenticated session. Property creation is now deferred to the first
-- moment an authenticated session actually exists (immediately after
-- signUp when confirmation is off, or on first login after the user
-- confirms their email), and is performed through the atomic function
-- below instead of two separate client-side inserts.
--
-- This migration is additive and safe to re-run.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Prevent a self-registered owner from ever ending up with two
--    "owner" properties from a duplicate/racing claim attempt (e.g. two
--    browser tabs both finishing onboarding at once).
-- ─────────────────────────────────────────────────────────────────────────

create unique index if not exists property_users_one_owner_property_per_user
  on public.property_users (user_id)
  where role = 'owner';

-- ─────────────────────────────────────────────────────────────────────────
-- 2. claim_owner_property — atomically creates the caller's pending
--    property application and adds them as its 'owner', but only once.
--
--    SECURITY INVOKER (the default) on purpose: this function runs with
--    the CALLER's own privileges, so the existing RLS policies on
--    properties/property_users (created_by = auth.uid(), status =
--    'pending', package = 'none') still apply in full — the function is
--    a convenience wrapper around the same two inserts the client used
--    to make by hand, combined into one transaction, not a bypass of
--    RLS. It can only ever be called by an authenticated user with a
--    real session (auth.uid() is checked explicitly below too).
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.claim_owner_property(p_business_name text default null)
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

  -- Platform owners (created only via the Supabase dashboard + a direct
  -- SQL promotion, see migrations/README.md) never get a self-service
  -- property this way.
  if public.is_platform_owner() then
    raise exception 'Platform owners do not have a self-service property.';
  end if;

  -- Already onboarded (e.g. this ran once already, or another
  -- tab/request won the race) — just return their existing property
  -- instead of erroring, so the caller can safely call this idempotently.
  select p.* into v_property
  from public.properties p
  join public.property_users pu on pu.property_id = p.id
  where pu.user_id = auth.uid() and pu.role = 'owner'
  limit 1;

  if found then
    return v_property;
  end if;

  select full_name into v_full_name from public.profiles where id = auth.uid();

  insert into public.properties (name, business_name, created_by, status, package)
  values (
    coalesce(nullif(p_business_name, ''), v_full_name || '''s Property', 'New Property'),
    nullif(p_business_name, ''),
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
    -- Lost a race against a concurrent call for the same user (see the
    -- partial unique index above) — fetch and return the property that
    -- the other call created instead of failing the request.
    select p.* into v_property
    from public.properties p
    join public.property_users pu on pu.property_id = p.id
    where pu.user_id = auth.uid() and pu.role = 'owner'
    limit 1;
    return v_property;
end;
$$;

grant execute on function public.claim_owner_property(text) to authenticated;
revoke execute on function public.claim_owner_property(text) from anon, public;
