-- OliTechs PMS+POS — Phase 3: maintenance + inventory
-- Run after 0001_platform_admin.sql and 0002_pms_core.sql.
--
-- Housekeeping itself needs no new table — it's just the `rooms.status`
-- column from 0002 (dirty/cleaning/available/etc), already RLS-protected.

do $$ begin
  create type maintenance_priority as enum ('low', 'medium', 'high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type maintenance_status as enum ('open', 'assigned', 'in_progress', 'resolved', 'closed');
exception when duplicate_object then null; end $$;

create table if not exists public.maintenance_tickets (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete set null,
  issue text not null,
  priority maintenance_priority not null default 'medium',
  status maintenance_status not null default 'open',
  assigned_to text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists maintenance_tickets_property_idx on public.maintenance_tickets(property_id);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  category text,
  unit text default 'pcs',
  quantity numeric(12,2) not null default 0,
  low_stock_threshold numeric(12,2) not null default 5,
  created_at timestamptz not null default now()
);
create index if not exists inventory_items_property_idx on public.inventory_items(property_id);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  change numeric(12,2) not null,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists inventory_movements_item_idx on public.inventory_movements(item_id);

alter table public.maintenance_tickets enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['maintenance_tickets', 'inventory_items', 'inventory_movements']
  loop
    execute format('drop policy if exists "%1$s_select" on public.%1$s', t);
    execute format(
      'create policy "%1$s_select" on public.%1$s for select using (public.is_platform_owner() or public.is_member_of_property(property_id))',
      t
    );
    execute format('drop policy if exists "%1$s_insert" on public.%1$s', t);
    execute format(
      'create policy "%1$s_insert" on public.%1$s for insert with check (public.is_platform_owner() or public.is_member_of_property(property_id))',
      t
    );
    execute format('drop policy if exists "%1$s_update" on public.%1$s', t);
    execute format(
      'create policy "%1$s_update" on public.%1$s for update using (public.is_platform_owner() or public.is_member_of_property(property_id))',
      t
    );
    execute format('drop policy if exists "%1$s_delete" on public.%1$s', t);
    execute format(
      'create policy "%1$s_delete" on public.%1$s for delete using (public.is_platform_owner() or public.is_member_of_property(property_id))',
      t
    );
  end loop;
end $$;

-- Atomic stock adjustment (spec section 33: inventory failures must never
-- corrupt a completed sale — this function only ever touches inventory
-- tables, is called AFTER a sale is already recorded, and its failure is
-- caught and swallowed by the caller, never rolling back the sale).
create or replace function public.fn_adjust_stock(p_item_id uuid, p_change numeric, p_reason text)
returns public.inventory_items
language plpgsql
as $$
declare
  v_item public.inventory_items;
begin
  update public.inventory_items
    set quantity = quantity + p_change
    where id = p_item_id
    returning * into v_item;

  if v_item.id is null then
    raise exception 'Inventory item not found.';
  end if;

  insert into public.inventory_movements (property_id, item_id, change, reason)
    values (v_item.property_id, p_item_id, p_change, p_reason);

  return v_item;
end;
$$;

create or replace function public.fn_touch_maintenance_ticket()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists maintenance_tickets_touch on public.maintenance_tickets;
create trigger maintenance_tickets_touch
  before update on public.maintenance_tickets
  for each row execute function public.fn_touch_maintenance_ticket();
