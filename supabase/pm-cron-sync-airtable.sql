-- ════════════════════════════════════════════════════════════════
-- ⏰ PM · Cron auto-sync Airtable cada 15 min
-- Reusa public.cron_invoke_function (definida en s7-a-auto-sync.sql),
-- que invoca la edge function con el service_role key como Bearer.
--
-- REQUISITOS (configurar en Supabase, no en este archivo):
--   1. GUC app.settings.service_role_key seteado en la DB
--      (Dashboard → Database → ya lo usa s7-a; si no, setearlo).
--   2. Secret AIRTABLE_API_KEY en la edge function pm-sync-airtable
--      (Dashboard → Edge Functions → pm-sync-airtable → Secrets).
--      Opcional: AIRTABLE_BASE_ID (default appzEnsuy4qPT6iHj en el código).
--
-- La función detecta Bearer == service_role key → modo cron (sin user JWT)
-- y toma el token de Airtable desde AIRTABLE_API_KEY.
-- ════════════════════════════════════════════════════════════════

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Reschedule limpio
do $$ begin
  perform cron.unschedule('pm-sync-airtable-every-15min')
  from cron.job where jobname = 'pm-sync-airtable-every-15min';
exception when others then null;
end $$;

select cron.schedule(
  'pm-sync-airtable-every-15min',
  '*/15 * * * *',
  $$select public.cron_invoke_function('pm-sync-airtable')$$
);

-- Verificá:  select jobname, schedule, active from cron.job where jobname like 'pm-%';
-- Forzar una corrida manual:  select public.cron_invoke_function('pm-sync-airtable');
