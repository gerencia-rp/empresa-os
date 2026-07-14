-- ════════════════════════════════════════════════════════════════
-- O2 · PROPERTY_ID CANÓNICO (auditoría 2026-07-13, P5) — ADITIVA, rollback al pie.
-- `properties` ya es la tabla maestra (property_id poblado: FF 28/28 · Remodel 26/26 · Rentas 21/21).
-- Lo que faltaba: property_alias = TODAS las variantes (direcciones sucias de las 3 bases Airtable,
-- cuentas QBO por propiedad, folders de ClickUp) apuntando al mismo property_id.
-- Todo join futuro resuelve por property_id, NUNCA por string.
-- Caso dudoso conocido: QBO "Casas Marlin" agrupa 2 casas (Bartlett + Capps) → alias FAN-OUT
-- (2 filas, mismo alias, 2 property_id) — por eso el unique incluye property_id.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.property_alias (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id),
  alias text not null,
  alias_norm text not null,              -- lower + solo [a-z0-9] (mismo criterio que address_norm)
  tipo text not null check (tipo in ('airtable_ff','airtable_ff_rec','airtable_rentas','airtable_remodel','qbo_account','clickup_folder','manual')),
  fuente text,                           -- de dónde salió el mapeo
  active boolean not null default true,  -- soft-delete
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (property_id, alias_norm, tipo)
);
create index if not exists property_alias_norm_idx on public.property_alias (alias_norm) where active;
alter table public.property_alias enable row level security;
drop policy if exists pa_read on public.property_alias;
create policy pa_read on public.property_alias for select to authenticated
  using (public.has_area('fix-flip') or public.has_area('rentas') or public.has_area('remodelacion') or public.has_area('contable') or public.has_area('operacion'));
-- escritura: solo service_role (la puebla el sync/migración) — sin policy de write para authenticated.

-- ─── normalizador local (mismo criterio que los address_norm de los espejos) ───
create or replace function public.pa_norm(t text) returns text language sql immutable as
$$ select lower(regexp_replace(coalesce(t,''), '[^a-zA-Z0-9]', '', 'g')) $$;

-- 1) Airtable Fix & Flip (28): dirección + recId
insert into public.property_alias (property_id, alias, alias_norm, tipo, fuente)
select property_id, address, pa_norm(address), 'airtable_ff', 'ff_deals.address'
from public.ff_deals where active and property_id is not null and address is not null
on conflict do nothing;
insert into public.property_alias (property_id, alias, alias_norm, tipo, fuente)
select property_id, airtable_id, pa_norm(airtable_id), 'airtable_ff_rec', 'ff_deals.airtable_id'
from public.ff_deals where active and property_id is not null
on conflict do nothing;

-- 2) Airtable Remodelación (26): dirección
insert into public.property_alias (property_id, alias, alias_norm, tipo, fuente)
select property_id, address, pa_norm(address), 'airtable_remodel', 'remodel_at_properties.address'
from public.remodel_at_properties where active and property_id is not null and address is not null
on conflict do nothing;

-- 3) Airtable Rentas (21): nombre de casa
insert into public.property_alias (property_id, alias, alias_norm, tipo, fuente)
select property_id, name, pa_norm(name), 'airtable_rentas', 'pm_properties.name'
from public.pm_properties where active and property_id is not null and name is not null
on conflict do nothing;

-- 4) La maestra misma: address + nickname + alias (variantes históricas)
insert into public.property_alias (property_id, alias, alias_norm, tipo, fuente)
select id, address, pa_norm(address), 'manual', 'properties.address'
from public.properties where deleted_at is null and address is not null
  and id in (select property_id from public.property_alias)
on conflict do nothing;
insert into public.property_alias (property_id, alias, alias_norm, tipo, fuente)
select id, nickname, pa_norm(nickname), 'manual', 'properties.nickname'
from public.properties where deleted_at is null and coalesce(nickname,'') <> ''
  and id in (select property_id from public.property_alias)
on conflict do nothing;

-- 5) QBO: cuentas por propiedad del Balance ("Rental Property - X" / ". TX - X")
--    match por fragmento de letras contra ff_deals.address_norm (que ya tiene property_id)
with qbo as (
  select distinct label,
    pa_norm(regexp_replace(label, '^(Rental Property -|\. TX -)\s*', '')) as key
  from public.qb_report_cache
  where report = 'balance' and (label like 'Rental Property%' or label like '. TX %')
), mapa as (
  select q.label, d.property_id
  from qbo q
  join public.ff_deals d on d.active and d.property_id is not null
    and (
      (q.key <> 'casasmarlin' and d.address_norm like '%' || q.key || '%')
      or (q.key = 'casasmarlin' and d.address_norm like '%marlin%')   -- fan-out: agrupa Bartlett + Capps
    )
)
insert into public.property_alias (property_id, alias, alias_norm, tipo, fuente)
select property_id, label, pa_norm(label), 'qbo_account', 'qb_report_cache.balance'
from mapa
on conflict do nothing;

-- 6) ClickUp: folders por casa (los que matcheen una dirección de F&F por fragmento)
with cu as (
  select distinct folder_name, pa_norm(folder_name) as key
  from public.clickup_tasks_mirror
  where coalesce(folder_name,'') <> ''
), mapa as (
  select cu.folder_name, d.property_id
  from cu
  join public.ff_deals d on d.active and d.property_id is not null
    and length(cu.key) >= 5 and d.address_norm like '%' || cu.key || '%'
)
insert into public.property_alias (property_id, alias, alias_norm, tipo, fuente)
select property_id, folder_name, pa_norm(folder_name), 'clickup_folder', 'clickup_tasks_mirror.folder_name'
from mapa
on conflict do nothing;

-- ─── ROLLBACK ───
-- drop table if exists public.property_alias;
-- drop function if exists public.pa_norm(text);
