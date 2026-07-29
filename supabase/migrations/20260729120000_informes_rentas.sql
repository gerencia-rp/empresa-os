-- ════════════════════════════════════════════════════════════════
-- 📊 INFORMES AUTOMÁTICOS DE RENTAS (29-jul-2026)
-- Reemplaza los 3 informes manuales de Rentas por generación viva desde el OS:
--   1) Semanal de Ocupación y Gestión  2) Balance de Rentas (avance)  3) Combinado (cartera + portafolio)
-- Principios: UNA definición por métrica (cartera, ocupación, vencimientos), snapshots INMUTABLES por
-- corte (la "franja de avance" compara snapshots reales), y la MISMA RPC la llaman el botón "Generar"
-- del panel y el pg_cron (semanal lunes / cierre de mes) — sin sumar funciones Vercel (límite 12).
-- ADITIVA: sin DROP/TRUNCATE. Rollback en supabase/rollbacks/20260729-informes-rentas.sql
-- ════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1) DETALLE POR UNIDAD (§7 informe 1 · anexo informe 3) — una fila por unidad rentable,
--    con su reserva vigente (activo > reservada), inquilino y vigencia.
-- ─────────────────────────────────────────────────────────────
create or replace view v_rentas_unidades as
select
  u.id                                              as unit_id,
  u.property_id,
  pp.name                                           as casa,
  pp.address,
  pp.city,
  pp.state,
  pp.zip,
  coalesce(nullif(btrim(u.name), ''), u.code, u.unit_type) as unidad,
  u.unit_type,
  u.status,
  u.target_rent,
  b.tenant_id,
  t.full_name                                       as inquilino,
  b.status                                          as booking_status,
  b.start_date                                      as vigencia_inicio,
  b.end_date                                        as vigencia_fin,
  coalesce(b.rent_amount, u.target_rent, t.rent_amount) as renta,
  t.contract_end
from pm_units u
join pm_properties pp on pp.id = u.property_id and pp.active
left join lateral (
  select bb.*
  from pm_bookings bb
  where bb.unit_id = u.id and bb.active and bb.status in ('activo', 'reservada')
  order by (bb.status = 'activo') desc, bb.start_date desc nulls last
  limit 1
) b on true
left join pm_tenants t on t.id = b.tenant_id
where u.active and u.external_id like 'unit-rec%' and u.unit_type is not null;
alter view v_rentas_unidades set (security_invoker = on);

-- Reservas FUTURAS (para empalmes / ingresos programados del combinado)
create or replace view v_rentas_reservas_futuras as
select
  b.unit_id, b.property_id, pp.name as casa, pp.city,
  coalesce(nullif(btrim(u.name), ''), u.code, u.unit_type) as unidad,
  b.tenant_id, t.full_name as inquilino,
  b.start_date, b.end_date, coalesce(b.rent_amount, u.target_rent) as renta, b.status
from pm_bookings b
join pm_units u on u.id = b.unit_id and u.active
join pm_properties pp on pp.id = b.property_id and pp.active
left join pm_tenants t on t.id = b.tenant_id
where b.active and b.status = 'reservada' and b.start_date is not null;
alter view v_rentas_reservas_futuras set (security_invoker = on);

-- ─────────────────────────────────────────────────────────────
-- 2) MATRIZ DE CARTERA POR CORTE (§ anexo informe 2 y 3) — una definición.
--    Por inquilino: deuda por mes (bruta) + días de mora por schedule real (día de pago del inquilino),
--    neteo de saldos a favor (a favor primero), banda por saldo TOTAL del caso, mora máx.
-- ─────────────────────────────────────────────────────────────
create or replace function cartera_matriz(p_corte date)
returns table(
  tenant_id uuid, inquilino text, casa text, city text, dia_pago int,
  bruto numeric, a_favor numeric, neto numeric,
  por_mes jsonb, mora_max_dias int, banda text, mes_mas_viejo text, renta_actual numeric
)
language sql stable
set search_path to 'public'
as $fn$
  with base as (
    select p.tenant_id,
           t.full_name           as inquilino,
           pp.name               as casa,
           pp.city               as city,
           coalesce(t.dia_exacto_pago, 3) as dia,
           p.billing_ym          as ym,
           p.deuda,
           p.renta_pactada
    from pm_payments p
    left join pm_tenants t on t.id = p.tenant_id
    left join pm_properties pp on pp.id = p.property_id
    where p.active and p.deuda is not null and p.deuda <> 0
      and p.billing_ym <= to_char(p_corte, 'YYYY-MM')
  ),
  tot as (
    select tenant_id,
           max(inquilino) as inquilino, max(casa) as casa, max(city) as city, max(dia) as dia,
           coalesce(sum(deuda) filter (where deuda > 0), 0)                                    as bruto,
           coalesce(-sum(deuda) filter (where deuda < 0 and renta_pactada is not null), 0)     as a_favor,
           min(ym) filter (where deuda > 0)                                                    as mes_mas_viejo,
           max(renta_pactada) filter (where ym = to_char(p_corte, 'YYYY-MM'))                  as renta_actual
    from base group by tenant_id
  ),
  bym as (
    select tenant_id, ym, max(dia) as dia, sum(deuda) as deuda_ym
    from base group by tenant_id, ym
  ),
  mat as (
    select tenant_id,
           jsonb_object_agg(ym, jsonb_build_object(
             'deuda', round(deuda_ym, 2),
             'dias_mora', greatest(0, p_corte - (to_date(ym || '-01', 'YYYY-MM-DD') + (dia - 1) * interval '1 day')::date)
           )) filter (where deuda_ym > 0)                                                      as por_mes,
           max(greatest(0, p_corte - (to_date(ym || '-01', 'YYYY-MM-DD') + (dia - 1) * interval '1 day')::date))
             filter (where deuda_ym > 0)                                                       as mora_max_dias
    from bym group by tenant_id
  )
  select t.tenant_id, t.inquilino, t.casa, t.city, t.dia,
         round(t.bruto, 2), round(t.a_favor, 2), round(greatest(0, t.bruto - t.a_favor), 2) as neto,
         coalesce(m.por_mes, '{}'::jsonb), coalesce(m.mora_max_dias, 0),
         case when greatest(0, t.bruto - t.a_favor) >= 3000 then 'critico'
              when greatest(0, t.bruto - t.a_favor) >= 1000 then 'medio'
              when greatest(0, t.bruto - t.a_favor) >  0    then 'bajo'
              else 'cero' end as banda,
         t.mes_mas_viejo, t.renta_actual
  from tot t
  left join mat m using (tenant_id)
  where greatest(0, t.bruto - t.a_favor) > 0
  order by neto desc
$fn$;

-- ─────────────────────────────────────────────────────────────
-- 3) CONTRATOS POR VENCER (§5 informe 1) — reservas activas con fin dentro de N días.
-- ─────────────────────────────────────────────────────────────
create or replace function rentas_contratos_por_vencer(p_corte date, p_dias int default 90)
returns table(vence date, propiedad text, city text, unidad text, renta numeric, inquilino text, dias int, prioridad text)
language sql stable
set search_path to 'public'
as $fn$
  select b.end_date as vence, pp.name as propiedad, pp.city,
         coalesce(nullif(btrim(u.name), ''), u.code, u.unit_type) as unidad,
         coalesce(b.rent_amount, u.target_rent, t.rent_amount)    as renta,
         t.full_name as inquilino,
         (b.end_date - p_corte) as dias,
         case when b.end_date - p_corte <= 15 then 'ALTA'
              when b.end_date - p_corte <= 45 then 'MEDIA'
              else 'SEGUIM' end as prioridad
  from pm_bookings b
  join pm_units u on u.id = b.unit_id and u.active
  join pm_properties pp on pp.id = b.property_id and pp.active
  left join pm_tenants t on t.id = b.tenant_id
  where b.active and b.status = 'activo' and b.end_date is not null
    and b.end_date between p_corte and p_corte + p_dias
  order by b.end_date, propiedad
$fn$;

-- ─────────────────────────────────────────────────────────────
-- 4) TABLAS: snapshots inmutables + bandeja de informes
-- ─────────────────────────────────────────────────────────────
create table if not exists pm_cartera_snapshots (
  id             uuid primary key default gen_random_uuid(),
  corte          date not null,
  tipo           text not null default 'balance',   -- 'balance' | 'combinado'
  total_bruto    numeric,
  total_neto     numeric,
  casos          int,
  propiedades    int,
  concentracion_mes_pct   numeric,
  concentracion_mes_monto numeric,
  por_mes        jsonb   not null default '{}'::jsonb,   -- {'YYYY-MM': monto}
  casos_json     jsonb   not null default '[]'::jsonb,   -- [{tenant_id, inquilino, casa, neto, banda, renta_actual, mora_max_dias}]
  generado_por   text,
  created_at     timestamptz not null default now(),
  archived_at    timestamptz
);
create index if not exists idx_pm_cartera_snapshots_corte on pm_cartera_snapshots(corte) where archived_at is null;

create table if not exists pm_informes (
  id                  uuid primary key default gen_random_uuid(),
  tipo                text not null,            -- 'semanal' | 'balance' | 'combinado'
  corte               date not null,
  titulo              text,
  estado              text not null default 'borrador',  -- 'borrador' | 'emitido'
  origen              text not null default 'manual',    -- 'manual' | 'cron'
  payload             jsonb not null default '{}'::jsonb, -- data congelada + textos editables + deltas vs PDF manual
  cartera_snapshot_id uuid references pm_cartera_snapshots(id),
  storage_path        text,
  generado_por        text,
  emitido_por         text,
  emitido_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  archived_at         timestamptz
);
create index if not exists idx_pm_informes_bandeja on pm_informes(corte desc, created_at desc) where archived_at is null;

alter table pm_cartera_snapshots enable row level security;
alter table pm_informes         enable row level security;

drop policy if exists pcs_rw on pm_cartera_snapshots;
create policy pcs_rw on pm_cartera_snapshots for all
  using (has_area('rentas') or has_area('operacion') or has_area('contable'))
  with check (has_area('rentas') or has_area('operacion') or has_area('contable'));

drop policy if exists pinf_rw on pm_informes;
create policy pinf_rw on pm_informes for all
  using (has_area('rentas') or has_area('operacion') or has_area('contable'))
  with check (has_area('rentas') or has_area('operacion') or has_area('contable'));

grant select, insert, update on pm_cartera_snapshots to authenticated;
grant select, insert, update on pm_informes to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 5) GENERADOR ÚNICO — congela el payload e inserta en la bandeja (borrador editable).
--    La llaman el panel (botón Generar) y el pg_cron. SECURITY INVOKER: RLS aplica al usuario;
--    el pg_cron corre como owner y bypassa RLS. Devuelve la fila insertada (id + payload).
-- ─────────────────────────────────────────────────────────────
create or replace function rentas_generar_informe(p_tipo text, p_corte date default current_date, p_origen text default 'manual')
returns pm_informes
language plpgsql
set search_path to 'public'
as $fn$
declare
  v_mes        text := to_char(p_corte, 'YYYY-MM');
  v_actor      text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email', 'sistema');
  v_cartera    jsonb := '[]'::jsonb;
  v_ocup       jsonb := '{}'::jsonb;
  v_unidades   jsonb := '[]'::jsonb;
  v_contratos  jsonb := '[]'::jsonb;
  v_reservas   jsonb := '[]'::jsonb;
  v_por_mes    jsonb := '{}'::jsonb;
  v_total_bruto numeric := 0;
  v_total_neto  numeric := 0;
  v_casos int := 0; v_props int := 0;
  v_conc_monto numeric := 0; v_conc_pct numeric := 0;
  v_prev       pm_cartera_snapshots;
  v_snap_id    uuid;
  v_payload    jsonb;
  v_titulo     text;
  v_row        pm_informes;
  v_prev_casos jsonb := '[]'::jsonb;
begin
  -- ── Cartera (balance + combinado) ──
  if p_tipo in ('balance', 'combinado') then
    select coalesce(jsonb_agg(to_jsonb(cm) order by cm.neto desc), '[]'::jsonb),
           coalesce(sum(cm.bruto), 0), coalesce(sum(cm.neto), 0), count(*), count(distinct cm.casa)
      into v_cartera, v_total_bruto, v_total_neto, v_casos, v_props
    from cartera_matriz(p_corte) cm;

    -- totales por mes (bruto) para tendencia + concentración del mes de corte
    select coalesce(jsonb_object_agg(k, v), '{}'::jsonb)
      into v_por_mes
    from (
      select mes as k, round(sum((d->>'deuda')::numeric), 2) as v
      from jsonb_array_elements(v_cartera) c,
           lateral jsonb_each(c->'por_mes') as e(mes, d)
      group by mes
    ) s;
    v_conc_monto := coalesce((v_por_mes->>v_mes)::numeric, 0);
    v_conc_pct   := case when v_total_bruto > 0 then round(100.0 * v_conc_monto / v_total_bruto, 1) else 0 end;

    -- snapshot previo (para deltas NUEVO / RESUELTO / RENTA AUMENTADA)
    select * into v_prev from pm_cartera_snapshots
      where archived_at is null and corte < p_corte order by corte desc, created_at desc limit 1;
    if found then v_prev_casos := v_prev.casos_json; end if;

    -- insertar snapshot inmutable
    insert into pm_cartera_snapshots(corte, tipo, total_bruto, total_neto, casos, propiedades,
                                     concentracion_mes_pct, concentracion_mes_monto, por_mes, casos_json, generado_por)
    values (p_corte, p_tipo, round(v_total_bruto,2), round(v_total_neto,2), v_casos, v_props,
            v_conc_pct, v_conc_monto, v_por_mes,
            (select coalesce(jsonb_agg(jsonb_build_object(
                'tenant_id', c->>'tenant_id', 'inquilino', c->>'inquilino', 'casa', c->>'casa',
                'neto', (c->>'neto')::numeric, 'banda', c->>'banda',
                'renta_actual', c->'renta_actual', 'mora_max_dias', c->'mora_max_dias')), '[]'::jsonb)
             from jsonb_array_elements(v_cartera) c),
            v_actor)
    returning id into v_snap_id;
  end if;

  -- ── Ocupación + unidades (semanal + combinado) ──
  if p_tipo in ('semanal', 'combinado') then
    select to_jsonb(o) into v_ocup from v_ocupacion o;
    select coalesce(jsonb_agg(to_jsonb(u) order by u.casa, u.unidad), '[]'::jsonb) into v_unidades from v_rentas_unidades u;
    select coalesce(jsonb_agg(to_jsonb(r) order by r.start_date), '[]'::jsonb) into v_reservas from v_rentas_reservas_futuras r;
  end if;

  -- ── Contratos por vencer (semanal) ──
  if p_tipo = 'semanal' then
    select coalesce(jsonb_agg(to_jsonb(v) order by v.vence), '[]'::jsonb) into v_contratos from rentas_contratos_por_vencer(p_corte, 90) v;
  end if;

  v_titulo := case p_tipo
    when 'semanal'   then 'Informe Semanal de Ocupación y Gestión'
    when 'balance'   then 'Balance de Rentas — Avance del Proceso'
    when 'combinado' then 'Informe de Cartera Vencida + Estado General del Portafolio'
    else 'Informe de Rentas' end;

  v_payload := jsonb_build_object(
    'tipo', p_tipo, 'corte', p_corte, 'mes', v_mes, 'generado_por', v_actor,
    'cartera', v_cartera, 'por_mes', v_por_mes,
    'totales', jsonb_build_object('bruto', round(v_total_bruto,2), 'neto', round(v_total_neto,2),
                                  'casos', v_casos, 'propiedades', v_props,
                                  'conc_pct', v_conc_pct, 'conc_monto', v_conc_monto),
    'ocupacion', v_ocup, 'unidades', v_unidades, 'contratos', v_contratos, 'reservas', v_reservas,
    'prev_snapshot', case when v_prev.id is not null then jsonb_build_object(
        'corte', v_prev.corte, 'total_neto', v_prev.total_neto, 'casos', v_prev.casos,
        'propiedades', v_prev.propiedades, 'casos_json', v_prev_casos) else null end,
    -- textos EDITABLES por defecto (Carlos los ajusta antes de emitir)
    'editable', jsonb_build_object(
        'gestion_pm', '[]'::jsonb,      -- [{texto, estado}]
        'notas_unidades', '',
        'proximas_actividades', '[]'::jsonb,   -- [texto]
        'punto_mejora', '',
        'notas_casos', '')
  );

  insert into pm_informes(tipo, corte, titulo, estado, origen, payload, cartera_snapshot_id, generado_por)
  values (p_tipo, p_corte, v_titulo, 'borrador', p_origen, v_payload, v_snap_id, v_actor)
  returning * into v_row;

  return v_row;
end;
$fn$;

grant execute on function cartera_matriz(date) to authenticated;
grant execute on function rentas_contratos_por_vencer(date, int) to authenticated;
grant execute on function rentas_generar_informe(text, date, text) to authenticated;
