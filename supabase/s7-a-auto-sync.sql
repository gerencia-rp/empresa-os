-- ============================================================
-- S7-A · Sync automático + Notification log
-- pg_cron jobs para auto-sync de Airtable (30min) y ClickUp (60min)
-- + tabla para tracking de notificaciones
-- ============================================================

-- Habilitar extensions (idempotente, Supabase Pro)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Tabla notification_log para tracking de qué se notificó cuándo
create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('browser','telegram','email','slack','webhook')),
  severity text default 'info' check (severity in ('critical','warning','info')),
  source text not null,           -- 'airtable_alert' | 'clickup_alert' | 'cron_failure' | etc
  title text not null,
  body text,
  related_id text,                -- id de la alerta o entidad relacionada
  sent_at timestamptz default now(),
  delivered bool default false,
  error text,
  recipient text,                 -- user_id, chat_id, email, etc
  metadata jsonb default '{}'::jsonb
);

create index if not exists notification_log_recent on public.notification_log(sent_at desc);
create index if not exists notification_log_undelivered on public.notification_log(delivered) where not delivered;

-- Tabla user_notification_prefs (cada usuario configura sus canales)
create table if not exists public.user_notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  browser_enabled bool default true,
  browser_push_subscription jsonb,    -- Web Push subscription (endpoint, keys)
  telegram_enabled bool default false,
  telegram_chat_id text,
  email_enabled bool default false,
  email text,
  notify_severities text[] default array['critical','warning']::text[],
  quiet_hours_start time,             -- ej: '22:00'
  quiet_hours_end time,               -- ej: '07:00'
  updated_at timestamptz default now()
);

-- RLS
alter table public.notification_log enable row level security;
alter table public.user_notification_prefs enable row level security;

drop policy if exists nl_select on public.notification_log;
create policy nl_select on public.notification_log for select using (auth.role()='authenticated');
drop policy if exists nl_write on public.notification_log;
create policy nl_write on public.notification_log for all using (auth.role()='authenticated') with check (auth.role()='authenticated');

drop policy if exists unp_self on public.user_notification_prefs;
create policy unp_self on public.user_notification_prefs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- pg_cron jobs
-- ============================================================
-- IMPORTANT: estos jobs requieren el service_role key configurado en la DB como GUC.
-- Si no podés configurarlo, podés deployar los jobs desde Supabase Dashboard → Database → Cron.

-- Función helper para llamar Edge Functions desde cron
create or replace function public.cron_invoke_function(p_function text)
returns void language plpgsql security definer set search_path = public, net as $$
declare
  v_url text;
  v_key text;
  v_request_id bigint;
begin
  v_url := 'https://nezbaljfhhyznhltpjnk.supabase.co/functions/v1/' || p_function;
  -- service_role_key debe estar en vault o como variable de entorno de la función
  -- por simplicidad, usamos el JWT del cron service que asume permisos
  begin
    v_key := current_setting('app.settings.service_role_key', true);
  exception when others then
    v_key := null;
  end;

  if v_key is null then
    -- Si no hay key configurada, log y skip (el job no falla, solo no hace nada)
    insert into public.notification_log(channel, severity, source, title, body)
    values ('webhook','warning','cron_failure', 'Cron skip: '||p_function, 'service_role_key no configurado');
    return;
  end if;

  select net.http_post(
    url := v_url,
    headers := jsonb_build_object('Authorization', 'Bearer '||v_key, 'Content-Type', 'application/json'),
    body := jsonb_build_object('triggered_by','cron')
  ) into v_request_id;
end $$;

-- Programar jobs (idempotente)
do $$ begin
  -- Borrar jobs viejos si existen (para reschedule limpio)
  perform cron.unschedule(jobname) from cron.job where jobname in (
    'sync-airtable-every-30min', 'sync-clickup-every-60min', 'sync-clickup-cleanup-stale'
  );
exception when others then null;
end $$;

-- Sync Airtable cada 30 minutos
select cron.schedule(
  'sync-airtable-every-30min',
  '*/30 * * * *',
  $$select public.cron_invoke_function('sync-remodel-airtable')$$
);

-- Sync ClickUp cada 60 minutos (más pesado, menor frecuencia)
select cron.schedule(
  'sync-clickup-every-60min',
  '0 * * * *',
  $$select public.cron_invoke_function('sync-clickup')$$
);

-- ============================================================
-- Helper para notificar al detectar critical alerts (called by edge functions)
-- ============================================================
create or replace function public.queue_alert_notifications()
returns void language plpgsql as $$
declare
  v_alert record;
  v_pref record;
begin
  -- Para cada alerta critical no resuelta y no notificada todavía
  for v_alert in
    select a.id, a.title, a.detail, a.severity, 'airtable_alert' as source
    from public.remodel_alerts a
    where a.severity = 'critical' and a.resolved_at is null
      and not exists (
        select 1 from public.notification_log nl
        where nl.related_id = a.id::text and nl.source = 'airtable_alert'
          and nl.sent_at > now() - interval '24 hours'
      )
    union all
    select a.id, a.title, a.detail, a.severity, 'clickup_alert' as source
    from public.clickup_alerts a
    where a.severity = 'critical' and a.resolved_at is null
      and not exists (
        select 1 from public.notification_log nl
        where nl.related_id = a.id::text and nl.source = 'clickup_alert'
          and nl.sent_at > now() - interval '24 hours'
      )
  loop
    -- Para cada usuario con preferencias
    for v_pref in select * from public.user_notification_prefs where v_alert.severity = any(notify_severities)
    loop
      if v_pref.browser_enabled then
        insert into public.notification_log(channel, severity, source, title, body, related_id, recipient)
        values ('browser', v_alert.severity, v_alert.source, v_alert.title, v_alert.detail, v_alert.id::text, v_pref.user_id::text);
      end if;
      if v_pref.telegram_enabled and v_pref.telegram_chat_id is not null then
        insert into public.notification_log(channel, severity, source, title, body, related_id, recipient)
        values ('telegram', v_alert.severity, v_alert.source, v_alert.title, v_alert.detail, v_alert.id::text, v_pref.telegram_chat_id);
      end if;
    end loop;
  end loop;
end $$;

-- Smoke tests
-- select * from cron.job order by jobname;
-- select * from public.notification_log order by sent_at desc limit 20;
