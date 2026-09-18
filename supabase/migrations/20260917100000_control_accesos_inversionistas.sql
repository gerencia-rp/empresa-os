-- ================================================================
-- CONTROL DE ACCESOS DEL PORTAL DE INVERSIONISTAS (17-sep-2026)
--
-- EL HUECO QUE SE CIERRA
-- ----------------------
-- Las funciones y policies del portal traen la rama de STAFF INTERNO:
--     (has_area('fix-flip') and not public.inv_is_investor())
-- ...para que el equipo vea TODAS las casas. Pero `inv_is_investor()` exigia
-- estado='activo', asi que un inversionista PAUSADO o REVOCADO que ademas tuviera
-- un area de staff en su profile caia en esa rama y volvia a ver TODO el portafolio.
-- Caso real: juan.sanchez49115@gmail.com quedo 'revocado' con allowed_areas={fix-flip}.
--
-- COMO SE CIERRA (una sola definicion, sin reescribir 24 policies)
-- ----------------------------------------------------------------
-- `inv_is_investor()` pasa a significar: "tiene fila en inv_access" - sin importar
-- el estado (invitado/activo/pausado/revocado) ni `active`. Con eso, toda la superficie
-- que ya usa `not inv_is_investor()` (3 funciones + 24 policies RLS) queda cerrada de
-- una sola vez. Dos excepciones EXPLICITAS, no inferidas:
--   * `inv_access.es_equipo = true`  -> cuenta del EQUIPO que ademas figura como
--     inversionista (info.flippingrentals@gmail.com). Sigue viendo todo. Decision del CEO.
--   * `inv_es_admin()` (profiles.role='admin') -> el admin real SIEMPRE ve todo.
--
-- PROPERTY_FILTER (hasta hoy sin usar)
-- ------------------------------------
-- `inv_access.property_filter` = array JSON de property_id (uuid en texto). Si trae
-- elementos, la visibilidad del inversionista se RESTRINGE a esa lista (interseccion con
-- sus holdings). null / [] = todas sus casas (comportamiento actual). Se cablea en
-- `inv_my_props()`, que es de donde cuelgan ledger, params, movimientos, documentos,
-- proyecciones y overrides; + parche puntual en inv_portal_resumen / inv_holdings_read /
-- inv_dist_read, que leen por investor_airtable_id y no pasaban por inv_my_props().
--
-- MUTACIONES: solo por RPC SECURITY DEFINER con guard inv_es_admin(). Nunca borrado
-- fisico: revocar = estado='revocado' + active=false (la fila queda para auditoria).
--
-- ROLLBACK: supabase/rollbacks/20260917100000_control_accesos_inversionistas_rollback.sql
-- ================================================================

-- -----------------------------------------------------------------
-- 1) estado 'pausado': la UI lo necesita y el CHECK no lo permitia
-- -----------------------------------------------------------------
alter table public.inv_access drop constraint if exists inv_access_estado_check;
alter table public.inv_access add constraint inv_access_estado_check
  check (estado = any (array['invitado','activo','pausado','revocado']));

-- -----------------------------------------------------------------
-- 2) es_equipo: marca EXPLICITA de cuenta del equipo
-- -----------------------------------------------------------------
alter table public.inv_access add column if not exists es_equipo boolean not null default false;
comment on column public.inv_access.es_equipo is
  'true = cuenta del EQUIPO que ademas figura como inversionista: NO cuenta como inversionista para inv_is_investor(), asi conserva la visibilidad completa del staff. Se prende a mano desde el panel de admin y queda auditado. Default false: toda fila nueva es inversionista.';
comment on column public.inv_access.property_filter is
  'Array JSON de property_id (uuid como texto) al que se RESTRINGE este acceso, dentro de sus holdings. null o [] = todas sus casas. Se aplica en inv_my_props()/inv_props_de().';

-- -----------------------------------------------------------------
-- 3) inv_is_investor(): cualquier fila de inv_access cuenta
-- -----------------------------------------------------------------
create or replace function public.inv_is_investor()
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  -- El admin real nunca queda limitado (y asi funciona "cambiar rol -> Admin (todo)").
  select (not public.inv_es_admin())
     and exists (
       select 1 from inv_access ia
        where ia.user_id = auth.uid()
          and not coalesce(ia.es_equipo, false)
     );
$function$;
comment on function public.inv_is_investor() is
  'true = este usuario tiene una fila de inversionista en inv_access (cualquier estado: invitado, activo, pausado o revocado) y no es admin real ni cuenta marcada es_equipo. Se usa NEGADA en las policies/funciones para decidir quien ve TODO el portafolio. Ampliada el 17-sep-2026: antes exigia estado=activo, y un revocado/pausado con area de staff volvia a ver todas las casas.';

-- -----------------------------------------------------------------
-- 4) property_filter cableado
-- -----------------------------------------------------------------
-- casas efectivas de UN investor_airtable_id (holdings interseccion property_filter)
create or replace function public.inv_props_de(p_inv text)
 returns setof uuid
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select distinct h.property_id
  from inv_holdings h
  where h.active and h.investor_airtable_id = p_inv
    and not exists (
      select 1 from inv_access a
       where a.investor_airtable_id = p_inv and a.active
         and a.property_filter is not null
         and jsonb_typeof(a.property_filter) = 'array'
         and jsonb_array_length(a.property_filter) > 0
         and not exists (
           select 1 from jsonb_array_elements_text(a.property_filter) f(v)
            where f.v = h.property_id::text
         )
    );
$function$;
comment on function public.inv_props_de(text) is
  'Casas que realmente ve un investor_airtable_id = sus holdings activos, restringidos por el property_filter de su acceso (si lo tiene). Sin filtro = todos sus holdings.';

-- casas del USUARIO logueado (lo que ya usaban ledger, params, docs, proyecciones...)
create or replace function public.inv_my_props()
 returns setof uuid
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select distinct h.property_id
  from inv_access a
  join inv_holdings h
    on h.investor_airtable_id = a.investor_airtable_id and h.active
  where a.user_id = auth.uid() and a.active and a.estado = 'activo'
    and (
      a.property_filter is null
      or jsonb_typeof(a.property_filter) <> 'array'
      or jsonb_array_length(a.property_filter) = 0
      or exists (
        select 1 from jsonb_array_elements_text(a.property_filter) f(v)
         where f.v = h.property_id::text
      )
    );
$function$;
comment on function public.inv_my_props() is
  'Casas visibles del usuario logueado: holdings de sus accesos ACTIVOS, restringidos por el property_filter de cada acceso. Pausado/revocado -> no devuelve nada.';

-- -----------------------------------------------------------------
-- 5) contexto de acceso para el front (Tarea B: routing admin vs portal)
-- -----------------------------------------------------------------
create or replace function public.inv_contexto_acceso()
 returns jsonb
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select jsonb_build_object(
    'user_id',          auth.uid(),
    'es_admin',         public.inv_es_admin(),
    'es_inversionista', public.inv_is_investor(),
    'tiene_acceso_inv', exists (select 1 from inv_access ia where ia.user_id = auth.uid()),
    'es_equipo',        exists (select 1 from inv_access ia where ia.user_id = auth.uid() and ia.es_equipo),
    'estado',           (select ia.estado from inv_access ia
                          where ia.user_id = auth.uid() and not coalesce(ia.es_equipo, false)
                          order by (ia.estado = 'activo') desc, ia.updated_at desc limit 1),
    'casas',            (select count(*)::int from public.inv_my_props() x)
  );
$function$;
comment on function public.inv_contexto_acceso() is
  'Quien soy para el portal: es_admin (profiles.role=admin), es_inversionista (tengo fila en inv_access), es_equipo, estado del acceso y cuantas casas veo. El front rutea con esto y NO con allowed_areas, que es solo gating de UI.';
-- Grants finos: inv_props_de toma un investor_airtable_id ARBITRARIO, asi que con EXECUTE
-- para PUBLIC un anonimo podria enumerar las casas de cualquier inversionista. Solo la usan
-- otras funciones SECURITY DEFINER (corren como owner): no necesita grant a nadie.
revoke execute on function public.inv_props_de(text) from public, anon, authenticated;
revoke execute on function public.inv_contexto_acceso() from public, anon;
grant execute on function public.inv_contexto_acceso() to authenticated;

-- -----------------------------------------------------------------
-- 6) RLS: las dos policies que leen por investor_airtable_id
--    (el resto ya pasa por inv_my_props() y hereda el filtro)
-- -----------------------------------------------------------------
drop policy if exists inv_holdings_read on public.inv_holdings;
create policy inv_holdings_read on public.inv_holdings for select
  using (
    (investor_airtable_id in (select public.inv_my_ids())
      and property_id in (select public.inv_my_props()))
    or (public.has_area('fix-flip') and not public.inv_is_investor())
  );

drop policy if exists inv_dist_read on public.inv_distributions;
create policy inv_dist_read on public.inv_distributions for select
  using (
    (investor_airtable_id in (select public.inv_my_ids())
      and (property_id is null or property_id in (select public.inv_my_props())))
    or (public.has_area('fix-flip') and not public.inv_is_investor())
  );

-- -----------------------------------------------------------------
-- 7) inv_portal_resumen: mismo cuerpo de 20260827150000; UNICO cambio =
--    la rama del inversionista del CTE `mias` tambien respeta property_filter
--    (esta funcion lee por investor_airtable_id, no pasa por inv_my_props()).
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.inv_portal_resumen()
 RETURNS TABLE(property_id uuid, casa text, etapa text, lider text, avance_planner numeric, invertido numeric, fecha_entrada date, meses_invertido integer, ingresos_renta numeric, gastos_operativos numeric, interes_hml numeric, flujo_neto numeric, flujo_ult_mes numeric, flujo_ult_mes_ym text, deficit numeric, deficit_desglose jsonb, fecha_estimada_pago date, fecha_pago_fuente text, proxima_dist_fecha date, proxima_dist_monto numeric, ultima_dist_fecha date, ultima_dist_monto numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with mias as (
    select h.property_id,
           sum(h.inversion_aportada) as invertido,
           min(h.fecha_entrada) as fecha_entrada
    from inv_holdings h
    where h.active
      and ((h.investor_airtable_id in (select public.inv_my_ids())
            and h.property_id in (select public.inv_my_props()))
           or (public.has_area('fix-flip') and not public.inv_is_investor()))
    group by 1
  ), pnl as (
    select p.property_id, p.ingresos_renta, p.gastos_operativos, p.interes_hml_real,
           p.utilidad_neta_post_interes
    from v_pnl_casa p
  ), defx as (
    select d.property_id, max(d.deficit_total) as deficit_total
    from ff_deals d
    where d.active and d.property_id is not null
    group by 1
  ), hmlx as (
    select distinct on (d.property_id) d.property_id, l.fecha_inicio, l.fecha_vencimiento, l.fecha_refi
    from ff_deals d join ff_hml_loans l on l.address_norm = d.address_norm and l.active
    where d.active and d.property_id is not null
    order by d.property_id, l.fecha_inicio desc nulls last
  ), cal as (
    select coalesce(holding_meses_prom, 6) as hold_m from v_supuestos_calibrados
  ), ultm as (
    -- renta - gastos operativos - servicio de deuda, del ultimo mes CONTABLE con movimiento.
    -- El servicio de deuda ya es categoria 'operativo': se EXCLUYE del bucket operativo para
    -- restarlo una sola vez (anti doble conteo).
    select m.property_id, l.mes as billing_ym, l.neto
    from mias m
    cross join lateral (
      select g.mes,
             round(
               coalesce(sum(g.monto) filter (where g.categoria = 'renta' and g.tipo = 'ingreso'), 0)
             - coalesce(sum(g.monto) filter (where g.categoria = 'operativo' and g.tipo = 'gasto'
                                               and coalesce(g.subcategoria,'') <> 'servicio_deuda'), 0)
             - coalesce(sum(g.monto) filter (where g.subcategoria = 'servicio_deuda'), 0)
             , 2) as neto
        from public.inv_ledger(m.property_id) g
       where g.mes ~ '^[0-9]{4}-[0-9]{2}$'
         and g.fecha <= current_date
         and (g.categoria in ('renta', 'operativo') or g.subcategoria = 'servicio_deuda')
       group by g.mes
       order by g.mes desc
       limit 1
    ) l
  ), dist as (
    select dd.property_id,
           min(dd.fecha) filter (where dd.fecha >= current_date and dd.estado <> 'pagada') as prox_fecha,
           (array_agg(dd.monto order by dd.fecha) filter (where dd.fecha >= current_date and dd.estado <> 'pagada'))[1] as prox_monto,
           max(dd.fecha) filter (where dd.estado = 'pagada') as ult_fecha,
           (array_agg(dd.monto order by dd.fecha desc) filter (where dd.estado = 'pagada'))[1] as ult_monto
    from inv_distributions dd
    where dd.active
    group by 1
  )
  select
    m.property_id, p360.casa, p360.etapa, p360.lider, p360.avance_planner,
    round(m.invertido::numeric, 2), m.fecha_entrada,
    case when m.fecha_entrada is null then null
         else (extract(year from age(current_date, m.fecha_entrada)) * 12
             + extract(month from age(current_date, m.fecha_entrada)))::int end,
    pnl.ingresos_renta, pnl.gastos_operativos, pnl.interes_hml_real, pnl.utilidad_neta_post_interes,
    ultm.neto, ultm.billing_ym,
    greatest(0, coalesce(defx.deficit_total, 0)),
    jsonb_build_object(
      'deficit_total', defx.deficit_total,
      'ingresos_renta', pnl.ingresos_renta,
      'gastos_operativos', pnl.gastos_operativos,
      'interes_hml', pnl.interes_hml_real,
      'flujo_ult_mes_fuente', 'inv_ledger: renta - gastos operativos - servicio de deuda (una sola vez)',
      'fuente', 'deficit acumulado = ff_deals.deficit_total (Airtable, caja atrapada); renta/gastos/interes = v_pnl_casa (contexto operativo del periodo)'
    ),
    case when h.fecha_refi is not null then h.fecha_refi
         when p360.etapa like '%refinanciad%' or p360.etapa = 'vendida' then null
         when h.fecha_inicio is not null then (h.fecha_inicio + (select (hold_m * interval '1 month') from cal))::date
         else null end,
    case when h.fecha_refi is not null then 'refi hecha (Airtable)'
         when p360.etapa like '%refinanciad%' or p360.etapa = 'vendida' then 'refi/venta ya realizada (fecha sin espejar en Airtable)'
         when h.fecha_inicio is not null then 'estimada: inicio HML + holding calibrado (historia real)'
         else 'sin prestamo HML espejado' end,
    dist.prox_fecha, dist.prox_monto, dist.ult_fecha, dist.ult_monto
  from mias m
  left join v_property_360 p360 on p360.property_id = m.property_id
  left join pnl on pnl.property_id = m.property_id
  left join defx on defx.property_id = m.property_id
  left join hmlx h on h.property_id = m.property_id
  left join ultm on ultm.property_id = m.property_id
  left join dist dist on dist.property_id = m.property_id
$function$;

-- -----------------------------------------------------------------
-- 8) inv_portal_resumen_de ("ver como inversionista", admin): mismo cuerpo,
--    UNICO cambio = tambien respeta el property_filter del inversionista,
--    para que el admin vea EXACTAMENTE lo que ve el inversionista.
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.inv_portal_resumen_de(p_inv text)
 RETURNS TABLE(property_id uuid, casa text, etapa text, lider text, avance_planner numeric, invertido numeric, fecha_entrada date, meses_invertido integer, ingresos_renta numeric, gastos_operativos numeric, interes_hml numeric, flujo_neto numeric, flujo_ult_mes numeric, flujo_ult_mes_ym text, deficit numeric, deficit_desglose jsonb, fecha_estimada_pago date, fecha_pago_fuente text, proxima_dist_fecha date, proxima_dist_monto numeric, ultima_dist_fecha date, ultima_dist_monto numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with gate as (select 1 where public.inv_es_admin()),
  mias as (
    select h.property_id, sum(h.inversion_aportada) as invertido, min(h.fecha_entrada) as fecha_entrada
    from gate, inv_holdings h
    where h.active and h.investor_airtable_id = p_inv
      and h.property_id in (select public.inv_props_de(p_inv))
    group by h.property_id
  ), pnl as (
    select p.property_id, p.ingresos_renta, p.gastos_operativos, p.interes_hml_real, p.utilidad_neta_post_interes from v_pnl_casa p
  ), hmlx as (
    select distinct on (d.property_id) d.property_id, l.fecha_inicio, l.fecha_vencimiento, l.fecha_refi
    from ff_deals d join ff_hml_loans l on l.address_norm = d.address_norm and l.active
    where d.active and d.property_id is not null
    order by d.property_id, l.fecha_inicio desc nulls last
  ), cal as (
    select coalesce(holding_meses_prom, 6) as hold_m from v_supuestos_calibrados
  ), ultm as (
    select m.property_id, l.mes as billing_ym, l.neto
    from mias m
    cross join lateral (
      select g.mes,
             round(
               coalesce(sum(g.monto) filter (where g.categoria = 'renta' and g.tipo = 'ingreso'), 0)
             - coalesce(sum(g.monto) filter (where g.categoria = 'operativo' and g.tipo = 'gasto'
                                               and coalesce(g.subcategoria,'') <> 'servicio_deuda'), 0)
             - coalesce(sum(g.monto) filter (where g.subcategoria = 'servicio_deuda'), 0)
             , 2) as neto
        from public.inv_ledger(m.property_id) g
       where g.mes ~ '^[0-9]{4}-[0-9]{2}$'
         and g.fecha <= current_date
         and (g.categoria in ('renta', 'operativo') or g.subcategoria = 'servicio_deuda')
       group by g.mes
       order by g.mes desc
       limit 1
    ) l
  ), dist as (
    select dd.property_id,
           min(dd.fecha) filter (where dd.fecha >= current_date and dd.estado <> 'pagada') as prox_fecha,
           (array_agg(dd.monto order by dd.fecha) filter (where dd.fecha >= current_date and dd.estado <> 'pagada'))[1] as prox_monto,
           max(dd.fecha) filter (where dd.estado = 'pagada') as ult_fecha,
           (array_agg(dd.monto order by dd.fecha desc) filter (where dd.estado = 'pagada'))[1] as ult_monto
    from inv_distributions dd where dd.active
    group by 1
  )
  select m.property_id, p360.casa, p360.etapa, p360.lider, p360.avance_planner,
    round(m.invertido::numeric, 2), m.fecha_entrada,
    case when m.fecha_entrada is null then null
         else (extract(year from age(current_date, m.fecha_entrada)) * 12 + extract(month from age(current_date, m.fecha_entrada)))::int end,
    pnl.ingresos_renta, pnl.gastos_operativos, pnl.interes_hml_real, pnl.utilidad_neta_post_interes,
    ultm.neto, ultm.billing_ym,
    greatest(0, -coalesce(pnl.utilidad_neta_post_interes, 0)),
    jsonb_build_object('ingresos_renta', pnl.ingresos_renta, 'gastos_operativos', pnl.gastos_operativos, 'interes_hml', pnl.interes_hml_real, 'flujo_ult_mes_fuente', 'inv_ledger: renta - gastos operativos - servicio de deuda (una sola vez)', 'fuente', 'v_pnl_casa (Rentas + HML espejo Airtable)'),
    case when h.fecha_refi is not null then h.fecha_refi
         when p360.etapa like '%refinanciad%' or p360.etapa = 'vendida' then null
         when h.fecha_inicio is not null then (h.fecha_inicio + (select (hold_m * interval '1 month') from cal))::date
         else null end,
    case when h.fecha_refi is not null then 'refi hecha (Airtable)'
         when p360.etapa like '%refinanciad%' or p360.etapa = 'vendida' then 'refi/venta ya realizada (fecha sin espejar en Airtable)'
         when h.fecha_inicio is not null then 'estimada: inicio HML + holding calibrado (historia real)'
         else 'sin prestamo HML espejado' end,
    dist.prox_fecha, dist.prox_monto, dist.ult_fecha, dist.ult_monto
  from mias m
  left join v_property_360 p360 on p360.property_id = m.property_id
  left join pnl on pnl.property_id = m.property_id
  left join hmlx h on h.property_id = m.property_id
  left join ultm on ultm.property_id = m.property_id
  left join dist on dist.property_id = m.property_id
$function$;

-- -----------------------------------------------------------------
-- 9) PANEL DE ADMIN: lectura enriquecida + mutaciones por RPC
--    Lectura: staff fix-flip o admin. Mutaciones: SOLO inv_es_admin().
--    Nunca hay borrado fisico: revocar = estado='revocado' + active=false.
-- -----------------------------------------------------------------
create or replace function public.inv_admin_guard()
 returns void
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
begin
  if not public.inv_es_admin() then
    raise exception 'Solo un administrador puede cambiar accesos del portal de inversionistas'
      using errcode = '42501';
  end if;
end
$function$;

-- Lista de accesos con TODO lo que el CEO necesita para detectar quien ve de mas:
-- estado, rol, es_equipo, rol/areas del profile y las casas que realmente ve.
create or replace function public.inv_admin_accesos()
 returns table(
   id uuid, email text, nombre text, estado text, rol text, active boolean, es_equipo boolean,
   origen text, investor_airtable_id text, user_id uuid, claimed_at timestamptz,
   created_by text, updated_at timestamptz, property_filter jsonb,
   profile_role text, profile_areas text[], profile_active boolean,
   casas jsonb, casas_todas jsonb)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select a.id, a.email, a.nombre, a.estado, a.rol, a.active, coalesce(a.es_equipo, false),
         a.origen, a.investor_airtable_id, a.user_id, a.claimed_at,
         a.created_by, a.updated_at, a.property_filter,
         p.role, p.allowed_areas, p.active,
         -- casas que VE hoy (holdings interseccion property_filter)
         (select coalesce(jsonb_agg(jsonb_build_object('property_id', x.pid, 'casa', x.casa)
                                    order by x.casa), '[]'::jsonb)
            from (select h.property_id as pid,
                         coalesce(nullif(split_part(dd.address, ',', 1), ''), h.property_id::text) as casa
                    from inv_holdings h
                    left join lateral (select d.address from ff_deals d
                                        where d.property_id = h.property_id and d.active limit 1) dd on true
                   where h.active and h.investor_airtable_id = a.investor_airtable_id
                     and h.property_id in (select public.inv_props_de(a.investor_airtable_id))) x),
         -- todas sus casas (holdings sin filtro) = universo para el editor de casas
         (select coalesce(jsonb_agg(jsonb_build_object('property_id', y.pid, 'casa', y.casa)
                                    order by y.casa), '[]'::jsonb)
            from (select h.property_id as pid,
                         coalesce(nullif(split_part(dd.address, ',', 1), ''), h.property_id::text) as casa
                    from inv_holdings h
                    left join lateral (select d.address from ff_deals d
                                        where d.property_id = h.property_id and d.active limit 1) dd on true
                   where h.active and h.investor_airtable_id = a.investor_airtable_id) y)
  from inv_access a
  left join profiles p on p.id = a.user_id
  where public.inv_es_admin()
     or (public.has_area('fix-flip') and not public.inv_is_investor())
  order by (a.estado = 'activo') desc, lower(coalesce(a.nombre, a.email));
$function$;
comment on function public.inv_admin_accesos() is
  'Accesos al portal con estado, rol, es_equipo, rol/areas del profile y las casas que realmente ve cada uno. Incluye los revocados (active=false), que la consulta directa del panel no traia. Lectura: staff fix-flip o admin.';

-- PAUSAR / REACTIVAR / REVOCAR. Pausado y revocado ademas CORTAN el staff del profile
-- (areas vacias y rol no-admin), que era justo lo que dejaba ver todo al revocado.
create or replace function public.inv_admin_set_estado(p_access_id uuid, p_estado text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare a inv_access; who text; areas_antes text[]; rol_antes text; corto boolean := false;
begin
  perform public.inv_admin_guard();
  if p_estado not in ('activo','pausado','revocado') then
    raise exception 'Estado invalido: % (validos: activo, pausado, revocado)', p_estado;
  end if;
  select * into a from inv_access where id = p_access_id;
  if not found then raise exception 'Acceso no encontrado'; end if;
  who := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email', 'service');

  update inv_access
     set estado      = p_estado,
         active      = (p_estado <> 'revocado'),
         archived_at = case when p_estado = 'revocado' then now() else null end
   where id = p_access_id;

  -- cortar de verdad: mientras no este activo, sin areas de staff ni rol admin.
  -- Las cuentas marcadas es_equipo NO se tocan (son del equipo, no inversionistas).
  if p_estado in ('pausado','revocado') and a.user_id is not null and not coalesce(a.es_equipo, false) then
    select pr.allowed_areas, pr.role into areas_antes, rol_antes from profiles pr where pr.id = a.user_id;
    if coalesce(array_length(areas_antes, 1), 0) > 0 or rol_antes = 'admin' then
      update profiles
         set allowed_areas = '{}'::text[],
             role = case when role = 'admin' then 'viewer' else role end
       where id = a.user_id;
      corto := true;
      insert into inv_audit (tabla, row_id, accion, antes, despues, editado_por)
      values ('profiles', a.user_id, 'corte_staff_por_' || p_estado,
              jsonb_build_object('allowed_areas', areas_antes, 'role', rol_antes),
              jsonb_build_object('allowed_areas', '[]'::jsonb, 'role', case when rol_antes = 'admin' then 'viewer' else rol_antes end),
              who);
    end if;
  end if;

  return jsonb_build_object('ok', true, 'estado', p_estado, 'email', a.email,
                            'staff_cortado', corto,
                            'nota', case when p_estado = 'revocado'
                                         then 'Acceso revocado (soft): la fila queda para auditoria.'
                                         when p_estado = 'pausado' then 'Acceso pausado: deja de ver casas hasta reactivarlo.'
                                         else 'Acceso reactivado. Las areas de staff NO se devuelven solas.' end);
end
$function$;

-- EDITAR CASAS: property_filter = subconjunto de sus holdings. null/vacio = todas sus casas.
create or replace function public.inv_admin_set_property_filter(p_access_id uuid, p_props uuid[])
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare a inv_access; validas uuid[]; nuevo jsonb;
begin
  perform public.inv_admin_guard();
  select * into a from inv_access where id = p_access_id;
  if not found then raise exception 'Acceso no encontrado'; end if;

  if p_props is null or coalesce(array_length(p_props, 1), 0) = 0 then
    nuevo := null;   -- sin restriccion: ve todas sus casas (holdings)
  else
    select array_agg(distinct h.property_id) into validas
      from inv_holdings h
     where h.active and h.investor_airtable_id = a.investor_airtable_id
       and h.property_id = any(p_props);
    if coalesce(array_length(validas, 1), 0) = 0 then
      raise exception 'Ninguna de esas casas esta asignada a este inversionista (vincula la casa primero en Casas & reparto)';
    end if;
    nuevo := to_jsonb(array(select x::text from unnest(validas) x));
  end if;

  update inv_access set property_filter = nuevo where id = p_access_id;
  return jsonb_build_object('ok', true, 'email', a.email,
                            'casas', coalesce(jsonb_array_length(nuevo), 0),
                            'restringido', nuevo is not null);
end
$function$;

-- EDITAR ROL: investor (solo sus propiedades) vs admin (TODO). Admin exige confirmacion.
create or replace function public.inv_admin_set_rol(p_access_id uuid, p_rol text, p_confirmo boolean default false)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare a inv_access; who text; areas_antes text[]; rol_antes text;
begin
  perform public.inv_admin_guard();
  if p_rol not in ('investor','admin') then
    raise exception 'Rol invalido: % (validos: investor, admin)', p_rol;
  end if;
  select * into a from inv_access where id = p_access_id;
  if not found then raise exception 'Acceso no encontrado'; end if;
  who := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email', 'service');
  select pr.allowed_areas, pr.role into areas_antes, rol_antes from profiles pr where pr.id = a.user_id;

  if p_rol = 'admin' then
    if not p_confirmo then
      raise exception 'Convertir en ADMIN requiere confirmacion explicita (p_confirmo = true)';
    end if;
    if a.user_id is null then
      raise exception 'Este acceso todavia no fue reclamado (sin usuario): no se le puede dar rol admin';
    end if;
    update inv_access set rol = 'admin' where id = p_access_id;
    update profiles set role = 'admin' where id = a.user_id;
  else
    update inv_access set rol = 'investor' where id = p_access_id;
    -- inversionista = viewer y sin areas de staff (salvo cuenta del equipo)
    if a.user_id is not null and not coalesce(a.es_equipo, false) then
      update profiles
         set role = case when role = 'admin' then 'viewer' else role end,
             allowed_areas = '{}'::text[]
       where id = a.user_id;
    end if;
  end if;

  if a.user_id is not null then
    insert into inv_audit (tabla, row_id, accion, antes, despues, editado_por)
    values ('profiles', a.user_id, 'cambio_rol_portal',
            jsonb_build_object('allowed_areas', areas_antes, 'role', rol_antes),
            jsonb_build_object('rol_portal', p_rol,
                               'role', case when p_rol = 'admin' then 'admin'
                                            when rol_antes = 'admin' then 'viewer' else rol_antes end),
            who);
  end if;

  return jsonb_build_object('ok', true, 'rol', p_rol, 'email', a.email,
                            'nota', case when p_rol = 'admin'
                                         then 'Ahora es ADMIN: ve TODAS las casas y el panel de administracion.'
                                         else 'Inversionista: solo sus propiedades.' end);
end
$function$;

-- CUENTA DEL EQUIPO: la unica excepcion a "fila en inv_access = inversionista".
create or replace function public.inv_admin_set_es_equipo(p_access_id uuid, p_on boolean)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare a inv_access;
begin
  perform public.inv_admin_guard();
  select * into a from inv_access where id = p_access_id;
  if not found then raise exception 'Acceso no encontrado'; end if;
  update inv_access set es_equipo = coalesce(p_on, false) where id = p_access_id;
  return jsonb_build_object('ok', true, 'es_equipo', coalesce(p_on, false), 'email', a.email,
                            'nota', case when p_on then 'Marcada como cuenta del EQUIPO: vuelve a ver todo el portafolio.'
                                         else 'Ya no es cuenta del equipo: queda limitada a sus casas.' end);
end
$function$;

revoke execute on function public.inv_admin_guard() from public;
revoke execute on function public.inv_admin_accesos() from public;
revoke execute on function public.inv_admin_set_estado(uuid, text) from public;
revoke execute on function public.inv_admin_set_property_filter(uuid, uuid[]) from public;
revoke execute on function public.inv_admin_set_rol(uuid, text, boolean) from public;
revoke execute on function public.inv_admin_set_es_equipo(uuid, boolean) from public;
grant execute on function public.inv_admin_accesos() to authenticated;
grant execute on function public.inv_admin_set_estado(uuid, text) to authenticated;
grant execute on function public.inv_admin_set_property_filter(uuid, uuid[]) to authenticated;
grant execute on function public.inv_admin_set_rol(uuid, text, boolean) to authenticated;
grant execute on function public.inv_admin_set_es_equipo(uuid, boolean) to authenticated;

-- -----------------------------------------------------------------
-- 10) DATOS: la excepcion del equipo + limpiar el staff que quedo colgando
-- -----------------------------------------------------------------
-- info.flippingrentals@gmail.com es cuenta del EQUIPO (areas fix-flip/rentas) que ademas
-- figura como inversionista. Decision del CEO: sigue viendo todo.
update public.inv_access
   set es_equipo = true
 where lower(email) = 'info.flippingrentals@gmail.com' and not es_equipo;

-- Inversionistas pausados/revocados que todavia tenian areas de staff o rol admin:
-- ahi vivia el hueco (juan.sanchez49115@gmail.com, revocado con allowed_areas={fix-flip}).
update public.profiles p
   set allowed_areas = '{}'::text[],
       role = case when p.role = 'admin' then 'viewer' else p.role end
  from public.inv_access a
 where a.user_id = p.id
   and a.estado in ('pausado','revocado')
   and not coalesce(a.es_equipo, false)
   and (coalesce(array_length(p.allowed_areas, 1), 0) > 0 or p.role = 'admin');

-- -----------------------------------------------------------------
-- 11) inv_claim_access(): que el pausado NO se reactive solo al entrar
--     Vinculaba el user_id por email y ponia estado='activo'. Con el estado 'pausado'
--     nuevo, al inversionista pausado le alcanzaba con volver a loguearse para deshacer
--     la pausa. Ahora solo reclama accesos 'invitado' (o ya 'activo').
-- -----------------------------------------------------------------
create or replace function public.inv_claim_access()
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare em text; n int;
begin
  em := lower(coalesce(auth.jwt() ->> 'email', ''));
  if em = '' or auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'sin sesion'); end if;
  update inv_access set user_id = auth.uid(), estado = 'activo', claimed_at = now()
  where lower(email) = em and active and estado in ('invitado','activo')
    and (user_id is null or user_id = auth.uid());
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'accesos', n);
end $function$;
comment on function public.inv_claim_access() is
  'El inversionista reclama su acceso por el email del JWT al loguearse. Solo toca accesos invitado/activo: un acceso pausado o revocado NO se reactiva solo por volver a entrar.';

-- -----------------------------------------------------------------
-- 12) mensajes: coherencia con property_filter
--     Si el acceso esta restringido a un subconjunto de casas, los mensajes de una casa
--     fuera de ese subconjunto tampoco se ven. Los mensajes DIRECTOS (property_id null)
--     siguen llegando igual.
-- -----------------------------------------------------------------
drop policy if exists inv_msg_read on public.inv_messages;
create policy inv_msg_read on public.inv_messages for select
  using (
    (public.has_area('fix-flip') and not public.inv_is_investor())
    or (investor_airtable_id in (select public.inv_my_ids())
        and (property_id is null or property_id in (select public.inv_my_props())))
    or (investor_airtable_id is null and property_id in (select public.inv_my_props()))
  );
