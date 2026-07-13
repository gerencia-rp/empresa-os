-- ════════════════════════════════════════════════════════════════
-- B8 · NÓMINA POR LINK (auditoría 2026-07-13) — ADITIVA, rollback al pie.
-- La tabla Horas de Airtable YA tiene el link a Personal en Campo + lookup "Pago x Hora" +
-- fórmula "Pago Total Dia". El espejo ahora los guarda (worker_rec_id / rate_hora / prop_rec_id)
-- y el ledger joinea POR RECID — se acabó el re-match por texto libre ("OSCAR LIDER"/"Oscar").
-- Devengado = Σ Pago Total Dia (fórmula de Airtable = fuente única; fallback horas×tarifa).
-- Deuda JAMÁS negativa: el sobrepago se muestra aparte (no se esconde).
-- Las tarifas faltantes se cargan EN AIRTABLE (dato de negocio — no se inventa acá).
-- ════════════════════════════════════════════════════════════════
alter table public.remodel_worker_hours add column if not exists worker_rec_id text;
alter table public.remodel_worker_hours add column if not exists rate_hora numeric;
alter table public.remodel_worker_hours add column if not exists prop_rec_id text;
create index if not exists rwh_worker_rec_idx on public.remodel_worker_hours (worker_rec_id);

-- create or replace no puede agregar columnas → drop + recreate (es una vista, sin datos; reversible)
drop view if exists public.v_remodel_nomina_ledger;
create view public.v_remodel_nomina_ledger as
select
  coalesce(cr.nombre, wh.worker)                                        as worker,
  coalesce(nullif(trim(split_part(wh.casa, ',', 1)), ''), '(sin casa)') as casa,
  wh.casa_norm,
  round(sum(wh.horas), 1)                                               as horas,
  -- devengado: Pago Total Dia (Airtable) → fallback horas × tarifa (lookup del link → tabla Cuadrillas)
  round(sum(coalesce(wh.pago_total_dia, wh.horas * coalesce(wh.rate_hora, cr.pago_x_hora, 0))))  as devengado,
  round(sum(coalesce(wh.pago, 0)))                                      as pagado,
  greatest(0, round(sum(coalesce(wh.pago_total_dia, wh.horas * coalesce(wh.rate_hora, cr.pago_x_hora, 0))) - sum(coalesce(wh.pago, 0)))) as deuda,
  greatest(0, round(sum(coalesce(wh.pago, 0)) - sum(coalesce(wh.pago_total_dia, wh.horas * coalesce(wh.rate_hora, cr.pago_x_hora, 0))))) as sobrepago,
  max(wh.fecha)                                                         as ultima_fecha,
  bool_and(wh.pago_total_dia is not null or wh.rate_hora is not null or cr.pago_x_hora is not null) as rate_conocido,
  bool_and(wh.worker_rec_id is not null)                                as identidad_por_link
from public.remodel_worker_hours wh
left join public.remodel_crew_rates cr
  on (wh.worker_rec_id is not null and cr.airtable_id = wh.worker_rec_id)
  or (wh.worker_rec_id is null and lower(trim(cr.nombre)) = lower(trim(wh.worker)))  -- fallback SOLO filas legacy sin link
where wh.worker is not null or wh.worker_rec_id is not null
group by 1, 2, 3;

alter view public.v_remodel_nomina_ledger set (security_invoker = on);

-- ─── ROLLBACK ───
-- (la vista anterior está en 20260708100000; recrearla desde ahí)
-- alter table public.remodel_worker_hours drop column if exists worker_rec_id, drop column if exists rate_hora, drop column if exists prop_rec_id;
