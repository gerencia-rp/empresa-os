-- ════════════════════════════════════════════════════════════════
-- ⏰ PM · Crons de alertas automáticas (pg_cron → edge function pm-alerts)
-- Alternativa server-side a Vercel Cron. Reusa public.cron_invoke_function
-- (s7-a-auto-sync.sql) que invoca la edge function con el service_role key.
--
-- pm-alerts lee ?check= del query string; cron_invoke_function postea sin query,
-- así que cada job llama a una variante. Para diferenciar el check por job
-- usamos net.http_post directo con la URL + ?check=.
--
-- REQUISITO: GUC app.settings.service_role_key seteado (igual que pm-sync).
-- ════════════════════════════════════════════════════════════════
create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.pm_invoke_alerts(p_check text)
returns void language plpgsql security definer set search_path = public, net as $$
declare
  v_key text;
begin
  begin v_key := current_setting('app.settings.service_role_key', true); exception when others then v_key := null; end;
  if v_key is null then return; end if;
  perform net.http_post(
    url := 'https://nezbaljfhhyznhltpjnk.supabase.co/functions/v1/pm-alerts?check=' || p_check,
    headers := jsonb_build_object('Authorization','Bearer '||v_key,'Content-Type','application/json'),
    body := jsonb_build_object('triggered_by','pg_cron','check',p_check)
  );
end $$;

-- Reschedule limpio
do $$ begin
  perform cron.unschedule(jobname) from cron.job where jobname in (
    'pm-alerts-contracts','pm-alerts-payments','pm-alerts-services','pm-alerts-tasks','pm-alerts-occupancy'
  );
exception when others then null; end $$;

select cron.schedule('pm-alerts-contracts', '0 8 * * *',  $$select public.pm_invoke_alerts('contracts')$$);
select cron.schedule('pm-alerts-payments',  '0 9 * * *',  $$select public.pm_invoke_alerts('payments')$$);
select cron.schedule('pm-alerts-services',  '0 9 * * 1',  $$select public.pm_invoke_alerts('services')$$);
select cron.schedule('pm-alerts-tasks',     '0 7 * * *',  $$select public.pm_invoke_alerts('tasks')$$);
select cron.schedule('pm-alerts-occupancy', '0 10 * * 1', $$select public.pm_invoke_alerts('occupancy')$$);

-- Verificá:   select jobname, schedule, active from cron.job where jobname like 'pm-alerts-%';
-- Forzar:     select public.pm_invoke_alerts('all');
