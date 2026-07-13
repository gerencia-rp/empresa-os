-- ════════════════════════════════════════════════════════════════
-- O8+P2 · DIVERGENCIA LEGACY vs DERIVADO (auditoría 2026-07-13) — ADITIVA.
-- Regla: si el campo manual/legacy ≠ el derivado → ALERTA (no mostrar el manual en silencio).
-- Casos vivos al crearla: 3 obras con avance legacy ≠ Planner (incl. Denfield 45% vs 96%) ·
-- Bramble "Unidades" manual 3 vs rollup real 5.
-- Nota: retirar el singleSelect en la UI de Airtable requiere acción humana (la API no borra
-- campos) — anotado en IMPLEMENTATION_LOG; mientras tanto la app lee Planner-first.
-- ════════════════════════════════════════════════════════════════
create or replace view public.v_divergencias_legacy as
select 'avance_obra' as tipo, r.property_id, split_part(r.address, ',', 1) as casa,
  r.avance_pct::text as valor_legacy, r.avance_real::text as valor_derivado,
  'Airtable singleSelect "Porcentaje avance obra" vs % real del Planner' as detalle
from public.remodel_at_properties r
where r.active and r.avance_real is not null and r.avance_pct is not null
  and abs(r.avance_real - r.avance_pct) > 10
union all
select 'unidades_casa', p.property_id, split_part(p.name, ',', 1),
  p.total_units::text, u.n::text,
  'Casas.Unidades (manual) vs conteo real de 🚪 Unidades'
from public.pm_properties p
join lateral (
  select count(*) n from public.pm_units u
  where u.property_id = p.id and u.active and u.external_id like 'unit-rec%' and u.unit_type is not null
) u on true
where p.active and p.total_units is not null and p.total_units <> u.n and u.n > 0;
alter view public.v_divergencias_legacy set (security_invoker = on);

-- ─── ROLLBACK ───
-- drop view if exists public.v_divergencias_legacy;
