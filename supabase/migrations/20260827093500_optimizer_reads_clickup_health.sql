-- El optimizador solo necesita el resultado técnico de la sincronización para
-- decidir si puede confiar en el espejo; no obtiene credenciales ni PII.
grant select on public.clickup_sync_log to agentes_ia_exec;
