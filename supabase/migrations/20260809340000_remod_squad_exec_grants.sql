-- ════════════════════════════════════════════════════════════════
-- 🔨 GRANTS aditivos para el resto de la escuadra Remodelación (solo-lectura).
-- Optimización lee remodel_stage_deviation + weekly_activities; Reportes lee
-- weekly_activities. Least-privilege: SELECT (+ policy exec_sel donde hay RLS).
-- CERO write, CERO PII.
-- ════════════════════════════════════════════════════════════════
grant select on public.remodel_stage_deviation to agentes_ia_exec;   -- vista/tabla sin RLS

grant select on public.weekly_activities to agentes_ia_exec;         -- RLS on → policy
drop policy if exists exec_sel on public.weekly_activities;
create policy exec_sel on public.weekly_activities for select to agentes_ia_exec using (true);

-- ── ROLLBACK ── (destructivo)
--   drop policy if exists exec_sel on public.weekly_activities;
--   revoke select on public.weekly_activities from agentes_ia_exec;
--   revoke select on public.remodel_stage_deviation from agentes_ia_exec;
