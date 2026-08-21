-- ════════════════════════════════════════════════════════════════
-- 📈 EJECUTOR rentas-optimizacion — promoción + schedule (aditivo).
-- 1) Optimización Rentas dry-run → 'asistido' (eval ≈98%, O4/O5=100%) + audit.
-- 2) SIN grants nuevos: el rol agentes_ia_exec ya lee todo lo que el ejecutor
--    necesita (v_ocupacion, pm_units, pm_properties, pm_payments, v_cartera_kpi,
--    clickup_tasks_mirror, pm_informes, agent_proposals/registry). Escribe solo
--    a agent_proposals/pm_informes/agent_audit_log (ya concedido). PII/UPDATE
--    siguen negados por la DB (has_privilege=false).
-- 3) Cron: revisión diaria (ocupación+cuellos) · precio semanal · mejora mensual.
--    Kill switch (agent_registry.enabled) corta aunque el cron dispare. Dedup por
--    corte (lunes ISO / 1º de mes) → re-runs no duplican.
-- ════════════════════════════════════════════════════════════════

-- 1) Promoción + registro en la bitácora
update public.agent_registry
  set estado='asistido', eval_score=98, eval_fecha=current_date, updated_at=now()
  where nombre='Optimización Rentas' and deleted_at is null;

insert into public.agent_audit_log (agent_id, input, output, resultado)
select id,
  jsonb_build_object('accion','promocion','de','dry-run','a','asistido','corte',current_date::text),
  jsonb_build_object('eval_score',98,'veredicto','CUMPLE','no_negociables',jsonb_build_object('O4_cero_accion',100,'O5_cero_falsos_positivos',100),'nota','Optimización de Rentas pasó el eval; promovido a asistido. Cambios de precio los confirma un humano. Least-privilege por DB, dry-run por defecto.'),
  'ok'
from public.agent_registry where nombre='Optimización Rentas' and deleted_at is null;

-- 3) Schedule (diaria 08:15 · precio semanal jueves 08:15 · mejora mensual día 1, 09:00 Austin)
do $$ begin perform cron.unschedule(jobname) from cron.job where jobname like 'rentas-optimizacion-%'; exception when others then null; end $$;
select cron.schedule('rentas-optimizacion-diaria',  '15 13 * * *',  $$select public.cron_invoke_function('rentas-optimizacion?mode=diaria')$$);   -- diario 08:15 CDT
select cron.schedule('rentas-optimizacion-precio',  '15 13 * * 4',  $$select public.cron_invoke_function('rentas-optimizacion?mode=semanal')$$);  -- jueves 08:15 CDT
select cron.schedule('rentas-optimizacion-mejora',  '0 14 1 * *',   $$select public.cron_invoke_function('rentas-optimizacion?mode=mensual')$$);  -- día 1, 09:00 CDT

-- ── ROLLBACK ──
--   update public.agent_registry set estado='dry-run', eval_score=null, eval_fecha=null where nombre='Optimización Rentas';
--   select cron.unschedule('rentas-optimizacion-diaria');
--   select cron.unschedule('rentas-optimizacion-precio');
--   select cron.unschedule('rentas-optimizacion-mejora');
