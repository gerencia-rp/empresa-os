-- ════════════════════════════════════════════════════════════════
-- ARV CERTERO (directiva 13-jul) · calibración medida contra tasaciones REALES.
-- arv_calibracion: cada corrida de back-test (params probados + MdAPE + sesgo + detalle por casa).
-- v_arv_calibracion: la ÚLTIMA corrida activa — la UI muestra "precisión ±X% sobre N casas".
-- Filtros duros de tasador como nuevos defaults (directiva): ≤1 mi · ventas ≤6 meses · sqft ±15%.
-- Soft-delete siempre (active/archived_at). RLS fix-flip. Vista security_invoker (regla dura).
-- Rollback: drop view v_arv_calibracion; drop table arv_calibracion;
--   update ff_uw_config set value=0.8 where key='arv_filtro_dist_mi';
--   update ff_uw_config set value=12 where key='arv_filtro_meses';
--   update ff_uw_config set value=25 where key='arv_filtro_sqft_pct';
-- ════════════════════════════════════════════════════════════════
create table if not exists public.arv_calibracion (
  id uuid primary key default gen_random_uuid(),
  run_at timestamptz not null default now(),
  n_casas int not null,
  mdape numeric,             -- error absoluto MEDIANO % (la métrica de la meta: ≤6)
  mape numeric,              -- error absoluto promedio %
  sesgo numeric,             -- error medio % (meta: ±2)
  params jsonb not null default '{}'::jsonb,     -- parámetros calibrados aplicados
  detalle jsonb not null default '[]'::jsonb,    -- por casa: pred vs real vs err%
  fuente text default 'backtest',                -- backtest | recalibracion_auto
  active boolean not null default true,
  archived_at timestamptz
);
alter table public.arv_calibracion enable row level security;
drop policy if exists arv_calib_rw on public.arv_calibracion;
create policy arv_calib_rw on public.arv_calibracion for all to authenticated
  using (public.has_area('fix-flip')) with check (public.has_area('fix-flip'));

create or replace view public.v_arv_calibracion as
select id, run_at, n_casas, mdape, mape, sesgo, params, detalle, fuente
from public.arv_calibracion where active
order by run_at desc limit 1;
alter view public.v_arv_calibracion set (security_invoker = on);

-- filtros duros del tasador (directiva ARV certero) — pisan los defaults viejos (0.8mi/12m/±25%)
update public.ff_uw_config set value = 1.0, updated_at = now() where key = 'arv_filtro_dist_mi';
update public.ff_uw_config set value = 6,   updated_at = now() where key = 'arv_filtro_meses';
update public.ff_uw_config set value = 15,  updated_at = now() where key = 'arv_filtro_sqft_pct';
insert into public.ff_uw_config (key, value, label)
select * from (values
  ('arv_outlier_mad_k', 2.5::numeric, 'Outliers estadísticos: umbral MAD (z robusto) para excluir comps'),
  ('arv_cv_warn_pct',   10::numeric,  'Confianza: CV de comps ajustados que baja a media'),
  ('arv_cv_alto_pct',   15::numeric,  'Confianza: CV que baja a baja'),
  ('arv_triang_warn_pct', 8::numeric, 'Triangulación: divergencia entre señales que dispara ⚠'),
  ('arv_assessed_factor', 0::numeric, 'Assessed×factor → señal de mercado (0 = sin calibrar aún)'),
  ('arv_filtro_tipo', 1::numeric,     'Filtro duro: mismo tipo de propiedad (1=sí)')
) as v(key, value, label)
where not exists (select 1 from public.ff_uw_config c where c.key = v.key);
