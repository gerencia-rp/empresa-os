-- ════════════════════════════════════════════════════════════════
-- MES DE RENTA (billing month) — UNA definición por métrica, en la DB.
-- billing_ym = 'YYYY-MM' derivado del tag Mes/Año de Airtable (columna GENERADA:
-- imposible que el front lo calcule distinto). "Ingresos del mes" agrupa por esto;
-- paid_at queda SOLO para la vista de flujo de caja ("cobrado en el mes").
-- + pm_expenses.scope: 'casa' (📤 Gastos X Casa) | 'empresa' (Gastos x Empresa).
-- ADITIVA. Rollback al pie.
-- ════════════════════════════════════════════════════════════════

alter table public.pm_expenses add column if not exists scope text not null default 'casa';

alter table public.pm_payments add column if not exists billing_ym text generated always as (
  case when year is null then null else
    case lower(btrim(coalesce(month,'')))
      when 'enero' then year::text||'-01' when 'febrero'   then year::text||'-02'
      when 'marzo' then year::text||'-03' when 'abril'     then year::text||'-04'
      when 'mayo'  then year::text||'-05' when 'junio'     then year::text||'-06'
      when 'julio' then year::text||'-07' when 'agosto'    then year::text||'-08'
      when 'septiembre' then year::text||'-09' when 'setiembre' then year::text||'-09'
      when 'octubre' then year::text||'-10' when 'noviembre' then year::text||'-11'
      when 'diciembre' then year::text||'-12' else null end
  end
) stored;

alter table public.pm_expenses add column if not exists billing_ym text generated always as (
  case when year is null then null else
    case lower(btrim(coalesce(month,'')))
      when 'enero' then year::text||'-01' when 'febrero'   then year::text||'-02'
      when 'marzo' then year::text||'-03' when 'abril'     then year::text||'-04'
      when 'mayo'  then year::text||'-05' when 'junio'     then year::text||'-06'
      when 'julio' then year::text||'-07' when 'agosto'    then year::text||'-08'
      when 'septiembre' then year::text||'-09' when 'setiembre' then year::text||'-09'
      when 'octubre' then year::text||'-10' when 'noviembre' then year::text||'-11'
      when 'diciembre' then year::text||'-12' else null end
  end
) stored;

-- ─────────────────────────────────────────────────────────────────
-- ROLLBACK:
--   alter table public.pm_payments drop column if exists billing_ym;
--   alter table public.pm_expenses drop column if exists billing_ym;
--   alter table public.pm_expenses drop column if exists scope;
-- ─────────────────────────────────────────────────────────────────
