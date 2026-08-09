-- ════════════════════════════════════════════════════════════════
-- 💵 EJECUTOR rentas-financiero — rol dedicado least-privilege (ADITIVO).
-- NO toca el rol agentes_ia. Crea agentes_ia_exec con permisos MÍNIMOS
-- IMPUESTOS POR LA DB: SELECT solo en el espejo del Financiero + INSERT solo
-- en las 2 colas. CERO pm_credentials/qb_connections, CERO document_id (PII),
-- CERO update/delete. El ejecutor conecta COMO este rol (no service role).
--
-- ⚠ El PASSWORD se setea FUERA del repo (no versionar secretos):
--     alter role agentes_ia_exec login password '<Supabase Secret AGENTES_IA_EXEC_PWD>';
-- ════════════════════════════════════════════════════════════════

do $$ begin
  if not exists (select 1 from pg_roles where rolname='agentes_ia_exec') then
    create role agentes_ia_exec login
      noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls
      connection limit 4;   -- password: se setea out-of-band (ver arriba)
  end if;
end $$;

grant usage on schema public to agentes_ia_exec;

-- Lectura SOLO del espejo necesario
grant select on public.v_cartera_inquilino  to agentes_ia_exec;
grant select on public.v_cartera_kpi         to agentes_ia_exec;
grant select on public.pm_payments           to agentes_ia_exec;
grant select on public.pm_properties         to agentes_ia_exec;
grant select on public.clickup_tasks_mirror  to agentes_ia_exec;
grant select on public.ct_findings           to agentes_ia_exec;
grant select on public.agent_registry        to agentes_ia_exec;
grant select on public.agent_proposals       to agentes_ia_exec;
grant select (id, full_name) on public.pm_tenants to agentes_ia_exec;  -- ⛔ document_id/PII bloqueado por columna

-- Escritura SOLO a las 2 colas
grant insert on public.agent_proposals to agentes_ia_exec;
grant insert on public.agent_audit_log to agentes_ia_exec;

-- Policies RLS SOLO para el rol nuevo (necesarias porque las tablas tienen RLS activo)
drop policy if exists exec_sel on public.pm_payments;          create policy exec_sel on public.pm_payments          for select to agentes_ia_exec using (true);
drop policy if exists exec_sel on public.pm_tenants;           create policy exec_sel on public.pm_tenants           for select to agentes_ia_exec using (true);
drop policy if exists exec_sel on public.pm_properties;        create policy exec_sel on public.pm_properties        for select to agentes_ia_exec using (true);
drop policy if exists exec_sel on public.clickup_tasks_mirror; create policy exec_sel on public.clickup_tasks_mirror for select to agentes_ia_exec using (true);
drop policy if exists exec_sel on public.ct_findings;          create policy exec_sel on public.ct_findings          for select to agentes_ia_exec using (true);
drop policy if exists exec_sel on public.agent_registry;       create policy exec_sel on public.agent_registry       for select to agentes_ia_exec using (true);
drop policy if exists exec_sel on public.agent_proposals;      create policy exec_sel on public.agent_proposals      for select to agentes_ia_exec using (true);
drop policy if exists exec_ins on public.agent_proposals;      create policy exec_ins on public.agent_proposals      for insert to agentes_ia_exec with check (true);
drop policy if exists exec_ins on public.agent_audit_log;      create policy exec_ins on public.agent_audit_log      for insert to agentes_ia_exec with check (true);

-- Kill switch
alter table public.agent_registry add column if not exists enabled boolean default true;

-- Schedule (cron_invoke_function con Vault; el mode va en el query string)
do $$ begin
  perform cron.unschedule(jobname) from cron.job where jobname in ('rentas-financiero-cobros','rentas-financiero-servicios','rentas-financiero-cierre');
exception when others then null; end $$;
select cron.schedule('rentas-financiero-cobros',    '0 12 * * *',       $$select public.cron_invoke_function('rentas-financiero?mode=cobros')$$);     -- 07:00 Austin diario
select cron.schedule('rentas-financiero-servicios', '0 12 5,15,25 * *', $$select public.cron_invoke_function('rentas-financiero?mode=servicios')$$);  -- 3x/mes
select cron.schedule('rentas-financiero-cierre',    '0 13 1 * *',       $$select public.cron_invoke_function('rentas-financiero?mode=cierre')$$);      -- día 1

-- ── ROLLBACK ──
--   select cron.unschedule('rentas-financiero-cobros');
--   select cron.unschedule('rentas-financiero-servicios');
--   select cron.unschedule('rentas-financiero-cierre');
--   drop policy if exists exec_sel on public.pm_payments; ... (los exec_sel/exec_ins)
--   drop owned by agentes_ia_exec; drop role agentes_ia_exec;
--   alter table public.agent_registry drop column if exists enabled;
