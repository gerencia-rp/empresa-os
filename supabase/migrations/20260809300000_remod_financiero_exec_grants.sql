-- ════════════════════════════════════════════════════════════════
-- 🔨 GRANTS aditivos de SOLO-LECTURA para agentes_ia_exec sobre Remodelación.
-- El Financiero de Remodelación (y luego el resto de la escuadra) lee estas
-- tablas. Least-privilege: SELECT + policy exec_sel to agentes_ia_exec using(true).
-- CERO write, CERO pm_credentials/PII. Aditivo (no toca policies existentes).
-- ════════════════════════════════════════════════════════════════
do $$
declare t text;
begin
  foreach t in array array[
    'remodel_at_properties','remodel_material_payments','remodel_worker_hours',
    'remodel_crew_rates','remodel_projects','remodel_overhead'
  ] loop
    execute format('grant select on public.%I to agentes_ia_exec', t);
    execute format('drop policy if exists exec_sel on public.%I', t);
    execute format('create policy exec_sel on public.%I for select to agentes_ia_exec using (true)', t);
  end loop;
end $$;

-- ── ROLLBACK ── (destructivo: REVOKE — requiere OK)
--   do $$ declare t text; begin foreach t in array array['remodel_at_properties','remodel_material_payments','remodel_worker_hours','remodel_crew_rates','remodel_projects','remodel_overhead'] loop
--     execute format('drop policy if exists exec_sel on public.%I', t);
--     execute format('revoke select on public.%I from agentes_ia_exec', t);
--   end loop; end $$;
