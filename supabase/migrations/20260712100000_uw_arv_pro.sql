-- ════════════════════════════════════════════════════════════════
-- 🏷️ ARV PROFESIONAL (Calc 2 de la Suite UW) — ADITIVA, rollback al pie.
-- ff_deals.appraisal_link: espejo de "Link Appraisal" (fldOg97WmkVIQ0k0o, PDF en Drive).
-- ff_uw_config: TODOS los factores del tasador editables (cero hardcode) — ajustes 1004,
--   filtros de comps, reconciliación, exclusiones de calibración y meta de error.
-- Semillas de ajuste: GLA ~$90/sqft · cuarto/baño $15k · piscina $25k · garaje $20k ·
--   fireplace $1.5k (anclas: appraisals de Michelle 0% y Echo −3.6%).
-- ════════════════════════════════════════════════════════════════
alter table public.ff_deals add column if not exists appraisal_link text;

insert into public.ff_uw_config (key, value, label) values
  -- motor de ajustes (formulario 1004)
  ('arv_adj_gla_psf',        '90',    'ARV · ajuste GLA $/sqft (default; override por zip: arv_adj_gla_psf_<zip>)'),
  ('arv_adj_cuarto',         '15000', 'ARV · ajuste por cuarto (±)'),
  ('arv_adj_bano',           '15000', 'ARV · ajuste por baño (±)'),
  ('arv_adj_piscina',        '25000', 'ARV · ajuste por piscina/spa (±)'),
  ('arv_adj_garaje',         '20000', 'ARV · ajuste por garaje (±)'),
  ('arv_adj_fireplace',      '1500',  'ARV · ajuste por fireplace (±)'),
  ('arv_adj_lote_psf',       '2',     'ARV · ajuste por lote $/sqft de diferencia (áreas urbanas)'),
  ('arv_adj_ano_pct',        '0.5',   'ARV · ajuste por año de antigüedad (% del precio del comp por año de diferencia)'),
  ('arv_mercado_pct_mes',    '0',     'ARV · tendencia del mercado %/mes (ajuste por fecha de venta; 0 = plano)'),
  -- filtros de comparables (defaults del CEO)
  ('arv_filtro_dist_mi',     '0.8',   'ARV · filtro: distancia máx (millas)'),
  ('arv_filtro_meses',       '12',    'ARV · filtro: antigüedad máx de la venta (meses)'),
  ('arv_filtro_sqft_pct',    '25',    'ARV · filtro: rango sqft ±% vs subject'),
  ('arv_filtro_camas',       '1',     'ARV · filtro: diferencia máx de camas (±)'),
  ('arv_filtro_banos',       '1.5',   'ARV · filtro: diferencia máx de baños (±)'),
  ('arv_filtro_ano',         '20',    'ARV · filtro: diferencia máx de año construcción (±)'),
  ('arv_comps_min',          '3',     'ARV · mínimo de comps para reconciliar'),
  ('arv_comps_max',          '8',     'ARV · máximo de comps mostrados/reconciliados'),
  -- reconciliación y confianza
  ('arv_gross_adj_warn_pct', '25',    'ARV · warning si gross adj % del comp supera esto (estándar 1004)'),
  ('arv_net_adj_warn_pct',   '15',    'ARV · warning si net adj % del comp supera esto'),
  ('arv_rango_pct',          '6',     'ARV · rango conservador/optimista = ±% sobre el reconciliado'),
  ('arv_bias_pct',           '0',     'ARV · corrección de sesgo global % (la sugiere la calibración, la aplica un humano)'),
  -- calibración por desviación (ARV vs appraisal real)
  ('arv_meta_error_pct',     '5',     'ARV · meta de error absoluto promedio vs appraisal (%)')
on conflict (key) do nothing;

-- exclusiones de calibración: string → va en text_value (value es numeric)
insert into public.ff_uw_config (key, value, text_value, label) values
  ('arv_calib_excluir', 0, '407 capitol,6504 stonleigh,4916 barkbridge,1601 slaughter', 'ARV · casas EXCLUIDAS de la calibración (atípicos/datos sucios, separadas por coma)')
on conflict (key) do nothing;

-- ─── ROLLBACK ───
-- alter table public.ff_deals drop column if exists appraisal_link;
-- delete from public.ff_uw_config where key like 'arv\_%' escape '\';
