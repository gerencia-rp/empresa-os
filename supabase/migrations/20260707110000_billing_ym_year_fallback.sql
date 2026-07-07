-- billing_ym v2 — si la fila tiene tag Mes pero NO tag Año, usar el año de la fecha
-- (paid_at/expense_date). Caso real: 7 gastos "junio/mayo" sin Año caían al mes de su
-- fecha; ahora "mayo sin año, fecha 23-jun-2026" → 2026-05 (el tag manda).
-- Reemplaza la columna generada de 20260707100000 (drop+add de columna GENERADA:
-- no toca datos, se recalcula sola). Rollback: re-aplicar la versión de 20260707100000.

alter table public.pm_expenses drop column if exists billing_ym;
alter table public.pm_expenses add column billing_ym text generated always as (
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
  end
) stored;

alter table public.pm_payments drop column if exists billing_ym;
alter table public.pm_payments add column billing_ym text generated always as (
  case when coalesce(year, extract(year from paid_at)::int) is null then null else
    case lower(btrim(coalesce(month,'')))
      when 'enero' then coalesce(year, extract(year from paid_at)::int)::text||'-01'
      when 'febrero' then coalesce(year, extract(year from paid_at)::int)::text||'-02'
      when 'marzo' then coalesce(year, extract(year from paid_at)::int)::text||'-03'
      when 'abril' then coalesce(year, extract(year from paid_at)::int)::text||'-04'
      when 'mayo' then coalesce(year, extract(year from paid_at)::int)::text||'-05'
      when 'junio' then coalesce(year, extract(year from paid_at)::int)::text||'-06'
      when 'julio' then coalesce(year, extract(year from paid_at)::int)::text||'-07'
      when 'agosto' then coalesce(year, extract(year from paid_at)::int)::text||'-08'
      when 'septiembre' then coalesce(year, extract(year from paid_at)::int)::text||'-09'
      when 'setiembre' then coalesce(year, extract(year from paid_at)::int)::text||'-09'
      when 'octubre' then coalesce(year, extract(year from paid_at)::int)::text||'-10'
      when 'noviembre' then coalesce(year, extract(year from paid_at)::int)::text||'-11'
      when 'diciembre' then coalesce(year, extract(year from paid_at)::int)::text||'-12'
      else null end
  end
) stored;
