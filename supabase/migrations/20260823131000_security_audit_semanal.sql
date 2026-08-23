-- ════════════════════════════════════════════════════════════════════
-- 🔒 AUDITORÍA DE SEGURIDAD SEMANAL (en-DB, determinista)
--
-- Regla dura del proyecto: toda vista lleva security_invoker=on (si no,
-- saltea el RLS de sus tablas base) y toda tabla del espejo lleva RLS.
-- Esta función chequea ambas cosas cada semana y deja el resultado en
-- notification_log (severity 'warning' si hay hallazgos, 'info' si limpio).
-- Solo LEE el catálogo; no cambia nada. La registra el cron
-- 'security-audit-weekly'.
-- ════════════════════════════════════════════════════════════════════
create or replace function public.security_audit_run()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_catalog'
as $$
declare
  v_views_no_invoker int;
  v_tables_no_rls int;
  v_view_list text;
  v_table_list text;
  v_sev text;
  v_out jsonb;
begin
  -- Vistas del esquema public SIN security_invoker (bypassean RLS de sus tablas base).
  select count(*), coalesce(string_agg(c.relname, ', ' order by c.relname), '')
    into v_views_no_invoker, v_view_list
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'v'
    and not exists (
      select 1 from unnest(coalesce(c.reloptions, '{}'::text[])) o
      where o like 'security_invoker=%' and lower(split_part(o,'=',2)) in ('on','true')
    );

  -- Tablas del esquema public SIN RLS habilitado.
  select count(*), coalesce(string_agg(c.relname, ', ' order by c.relname), '')
    into v_tables_no_rls, v_table_list
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
    and c.relrowsecurity = false;

  v_sev := case when v_views_no_invoker > 0 or v_tables_no_rls > 0 then 'warning' else 'info' end;
  v_out := jsonb_build_object(
    'views_sin_security_invoker', v_views_no_invoker,
    'tables_sin_rls', v_tables_no_rls,
    'views', left(v_view_list, 4000),
    'tables', left(v_table_list, 4000),
    'corte', (now() at time zone 'America/Chicago')::date
  );

  insert into public.notification_log(channel, severity, source, title, body, metadata)
  values (
    'webhook', v_sev, 'security_audit',
    'Auditoría de seguridad semanal: ' || v_views_no_invoker || ' vistas sin security_invoker · ' || v_tables_no_rls || ' tablas sin RLS',
    case when v_sev = 'info' then 'Todo limpio: cada vista con security_invoker y cada tabla con RLS.'
         else 'Revisar. Vistas expuestas: ' || left(v_view_list, 1500) || ' | Tablas sin RLS: ' || left(v_table_list, 1500) end,
    v_out
  );
  return v_out;
end $$;

comment on function public.security_audit_run() is 'Auditoría de seguridad semanal: cuenta vistas public sin security_invoker + tablas public sin RLS, deja el resultado en notification_log. Solo lee el catálogo.';
