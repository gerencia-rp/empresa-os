-- Crons de la capa de inteligencia (horas en UTC; Austin CDT = UTC-5 en agosto).
-- Reunión matutina 07:35 Austin (12:35 UTC), después de los gerentes de área (07:30).
select cron.schedule('cerebro-reunion-matutina', '35 12 * * *', $$select public.cron_invoke_function('cerebro-reunion?mode=reunion')$$);
-- Compactación de memoria 03:00 Austin (08:00 UTC).
select cron.schedule('cerebro-memoria-compactar', '0 8 * * *', $$select public.cron_invoke_function('cerebro-reunion?mode=compactar')$$);
-- Auditoría de seguridad semanal: lunes 03:15 Austin (08:15 UTC), SQL directo en-DB.
select cron.schedule('security-audit-weekly', '15 8 * * 1', $$select public.security_audit_run()$$);
