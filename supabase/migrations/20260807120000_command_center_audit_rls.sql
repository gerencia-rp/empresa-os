-- ════════════════════════════════════════════════════════════════
-- 🛰 COMMAND CENTER (JARVIS) — RLS admin-only para agent_audit_log.
-- Aditivo. NO borra datos ni toca policies existentes (agentes_ia sigue igual).
--
-- Problema: agent_audit_log tiene RLS activo pero SOLO policies para el rol
-- `agentes_ia`. Un admin logueado (rol `authenticated`) no podía LEER el feed
-- de bitácora ni ESCRIBIR la traza al aprobar/rechazar desde el front.
--
-- Fix: dos policies admin-only (is_admin() = profiles.role='admin' AND active).
-- Solo el dueño (admin) ve la bitácora y escribe al aprobar/rechazar en el
-- Command Center. Los demás usuarios autenticados siguen SIN acceso a esta tabla.
-- ════════════════════════════════════════════════════════════════

alter table public.agent_audit_log enable row level security;

-- Leer la bitácora (feed del Command Center) — solo admin.
drop policy if exists command_center_audit_admin_read on public.agent_audit_log;
create policy command_center_audit_admin_read
  on public.agent_audit_log for select to authenticated
  using (public.is_admin());

-- Escribir la traza al aprobar/rechazar una propuesta — solo admin.
drop policy if exists command_center_audit_admin_ins on public.agent_audit_log;
create policy command_center_audit_admin_ins
  on public.agent_audit_log for insert to authenticated
  with check (public.is_admin());

-- ── ROLLBACK ──
--   drop policy if exists command_center_audit_admin_read on public.agent_audit_log;
--   drop policy if exists command_center_audit_admin_ins  on public.agent_audit_log;
