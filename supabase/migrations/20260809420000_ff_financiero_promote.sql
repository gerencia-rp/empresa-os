-- ════════════════════════════════════════════════════════════════
-- 💵 EJECUTOR ff-financiero — promoción + schedule (aditivo).
-- Financiero Fix & Flip dry-run → 'asistido' (eval 96%, FF8 PII + FF9 cero acción
-- + guard FF6 = 100%) + audit. Ejecutor deployado, verificado end-to-end como
-- agentes_ia_exec (aislamiento pm_credentials/pm_tenants.document_id = permission
-- denied). Escribe solo agent_proposals/audit.
-- Crons (Austin CDT = UTC-5): interés HML mensual · underwriting semanal · cap
-- table mensual. Kill switch (agent_registry.enabled). Dedup por corte/mes.
-- ════════════════════════════════════════════════════════════════
update public.agent_registry
  set estado='asistido', eval_score=96, eval_fecha=current_date, updated_at=now()
  where nombre='Financiero Fix & Flip' and deleted_at is null;

insert into public.agent_audit_log (agent_id, input, output, resultado)
select id,
  jsonb_build_object('accion','promocion','de','dry-run','a','asistido','corte',current_date::text),
  jsonb_build_object('eval_score',96,'veredicto','CUMPLE','no_negociables',jsonb_build_object('FF9_cero_accion',100,'FF8_pii',100,'FF6_guard_falsos_positivos',100),
    'verificacion_ejecutor', jsonb_build_object('aislamiento','pm_credentials + pm_tenants.document_id = permission denied','underwriting','3 violaciones (311 Bartlett 88.7% / Garden Path 79.2% / Stonleigh 78.6%)','interes','pagado $291,317 / 11 divergentes','captable','mora 2 / tel_colision 1 / capital_pagado null x22 / prueba 1'),
    'nota','Financiero de Fix & Flip (empresa madre) promovido a asistido. Propone ajustes/anomalias; ejecutar pago/ajuste = aprueba humano. Least-privilege por DB; PII de inversionistas bloqueada por columna.'),
  'ok'
from public.agent_registry where nombre='Financiero Fix & Flip' and deleted_at is null;

do $$ begin perform cron.unschedule(jobname) from cron.job where jobname like 'ff-financiero-%'; exception when others then null; end $$;
select cron.schedule('ff-financiero-interes',      '0 14 1 * *',  $$select public.cron_invoke_function('ff-financiero?mode=interes')$$);       -- día 1, 09:00 CDT
select cron.schedule('ff-financiero-underwriting', '0 13 * * 1',  $$select public.cron_invoke_function('ff-financiero?mode=underwriting')$$);  -- lunes 08:00 CDT
select cron.schedule('ff-financiero-captable',     '30 14 1 * *', $$select public.cron_invoke_function('ff-financiero?mode=captable')$$);      -- día 1, 09:30 CDT

-- ── ROLLBACK ──
--   update public.agent_registry set estado='dry-run', eval_score=null where nombre='Financiero Fix & Flip';
--   select cron.unschedule('ff-financiero-interes'); select cron.unschedule('ff-financiero-underwriting'); select cron.unschedule('ff-financiero-captable');
