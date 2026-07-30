-- ════════════════════════════════════════════════════════════════
-- 📊 INFORMES DE RENTAS · enriquecimiento del generador (29-jul-2026)
-- Agrega al payload todo lo que los 3 informes necesitan para renderizar SIN más queries:
-- derivados de ocupación (activas/efectiva/ingreso contratado/potencial), movimientos de la
-- semana, serie de cortes (franja de avance), discrepancias detectadas, delta de ingreso semanal.
-- ADITIVA: solo create or replace de la función generadora.
-- ════════════════════════════════════════════════════════════════
create or replace function rentas_generar_informe(p_tipo text, p_corte date default current_date, p_origen text default 'manual')
returns pm_informes
language plpgsql
set search_path to 'public'
as $fn$
declare
  v_mes         text := to_char(p_corte, 'YYYY-MM');
  v_actor       text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email', 'sistema');
  v_cartera     jsonb := '[]'::jsonb;
  v_por_mes     jsonb := '{}'::jsonb;
  v_total_bruto numeric := 0; v_total_neto numeric := 0; v_afav numeric := 0;
  v_casos int := 0; v_props int := 0; v_ciudades int := 0;
  v_conc_monto numeric := 0; v_conc_pct numeric := 0;
  v_prev        pm_cartera_snapshots; v_prev_json jsonb := null; v_snap_id uuid; v_serie jsonb := '[]'::jsonb;
  v_ocup        jsonb := '{}'::jsonb; v_ocupd jsonb := '{}'::jsonb;
  v_unidades    jsonb := '[]'::jsonb; v_reservas jsonb := '[]'::jsonb;
  v_contratos   jsonb := '[]'::jsonb; v_mov jsonb := '{}'::jsonb; v_discr jsonb := '[]'::jsonb;
  v_delta       jsonb := null;
  v_ingreso numeric := 0; v_potencial numeric := 0; v_activas int := 0; v_prev_ingreso numeric;
  v_ocup_detalle int := 0;
  v_payload jsonb; v_titulo text; v_row pm_informes;
begin
  -- ══════════ CARTERA (balance + combinado) ══════════
  if p_tipo in ('balance', 'combinado') then
    select coalesce(jsonb_agg(to_jsonb(cm) order by cm.neto desc), '[]'::jsonb),
           coalesce(sum(cm.bruto), 0), coalesce(sum(cm.neto), 0), coalesce(sum(cm.a_favor), 0),
           count(*), count(distinct cm.casa)
      into v_cartera, v_total_bruto, v_total_neto, v_afav, v_casos, v_props
    from cartera_matriz(p_corte) cm;

    select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) into v_por_mes from (
      select mes as k, round(sum((d->>'deuda')::numeric), 2) as v
      from jsonb_array_elements(v_cartera) c, lateral jsonb_each(c->'por_mes') as e(mes, d)
      group by mes) s;
    v_conc_monto := coalesce((v_por_mes->>v_mes)::numeric, 0);
    v_conc_pct   := case when v_total_bruto > 0 then round(100.0 * v_conc_monto / v_total_bruto, 1) else 0 end;

    select * into v_prev from pm_cartera_snapshots where archived_at is null and corte < p_corte order by corte desc, created_at desc limit 1;
    if found then
      v_prev_json := jsonb_build_object('corte', v_prev.corte, 'total_neto', v_prev.total_neto, 'total_bruto', v_prev.total_bruto,
                                        'casos', v_prev.casos, 'propiedades', v_prev.propiedades, 'casos_json', v_prev.casos_json);
    end if;

    insert into pm_cartera_snapshots(corte, tipo, total_bruto, total_neto, casos, propiedades,
                                     concentracion_mes_pct, concentracion_mes_monto, por_mes, casos_json, generado_por)
    values (p_corte, p_tipo, round(v_total_bruto,2), round(v_total_neto,2), v_casos, v_props, v_conc_pct, v_conc_monto, v_por_mes,
            (select coalesce(jsonb_agg(jsonb_build_object('tenant_id', c->>'tenant_id', 'inquilino', c->>'inquilino', 'casa', c->>'casa',
                'neto', (c->>'neto')::numeric, 'banda', c->>'banda', 'renta_actual', c->'renta_actual', 'mora_max_dias', c->'mora_max_dias')), '[]'::jsonb)
             from jsonb_array_elements(v_cartera) c),
            v_actor)
    returning id into v_snap_id;

    select coalesce(jsonb_agg(to_jsonb(s) order by s.corte), '[]'::jsonb) into v_serie from (
      select corte, total_bruto, total_neto, casos, propiedades
      from pm_cartera_snapshots where archived_at is null and corte <= p_corte order by corte desc, created_at desc limit 4) s;

    if v_afav > 0 then
      v_discr := v_discr || jsonb_build_object('label', 'Saldos a favor neteados', 'verificado', round(v_afav,2),
        'fuente', 'cartera_matriz — neteo por inquilino',
        'detalle', 'El OS netea los adelantos antes de clasificar mora (a favor cubre lo vencido primero). El informe manual sumaba el bruto sin netear.');
    end if;
  end if;

  -- ══════════ OCUPACIÓN + UNIDADES (semanal + combinado) ══════════
  if p_tipo in ('semanal', 'combinado') then
    select to_jsonb(o) into v_ocup from v_ocupacion o;
    select coalesce(jsonb_agg(to_jsonb(u) order by u.casa, u.unidad), '[]'::jsonb) into v_unidades from v_rentas_unidades u;
    select coalesce(jsonb_agg(to_jsonb(r) order by r.start_date), '[]'::jsonb) into v_reservas from v_rentas_reservas_futuras r;

    select coalesce(sum(coalesce(renta, target_rent)) filter (where status = 'ocupada'), 0),
           coalesce(sum(coalesce(target_rent, renta)) filter (where status in ('disponible', 'mantenimiento')), 0),
           count(*) filter (where status <> 'mantenimiento'),
           count(distinct casa), count(distinct city),
           count(*) filter (where status = 'ocupada')
      into v_ingreso, v_potencial, v_activas, v_props, v_ciudades, v_ocup_detalle
    from v_rentas_unidades;

    v_ocupd := jsonb_build_object(
      'activas', v_activas,
      'ocup_activas_pct', case when v_activas > 0 then round(100.0 * (v_ocup->>'ocupadas')::numeric / v_activas, 1) else 0 end,
      'ocup_efectiva_pct', case when (v_ocup->>'unidades_rentables')::numeric > 0
          then round(100.0 * ((v_ocup->>'ocupadas')::numeric + (v_ocup->>'reservadas')::numeric) / (v_ocup->>'unidades_rentables')::numeric, 1) else 0 end,
      'propiedades', v_props, 'ciudades', v_ciudades,
      'ingreso_contratado', round(v_ingreso, 2), 'potencial_no_capturado', round(v_potencial, 2));

    -- movimientos de la semana
    v_mov := jsonb_build_object(
      'entradas', (select coalesce(jsonb_agg(jsonb_build_object('casa', pp.name, 'unidad', coalesce(nullif(btrim(u.name),''), u.code), 'inquilino', t.full_name, 'fecha', b.start_date) order by b.start_date), '[]'::jsonb)
        from pm_bookings b join pm_units u on u.id=b.unit_id join pm_properties pp on pp.id=b.property_id left join pm_tenants t on t.id=b.tenant_id
        where b.active and b.start_date between p_corte - 6 and p_corte),
      'salidas', (select coalesce(jsonb_agg(jsonb_build_object('casa', pp.name, 'unidad', coalesce(nullif(btrim(u.name),''), u.code), 'inquilino', t.full_name, 'fecha', b.end_date) order by b.end_date), '[]'::jsonb)
        from pm_bookings b join pm_units u on u.id=b.unit_id join pm_properties pp on pp.id=b.property_id left join pm_tenants t on t.id=b.tenant_id
        where b.active and b.end_date between p_corte - 6 and p_corte),
      'pagos_n', (select count(*) from pm_payments where active and paid_at between p_corte - 6 and p_corte and coalesce(type,'ingreso') <> 'gasto'),
      'pagos_monto', (select coalesce(sum(amount),0) from pm_payments where active and paid_at between p_corte - 6 and p_corte and coalesce(type,'ingreso') <> 'gasto'));

    -- discrepancia resumen vs detalle (el caso del PDF: 43 vs 42)
    if (v_ocup->>'ocupadas')::int <> v_ocup_detalle then
      v_discr := v_discr || jsonb_build_object('label', 'Conteo de unidades ocupadas', 'verificado', v_ocup_detalle,
        'fuente', 'v_rentas_unidades (detalle) vs v_ocupacion (resumen)',
        'detalle', 'El resumen dice ' || (v_ocup->>'ocupadas') || ' y el detalle suma ' || v_ocup_detalle || '. Se reporta la cifra del detalle verificado.');
    end if;
  end if;

  -- ══════════ CONTRATOS POR VENCER + delta ingreso (semanal) ══════════
  if p_tipo = 'semanal' then
    select coalesce(jsonb_agg(to_jsonb(v) order by v.vence), '[]'::jsonb) into v_contratos from rentas_contratos_por_vencer(p_corte, 90) v;
    select (payload->'ocup_derivado'->>'ingreso_contratado')::numeric into v_prev_ingreso
      from pm_informes where tipo='semanal' and archived_at is null and corte < p_corte order by corte desc, created_at desc limit 1;
    if v_prev_ingreso is not null then
      v_delta := jsonb_build_object('prev_ingreso', v_prev_ingreso, 'delta', round(v_ingreso - v_prev_ingreso, 2));
    end if;
  end if;

  v_titulo := case p_tipo
    when 'semanal'   then 'Informe Semanal de Ocupación y Gestión'
    when 'balance'   then 'Balance de Rentas — Avance del Proceso'
    when 'combinado' then 'Informe de Cartera Vencida + Estado General del Portafolio'
    else 'Informe de Rentas' end;

  v_payload := jsonb_build_object(
    'tipo', p_tipo, 'corte', p_corte, 'mes', v_mes, 'generado_por', v_actor,
    'cartera', v_cartera, 'por_mes', v_por_mes, 'serie', v_serie,
    'totales', jsonb_build_object('bruto', round(v_total_bruto,2), 'neto', round(v_total_neto,2), 'a_favor', round(v_afav,2),
                                  'casos', v_casos, 'propiedades', v_props, 'conc_pct', v_conc_pct, 'conc_monto', v_conc_monto),
    'prev_snapshot', v_prev_json,
    'ocupacion', v_ocup, 'ocup_derivado', v_ocupd, 'unidades', v_unidades, 'reservas', v_reservas,
    'contratos', v_contratos, 'movimientos', v_mov, 'discrepancias', v_discr, 'delta_ingreso', v_delta,
    'editable', jsonb_build_object('gestion_pm', '[]'::jsonb, 'notas_unidades', '', 'proximas_actividades', '[]'::jsonb, 'punto_mejora', '', 'notas_casos', ''));

  insert into pm_informes(tipo, corte, titulo, estado, origen, payload, cartera_snapshot_id, generado_por)
  values (p_tipo, p_corte, v_titulo, 'borrador', p_origen, v_payload, v_snap_id, v_actor)
  returning * into v_row;

  return v_row;
end;
$fn$;
