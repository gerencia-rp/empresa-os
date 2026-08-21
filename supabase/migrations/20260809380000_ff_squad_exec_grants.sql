-- ════════════════════════════════════════════════════════════════
-- 🏚 GRANTS aditivos de SOLO-LECTURA para agentes_ia_exec sobre Fix & Flip.
-- El Financiero de F&F (y luego el resto de la escuadra) lee estas tablas.
-- Least-privilege: SELECT + policy exec_sel to agentes_ia_exec using(true).
-- CERO write, CERO pm_credentials/PII sensible.
--
-- PII de inversionistas (regla dura #6): ff_investors se otorga por ALLOWLIST de
-- columnas (nombre/contacto/capital para cap table + dedup de CRM). Si en el futuro
-- se sincroniza SSN/Green Card/document_id, queda BLOQUEADO por defecto (no está en
-- el allowlist). Hoy esas columnas ni existen en el espejo (bloqueado en origen).
-- Aditivo (no toca policies existentes).
-- ════════════════════════════════════════════════════════════════

-- (1) Tablas ff_* de negocio: SELECT tabla completa (no tienen columnas PII sensibles)
do $$
declare t text;
begin
  foreach t in array array[
    'ff_deals','ff_hml_loans','ff_hml_payments','ff_draws','ff_overhead','ff_uw_config'
  ] loop
    execute format('grant select on public.%I to agentes_ia_exec', t);
    execute format('drop policy if exists exec_sel on public.%I', t);
    execute format('create policy exec_sel on public.%I for select to agentes_ia_exec using (true)', t);
  end loop;
end $$;

-- (2) ff_investors: SELECT SOLO por allowlist de columnas (PII sensible bloqueada por DB)
--     Excluidas por diseño: cualquier columna futura de SSN/Green Card/document_id/tax_id.
grant select (
  id, airtable_id, name, label, email, phone, city, state, ranges, stage,
  has_partner, partner_name, active, last_synced_at, archived_at,
  capital_aportado, capital_pagado, deal_rec_ids
) on public.ff_investors to agentes_ia_exec;
drop policy if exists exec_sel on public.ff_investors;
create policy exec_sel on public.ff_investors for select to agentes_ia_exec using (true);

-- ── ROLLBACK ── (destructivo: REVOKE — requiere OK)
--   do $$ declare t text; begin foreach t in array array['ff_deals','ff_hml_loans','ff_hml_payments','ff_draws','ff_overhead','ff_uw_config','ff_investors'] loop
--     execute format('drop policy if exists exec_sel on public.%I', t);
--     execute format('revoke select on public.%I from agentes_ia_exec', t);
--   end loop; end $$;
