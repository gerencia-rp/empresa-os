-- ════════════════════════════════════════════════════════════════
-- 📊 EJECUTOR rentas-reportes — promoción + grant + schedule (aditivo).
-- 1) Reportes Rentas dry-run → 'asistido' (eval ≈98%, R2/R5/R6=100%) + audit.
-- 2) GRANT SELECT en v_ocupacion al rol least-privilege agentes_ia_exec
--    (única lectura nueva; el resto — pm_units/pm_properties/pm_payments/
--     pm_expenses/agent_proposals/pm_informes — ya lo tenía). NADA de escritura
--    nueva salvo pm_informes/agent_audit_log que ya estaban.
-- 3) Cron: ocupación semanal (miércoles) + bitácora (lun/mar). Kill switch
--    (agent_registry.enabled) corta aunque el cron dispare. Dedup por corte
--    (lunes de la semana) → el re-run lun→mar no duplica.
-- ════════════════════════════════════════════════════════════════

-- 1) Promoción + registro en la bitácora
update public.agent_registry
  set estado='asistido', eval_score=98, eval_fecha=current_date, updated_at=now()
  where nombre='Reportes Rentas' and deleted_at is null;

insert into public.agent_audit_log (agent_id, input, output, resultado)
select id,
  jsonb_build_object('accion','promocion','de','dry-run','a','asistido','corte',current_date::text),
  jsonb_build_object('eval_score',98,'veredicto','CUMPLE','no_negociables',jsonb_build_object('R2_sin_inventar',100,'R5_cero_PII',100,'R6_plata_real',100),'nota','Reportes de Rentas pasó el eval; promovido a asistido. Ejecutor con least-privilege por DB, dry-run por defecto.'),
  'ok'
from public.agent_registry where nombre='Reportes Rentas' and deleted_at is null;

-- 2) Grant aditivo (v_ocupacion es security_invoker → lee pm_units/pm_properties bajo el rol)
grant select on public.v_ocupacion to agentes_ia_exec;

-- 3) Schedule (ocupación miércoles 08:00 Austin · bitácora lun+mar 08:00 Austin)
do $$ begin perform cron.unschedule(jobname) from cron.job where jobname like 'rentas-reportes-%'; exception when others then null; end $$;
select cron.schedule('rentas-reportes-ocupacion', '0 13 * * 3',   $$select public.cron_invoke_function('rentas-reportes?mode=ocupacion')$$);  -- miércoles 08:00 CDT
select cron.schedule('rentas-reportes-bitacora',  '0 13 * * 1,2', $$select public.cron_invoke_function('rentas-reportes?mode=bitacora')$$);   -- lun+mar 08:00 CDT (dedup por corte)

-- ── ROLLBACK ──
--   update public.agent_registry set estado='dry-run', eval_score=null, eval_fecha=null where nombre='Reportes Rentas';
--   revoke select on public.v_ocupacion from agentes_ia_exec;   -- (destructivo: REVOKE, requiere OK)
--   select cron.unschedule('rentas-reportes-ocupacion');
--   select cron.unschedule('rentas-reportes-bitacora');
