-- ════════════════════════════════════════════════════════════════
-- Scope B obs #8 (CEO 13-jul) · base del préstamo HML en el UW
-- Base = compra + DRAW TOTAL (ej: 200,000 + 135,080 = 335,080 · 90% = 301,572).
-- 'rehab' = modo legacy (calibración HUD Bethune, compra + rehab holdback) — editable, no hardcode.
-- Rollback: delete from ff_uw_config where key = 'uw_base_modo';
-- ════════════════════════════════════════════════════════════════
insert into public.ff_uw_config (key, value, text_value, label)
select 'uw_base_modo', null, 'draw', 'Base del préstamo en Calc 1B: draw = compra + DRAW TOTAL (obs #8 CEO) · rehab = compra + rehab (legacy Bethune)'
where not exists (select 1 from public.ff_uw_config where key = 'uw_base_modo');
