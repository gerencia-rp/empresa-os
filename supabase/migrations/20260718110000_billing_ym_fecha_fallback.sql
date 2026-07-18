-- billing_ym v3 (pm_expenses) — período del gasto: PRIORIZA tag Mes+Año; si el tag
-- Mes falta o no se reconoce, cae al MES+AÑO de la Fecha (expense_date). Antes un
-- gasto con Fecha pero sin tag Mes quedaba billing_ym null y desaparecía de todas
-- las agrupaciones mensuales. Sin período de ningún tipo → null ("revisar", no se
-- inventa). A 2026-07-18 el cambio afecta 0 filas (verificado: no hay gastos con
-- Fecha sin tag; los 16 null restantes no tienen ni tag ni Fecha y suman $0).
-- pm_payments NO se toca (pagos sin fecha ya tienen política propia: status 'revisar').
-- Drop+add de columna GENERADA: no toca datos. Rollback: re-aplicar 20260707110000.

alter table public.pm_expenses drop column if exists billing_ym;
alter table public.pm_expenses add column billing_ym text generated always as (
  coalesce(
    case when coalesce(year, extract(year from expense_date)::int) is null then null else
      case lower(btrim(coalesce(month,'')))
        when 'enero' then coalesce(year, extract(year from expense_date)::int)::text||'-01'
        when 'febrero' then coalesce(year, extract(year from expense_date)::int)::text||'-02'
        when 'marzo' then coalesce(year, extract(year from expense_date)::int)::text||'-03'
        when 'abril' then coalesce(year, extract(year from expense_date)::int)::text||'-04'
        when 'mayo' then coalesce(year, extract(year from expense_date)::int)::text||'-05'
        when 'junio' then coalesce(year, extract(year from expense_date)::int)::text||'-06'
        when 'julio' then coalesce(year, extract(year from expense_date)::int)::text||'-07'
        when 'agosto' then coalesce(year, extract(year from expense_date)::int)::text||'-08'
        when 'septiembre' then coalesce(year, extract(year from expense_date)::int)::text||'-09'
        when 'setiembre' then coalesce(year, extract(year from expense_date)::int)::text||'-09'
        when 'octubre' then coalesce(year, extract(year from expense_date)::int)::text||'-10'
        when 'noviembre' then coalesce(year, extract(year from expense_date)::int)::text||'-11'
        when 'diciembre' then coalesce(year, extract(year from expense_date)::int)::text||'-12'
        else null end
    end,
    case when expense_date is not null then
      extract(year from expense_date)::int::text || '-' || lpad(extract(month from expense_date)::int::text, 2, '0')
    end
  )
) stored;
