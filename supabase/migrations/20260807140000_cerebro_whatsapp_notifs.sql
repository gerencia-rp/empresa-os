-- ════════════════════════════════════════════════════════════════
-- 📲 CEREBRO · Notificaciones personales por WhatsApp (Twilio) — Etapa 3.1
-- Aditivo. Canal PERSONAL del CEO: matutino 7:45 Austin + alertas 🔴 c/15 min.
-- La edge function notify-whatsapp SOLO escribe a los destinatarios de
-- user_notification_prefs (whatsapp_enabled=true). Cero auto-envío a terceros.
--
-- Secret que NO va acá (se setea con `npx supabase secrets set`):
--   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886   (sandbox; luego el número prod)
--   (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN ya existen — los reusa de cobros)
-- ════════════════════════════════════════════════════════════════

-- 0) El CHECK de notification_log.channel no incluía 'whatsapp' → los inserts de
--    log fallarían. Amplío el dominio (mantengo los canales previos).
alter table public.notification_log drop constraint if exists notification_log_channel_check;
alter table public.notification_log add constraint notification_log_channel_check
  check (channel in ('browser','telegram','email','slack','webhook','whatsapp'));

-- 1) Columnas WhatsApp en las prefs (el esquema traía telegram/email/browser).
alter table public.user_notification_prefs add column if not exists whatsapp_enabled boolean default false;
alter table public.user_notification_prefs add column if not exists whatsapp_number  text;

-- 2) Semilla del CEO (gerencia@rentalprofitss.com). El número lo carga mode=register
--    (queda enabled=true con número NULL → el envío se saltea con aviso hasta registrarlo).
insert into public.user_notification_prefs (user_id, whatsapp_enabled, notify_severities, updated_at)
values ('203f8d94-fea1-4031-b468-2580887bbfca', true, array['critical']::text[], now())
on conflict (user_id) do update
  set whatsapp_enabled = true,
      notify_severities = coalesce(public.user_notification_prefs.notify_severities, array['critical']::text[]),
      updated_at = now();

-- 3) pg_cron (usa cron_invoke_function con Vault; el modo va en el query string de la URL).
do $$ begin
  perform cron.unschedule(jobname) from cron.job
    where jobname in ('cerebro-matutino-a','cerebro-matutino-b','cerebro-alertas');
exception when others then null;
end $$;

-- Matutino 07:45 America/Chicago EXACTO todo el año: dos disparos UTC (cubren CST y CDT),
-- la función solo envía si la hora local Austin cae 07:40–07:50 (el otro dispara y no-opea).
select cron.schedule('cerebro-matutino-a', '45 12 * * *',
  $$select public.cron_invoke_function('notify-whatsapp?mode=morning')$$);
select cron.schedule('cerebro-matutino-b', '45 13 * * *',
  $$select public.cron_invoke_function('notify-whatsapp?mode=morning')$$);

-- Alertas 🔴 cada 15 min (solo nuevas desde la última corrida; primera vez = 1 digest del backlog).
select cron.schedule('cerebro-alertas', '*/15 * * * *',
  $$select public.cron_invoke_function('notify-whatsapp?mode=alerts')$$);

-- ── ROLLBACK ──
--   select cron.unschedule('cerebro-matutino-a');
--   select cron.unschedule('cerebro-matutino-b');
--   select cron.unschedule('cerebro-alertas');
--   update public.user_notification_prefs set whatsapp_enabled=false where user_id='203f8d94-fea1-4031-b468-2580887bbfca';
--   -- (columnas whatsapp_* se pueden dejar; son aditivas y sin uso si no hay crons)
