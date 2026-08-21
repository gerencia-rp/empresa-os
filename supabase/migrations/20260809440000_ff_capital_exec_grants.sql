-- ════════════════════════════════════════════════════════════════
-- 🏦 GRANTS aditivos para el agente Capital & Inversionistas (Fix & Flip).
-- Cap table por casa: SELECT en inv_holdings (sin PII) + inv_distributions POR
-- ALLOWLIST de columnas (monto/estado/tipo; se EXCLUYEN k1_url/comprobante_url/
-- notas — documentos fiscales/personales). Least-privilege, cero write.
-- ════════════════════════════════════════════════════════════════
grant select on public.inv_holdings to agentes_ia_exec;
drop policy if exists exec_sel on public.inv_holdings;
create policy exec_sel on public.inv_holdings for select to agentes_ia_exec using (true);

grant select (
  id, investor_airtable_id, property_id, fecha, tipo, monto, estado, active, archived_at, created_at, updated_at, origen
) on public.inv_distributions to agentes_ia_exec;
drop policy if exists exec_sel on public.inv_distributions;
create policy exec_sel on public.inv_distributions for select to agentes_ia_exec using (true);

-- ── ROLLBACK ── (destructivo)
--   drop policy if exists exec_sel on public.inv_holdings; revoke select on public.inv_holdings from agentes_ia_exec;
--   drop policy if exists exec_sel on public.inv_distributions; revoke select on public.inv_distributions from agentes_ia_exec;
