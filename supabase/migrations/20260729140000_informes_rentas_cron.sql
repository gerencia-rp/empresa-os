-- ════════════════════════════════════════════════════════════════
-- 📊 INFORMES DE RENTAS · programación pg_cron (29-jul-2026)
-- Semanal: lunes 8am CT (~13:00 UTC) · Combinado: día 1 del mes, para el mes recién cerrado.
-- El balance queda MANUAL (se emite por corte a demanda). Los crons dejan el BORRADOR listo
-- en la bandeja (pm_informes, origen='cron'); un humano lo revisa y emite el PDF.
-- rentas_generar_informe es SECURITY INVOKER; pg_cron corre como owner (bypassa RLS).
-- ════════════════════════════════════════════════════════════════
select cron.unschedule('rentas-informe-semanal')  where exists (select 1 from cron.job where jobname = 'rentas-informe-semanal');
select cron.unschedule('rentas-informe-combinado') where exists (select 1 from cron.job where jobname = 'rentas-informe-combinado');
select cron.schedule('rentas-informe-semanal',  '0 13 * * 1',  $$select public.rentas_generar_informe('semanal', current_date, 'cron')$$);
select cron.schedule('rentas-informe-combinado','0 13 1 * *',  $$select public.rentas_generar_informe('combinado', (current_date - 1), 'cron')$$);
