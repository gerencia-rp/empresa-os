-- ════════════════════════════════════════════════════════════════
-- CC FF rediseño (14-jul) · campos que faltaban en el espejo — ADITIVA.
-- modelo_negocio (flddjD6WsvC98sM1k): "Prestación de Servicios como Operador" excluye del portafolio.
-- estrategia (fldyijwnFRD2yFrx5): palabra COMPLETA ("Fix and hold"/"Fix and flip"/"Wholesale") —
--   strategy (flip/hold) queda para lógica legacy.
-- draws_menos_deficit (fldL4iMolqEibENFj): la fórmula Airtable [Total Draws − Déficit Total] que
--   define el déficit por casa (net_total mapea OTRO campo — no tocarlo).
-- Rollback: alter table ff_deals drop column modelo_negocio, drop column estrategia;
--           alter table ff_draws drop column draws_menos_deficit;
-- ════════════════════════════════════════════════════════════════
alter table public.ff_deals add column if not exists modelo_negocio text;
alter table public.ff_deals add column if not exists estrategia text;
alter table public.ff_draws add column if not exists draws_menos_deficit numeric;
