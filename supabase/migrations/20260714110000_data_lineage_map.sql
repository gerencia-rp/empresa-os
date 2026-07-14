-- 🗺️ MAPA DE CONEXIONES (linaje de datos) — pedido CEO 14-jul.
-- Una fila = UN número que se muestra en una pantalla de la app, con su origen exacto
-- (base · tabla · columna), fórmula/nota, y semáforo OK/REVISAR/BUG editable por el equipo.
-- La app LEE esta config (motor de KPIs gobernado por el mapa) y el módulo os-lineage.js
-- la dibuja (árbol Empresa→Sistema→número + diagrama de nodos) y la edita.
-- Aditivo, soft-delete, audit inmutable por trigger (quién/cuándo/antes/después).

create table if not exists data_lineage_map (
  id uuid primary key default gen_random_uuid(),
  empresa text not null,           -- 'Fix & Flip' | 'Rentas' | 'Remodelación' | 'Contable / QBO'
  sistema text not null,           -- pantalla/sistema (ej 'Ficha de Casa', 'Property Manager · Resumen')
  grupo text,                      -- agrupador visual dentro de la pantalla
  dato text not null,              -- el número tal como lo ve el equipo
  base text not null,              -- base origen: 'Fix & Flip'|'Rentas'|'Remodelación'|'Contable / QBO'|'Supabase (vista)'
  tabla text not null,             -- tabla Airtable / vista v_* / reporte QBO
  columna text not null,           -- columna / campo exacto (con field id si se conoce)
  formula text,                    -- cómo se calcula (si es derivado)
  nota text,
  estado text not null default 'pend' check (estado in ('ok','warn','bug','pend')),
  orden int default 0,
  editado_por text,
  updated_at timestamptz default now(),
  created_at timestamptz default now(),
  active boolean default true,
  archived_at timestamptz,
  unique (empresa, sistema, dato)
);

create table if not exists data_lineage_audit (
  id bigint generated always as identity primary key,
  map_id uuid,
  accion text not null,            -- insert | update | archive
  antes jsonb,
  despues jsonb,
  editado_por text,
  at timestamptz default now()
);

-- audit INMUTABLE por trigger (el front no puede saltearlo)
create or replace function trg_lineage_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare who text;
begin
  who := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email', 'service');
  if tg_op = 'INSERT' then
    insert into data_lineage_audit (map_id, accion, antes, despues, editado_por)
      values (new.id, 'insert', null, to_jsonb(new), who);
    new.editado_por := who;
    return new;
  else
    insert into data_lineage_audit (map_id, accion, antes, despues, editado_por)
      values (new.id, case when new.active = false and old.active then 'archive' else 'update' end, to_jsonb(old), to_jsonb(new), who);
    new.editado_por := who; new.updated_at := now();
    return new;
  end if;
end $$;
drop trigger if exists data_lineage_map_audit on data_lineage_map;
create trigger data_lineage_map_audit before insert or update on data_lineage_map
  for each row execute function trg_lineage_audit();

alter table data_lineage_map enable row level security;
alter table data_lineage_audit enable row level security;
-- lectura/edición: cualquier usuario con área asignada (el mapa es metadata transversal); jamás anon
drop policy if exists lineage_read on data_lineage_map;
create policy lineage_read on data_lineage_map for select to authenticated
  using (has_area('fix-flip') or has_area('rentas') or has_area('remodelacion') or has_area('contable') or has_area('operacion'));
drop policy if exists lineage_write on data_lineage_map;
create policy lineage_write on data_lineage_map for all to authenticated
  using (has_area('fix-flip') or has_area('rentas') or has_area('remodelacion') or has_area('contable') or has_area('operacion'))
  with check (has_area('fix-flip') or has_area('rentas') or has_area('remodelacion') or has_area('contable') or has_area('operacion'));
drop policy if exists lineage_audit_read on data_lineage_audit;
create policy lineage_audit_read on data_lineage_audit for select to authenticated
  using (has_area('fix-flip') or has_area('rentas') or has_area('remodelacion') or has_area('contable') or has_area('operacion'));
-- el audit lo escribe SOLO el trigger (security definer) — sin policy de insert para usuarios

-- RPC para el generador (scripts/lineage-gen.mjs): linaje real vista → tablas·columnas
create or replace function lineage_view_usage() returns table(view_name text, table_name text, cols text[])
language sql stable security definer set search_path = public, information_schema as $$
  select vcu.view_name::text, vcu.table_name::text, array_agg(distinct vcu.column_name::text order by vcu.column_name::text)
  from information_schema.view_column_usage vcu
  where vcu.view_schema = 'public' and vcu.view_name like 'v\_%'
  group by 1, 2 order by 1, 2
$$;
grant execute on function lineage_view_usage() to authenticated, service_role;
revoke execute on function lineage_view_usage() from anon;
