-- ════════════════════════════════════════════════════════════════
-- ✅ EJECUTOR rentas-ejecucion — schedule (aditivo).
-- Reusa el rol least-privilege agentes_ia_exec (ya tiene SELECT sobre
-- clickup_tasks_mirror / pm_properties / pm_units / agent_* del exec-role) —
-- NO hicieron falta grants nuevos. El ejecutor conecta COMO ese rol.
-- Escribe solo borradores de nudge a agent_proposals (NUNCA envía).
-- Idempotencia por tarea vía discriminador en el payload (tarea_id/persona/corte)
-- + trigger trg_dedup_proposals. Kill switch = agent_registry.enabled.
-- ════════════════════════════════════════════════════════════════
do $$ begin perform cron.unschedule(jobname) from cron.job where jobname like 'rentas-ejecucion-%'; exception when others then null; end $$;
select cron.schedule('rentas-ejecucion-am',  '0 12 * * *',  $$select public.cron_invoke_function('rentas-ejecucion?mode=pulso')$$);  -- 07:00 Austin
select cron.schedule('rentas-ejecucion-mid', '30 17 * * *', $$select public.cron_invoke_function('rentas-ejecucion?mode=pulso')$$);  -- 12:30 Austin
select cron.schedule('rentas-ejecucion-pm',  '30 22 * * *', $$select public.cron_invoke_function('rentas-ejecucion?mode=pulso')$$);  -- 17:30 Austin

-- ── ROLLBACK ──
--   select cron.unschedule('rentas-ejecucion-am');
--   select cron.unschedule('rentas-ejecucion-mid');
--   select cron.unschedule('rentas-ejecucion-pm');
