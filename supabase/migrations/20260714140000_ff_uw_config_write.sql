-- ════════════════════════════════════════════════════════════════
-- FIX RLS (14-jul, bug del CEO): ff_uw_config solo tenía policies de SELECT — TODA escritura de la
-- UI (apCfgSet: aplicar $/sqft calibrado, bias, hold, tasas por zip, recalibración ARV) fallaba con
-- "new row violates row-level security policy". Escritura = área fix-flip (como ff_underwriting_analyses).
-- DELETE sigue bloqueado (las keys no se borran, se pisan). Rollback: drop policy ff_uw_config_write_ins,
-- ff_uw_config_write_upd on ff_uw_config;
-- ════════════════════════════════════════════════════════════════
drop policy if exists ff_uw_config_write_ins on public.ff_uw_config;
create policy ff_uw_config_write_ins on public.ff_uw_config
  for insert to authenticated with check (public.has_area('fix-flip'));
drop policy if exists ff_uw_config_write_upd on public.ff_uw_config;
create policy ff_uw_config_write_upd on public.ff_uw_config
  for update to authenticated using (public.has_area('fix-flip')) with check (public.has_area('fix-flip'));
