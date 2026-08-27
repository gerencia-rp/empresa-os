-- ================================================================
-- PROPERTY MANAGEMENT: 5% -> 4% (decision CEO, 27-ago-2026)
--
-- El item "Pago Property Management" NO se materializa en filas: se CALCULA dentro de
-- inv_ledger leyendo este mismo key. Por eso bajar el porcentaje es UN update:
--   * todos los meses NO editados se recalculan solos en la proxima lectura del ledger;
--   * la etiqueta se arma con el mismo valor -> pasa a "Pago Property Management (4%)"
--     y la fuente a 'OS:pm_fee(auto 4% de la renta cobrada del mes)';
--   * los meses EDITADOS A MANO (inv_pm_fee_overrides activos) NO se tocan: usan o.monto,
--     no el porcentaje. Siguen mostrando "(editado a mano)" con su valor.
-- No hace falta backfill ni migracion de datos: no hay datos que migrar.
--
-- Verificado tras aplicarlo (renta del mes x 4%):
--   4916 Barkbridge  2,700 -> 108 | 3,500 -> 140 | 2,000 -> 80 | 1,300 -> 52
--   5003 Michelle    3,700 -> 148 | 2,500 -> 100   (jul-26 sigue sin generarse: manual de $148)
--   902 Virginia     5,100 -> 204 | 4,490 -> 179.60 (may-26 sin renta: sin item)
--
-- ⚠ NO CONFUNDIR con `pm_fee_pct` (=4), que es el PM fee del UNDERWRITING. A partir de hoy
-- los dos valen 4, pero son claves distintas con significados distintos: NO consolidarlas.
--
-- ROLLBACK: update ff_uw_config set value = 5 where key = 'inv_pm_fee_pct';
-- ================================================================
update public.ff_uw_config
   set value = 4, updated_at = now()
 where key = 'inv_pm_fee_pct';
