-- ================================================================
-- ROLLBACK de 20260917100000_control_accesos_inversionistas
--
-- OJO ANTES DE CORRERLO: vuelve a ABRIR el hueco que la migracion cierra
-- (un inversionista pausado/revocado con un area de staff en su profile vuelve a ver
-- TODAS las casas). Correlo solo si algo se rompio y hay que volver al estado del 16-sep.
--
-- Lo que NO deshace automaticamente:
--   * Las areas de staff que se limpiaron de `profiles` al revocar/pausar. El valor previo
--     quedo guardado en `inv_audit` (tabla='profiles', accion like 'corte_staff%' o
--     'cambio_rol_portal', columna `antes`). Restaurar a mano el que corresponda:
--       select row_id, antes, despues, at from inv_audit
--        where tabla='profiles' and accion in ('corte_staff_por_pausado','corte_staff_por_revocado','cambio_rol_portal')
--        order by at desc;
--   * `inv_access.es_equipo` (columna aditiva): se conserva. Es inerte una vez que
--     inv_is_investor() vuelve a la definicion vieja.
--   * Los property_filter que se hayan cargado desde el panel: limpiarlos con
--       update inv_access set property_filter = null where property_filter is not null;
-- ================================================================

-- 1) inv_is_investor(): volver a "solo inversionista ACTIVO"
create or replace function public.inv_is_investor()
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select exists (
    select 1 from inv_access
    where user_id = auth.uid() and active and estado = 'activo'
  );
$function$;

-- 2) inv_my_props(): sin property_filter
create or replace function public.inv_my_props()
 returns setof uuid
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select h.property_id from inv_holdings h
  where h.active and h.investor_airtable_id in (select public.inv_my_ids());
$function$;

-- 3) policies: volver a la version sin interseccion con inv_my_props()
drop policy if exists inv_holdings_read on public.inv_holdings;
create policy inv_holdings_read on public.inv_holdings for select
  using (
    (investor_airtable_id in (select public.inv_my_ids()))
    or (public.has_area('fix-flip') and not public.inv_is_investor())
  );

drop policy if exists inv_dist_read on public.inv_distributions;
create policy inv_dist_read on public.inv_distributions for select
  using (
    (investor_airtable_id in (select public.inv_my_ids()))
    or (public.has_area('fix-flip') and not public.inv_is_investor())
  );

-- 4) inv_portal_resumen / inv_portal_resumen_de: sacar el filtro agregado (idempotente)
do $do$
declare d text;
begin
  select pg_get_functiondef(p.oid) into d
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'inv_portal_resumen' and p.pronargs = 0;
  if position('h.property_id in (select public.inv_my_props())' in d) > 0 then
    d := replace(d,
      '      and ((h.investor_airtable_id in (select public.inv_my_ids())' || chr(10) ||
      '            and h.property_id in (select public.inv_my_props()))',
      '      and (h.investor_airtable_id in (select public.inv_my_ids())');
    execute d;
  end if;

  select pg_get_functiondef(p.oid) into d
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'inv_portal_resumen_de';
  if position('inv_props_de(p_inv)' in d) > 0 then
    d := replace(d,
      '    where h.active and h.investor_airtable_id = p_inv' || chr(10) ||
      '      and h.property_id in (select public.inv_props_de(p_inv))',
      '    where h.active and h.investor_airtable_id = p_inv');
    execute d;
  end if;
end
$do$;

-- 5) funciones nuevas (el front vuelve a su fallback cuando no existen)
drop function if exists public.inv_admin_set_es_equipo(uuid, boolean);
drop function if exists public.inv_admin_set_rol(uuid, text, boolean);
drop function if exists public.inv_admin_set_property_filter(uuid, uuid[]);
drop function if exists public.inv_admin_set_estado(uuid, text);
drop function if exists public.inv_admin_accesos();
drop function if exists public.inv_admin_guard();
drop function if exists public.inv_contexto_acceso();
drop function if exists public.inv_props_de(text);

-- 6) CHECK de estado: volver a 3 valores (falla si quedo alguna fila 'pausado';
--    normalizarlas antes con: update inv_access set estado='revocado', active=false where estado='pausado';)
alter table public.inv_access drop constraint if exists inv_access_estado_check;
alter table public.inv_access add constraint inv_access_estado_check
  check (estado = any (array['invitado','activo','revocado']));

-- 7) inv_claim_access(): volver a reclamar tambien los accesos pausados
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
  where lower(email) = em and active and estado <> 'revocado'
    and (user_id is null or user_id = auth.uid());
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'accesos', n);
end $function$;

-- 8) inv_msg_read: volver a la version sin property_filter
drop policy if exists inv_msg_read on public.inv_messages;
create policy inv_msg_read on public.inv_messages for select
  using (
    (public.has_area('fix-flip') and not public.inv_is_investor())
    or (investor_airtable_id in (select public.inv_my_ids()))
    or (investor_airtable_id is null and property_id in (select public.inv_my_props()))
  );
