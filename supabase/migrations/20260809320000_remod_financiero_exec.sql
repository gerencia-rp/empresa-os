-- ════════════════════════════════════════════════════════════════
-- 💵 EJECUTOR remod-financiero — promoción + schedule (aditivo).
-- 1) Financiero Remodelacion dry-run → 'asistido' (eval ≈98%, RF6/RF7=100%) + audit.
-- 2) Grants ya concedidos (20260809300000). Escribe solo agent_proposals/audit.
-- 3) Cron: material semanal (lunes) · nómina quincenal (día 1 y 16) · anomalías
--    semanal (lunes). Kill switch (enabled). Dedup por corte/quincena.
-- ════════════════════════════════════════════════════════════════
update public.agent_registry
  set estado='asistido', eval_score=98, eval_fecha=current_date, updated_at=now()
  where nombre='Financiero Remodelacion' and deleted_at is null;

insert into public.agent_audit_log (agent_id, input, output, resultado)
select id,
  jsonb_build_object('accion','promocion','de','dry-run','a','asistido','corte',current_date::text),
  jsonb_build_object('eval_score',98,'veredicto','CUMPLE','no_negociables',jsonb_build_object('RF6_cero_accion',100,'RF7_cero_falsos_positivos',100),'nota','Financiero de Remodelacion paso el eval; promovido a asistido. Propone pagos/anomalias; ejecutar pago = aprueba humano. Least-privilege por DB.'),
  'ok'
from public.agent_registry where nombre='Financiero Remodelacion' and deleted_at is null;

do $$ begin perform cron.unschedule(jobname) from cron.job where jobname like 'remod-financiero-%'; exception when others then null; end $$;
select cron.schedule('remod-financiero-material',  '0 13 * * 1',    $$select public.cron_invoke_function('remod-financiero?mode=material')$$);   -- lunes 08:00 CDT
select cron.schedule('remod-financiero-nomina',    '0 14 1,16 * *', $$select public.cron_invoke_function('remod-financiero?mode=nomina')$$);     -- día 1 y 16, 09:00 CDT
select cron.schedule('remod-financiero-anomalias', '30 13 * * 1',   $$select public.cron_invoke_function('remod-financiero?mode=anomalias')$$);  -- lunes 08:30 CDT

-- ── ROLLBACK ──
--   update public.agent_registry set estado='dry-run', eval_score=null where nombre='Financiero Remodelacion';
--   select cron.unschedule('remod-financiero-material'); select cron.unschedule('remod-financiero-nomina'); select cron.unschedule('remod-financiero-anomalias');
