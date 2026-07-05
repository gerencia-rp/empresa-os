-- Contable P0-1: P&L consolidado del holding — una fila por empresa + consolidado.
-- Solo agrega (vista). Definiciones = las verificadas en auditoría (una sola por métrica).
-- FF: separa REALIZADO (deals con ciclo cerrado: vendida/refinanciada/rentada) de INYECTADO (vivas).
CREATE OR REPLACE VIEW public.v_holding_pnl AS
WITH remodel AS (
  SELECT
    sum(monto_real) AS ingreso,
    sum((coalesce(gasto_materiales,0)+coalesce(gasto_trabajadores,0))*1.05) AS costo,
    (SELECT sum(monto) FROM remodel_overhead WHERE active
       AND NOT (source='gastos_empresariales' AND categoria ~* 'veh|activo|compra|maquin|equipo|mobil')) AS overhead,
    sum(ganancia) AS utilidad_bruta
  FROM remodel_at_properties WHERE active AND proceso='Finalizado'
),
ff AS (
  SELECT
    (SELECT sum(d.net_total) FROM ff_draws d JOIN ff_deals x ON x.address_norm=d.address_norm AND x.active
       WHERE d.active AND x.stage IN ('vendida','refinanciada','rentada')) AS realizado,
    (SELECT sum(d.net_total) FROM ff_draws d JOIN ff_deals x ON x.address_norm=d.address_norm AND x.active
       WHERE d.active AND x.stage NOT IN ('vendida','refinanciada','rentada')) AS inyectado,
    (SELECT sum(monto) FROM ff_overhead WHERE active) AS overhead
),
rentas AS (
  SELECT
    (SELECT sum(amount) FROM pm_payments WHERE active AND type='ingreso' AND status='pagado') AS ingreso,
    (SELECT sum(amount) FROM pm_expenses WHERE active AND coalesce(category,'') <> 'operational') AS costo_directo,
    (SELECT sum(amount) FROM pm_expenses WHERE active AND category='operational') AS overhead
)
SELECT 'remodelacion' AS empresa, round(ingreso) AS ingreso, round(costo) AS costo_real,
  round(overhead) AS overhead, round(utilidad_bruta) AS utilidad_bruta,
  round(utilidad_bruta - overhead) AS ebitda, NULL::numeric AS realizado, NULL::numeric AS inyectado
FROM remodel
UNION ALL
SELECT 'fix_flip', NULL, NULL, round(overhead), NULL,
  round(coalesce(realizado,0) - overhead) AS ebitda, round(realizado), round(inyectado)
FROM ff
UNION ALL
SELECT 'rentas', round(ingreso), round(costo_directo), round(overhead),
  round(ingreso - costo_directo) AS utilidad_bruta,
  round(ingreso - costo_directo - overhead) AS ebitda, NULL, NULL
FROM rentas
UNION ALL
SELECT 'educacion', NULL, NULL, NULL, NULL, NULL, NULL, NULL
UNION ALL
SELECT 'consolidado',
  round((SELECT ingreso FROM remodel) + (SELECT ingreso FROM rentas)),
  round((SELECT costo FROM remodel) + (SELECT costo_directo FROM rentas)),
  round((SELECT overhead FROM remodel) + (SELECT overhead FROM ff) + (SELECT overhead FROM rentas)),
  round((SELECT utilidad_bruta FROM remodel) + (SELECT ingreso - costo_directo FROM rentas)),
  round(((SELECT utilidad_bruta FROM remodel) - (SELECT overhead FROM remodel))
      + (coalesce((SELECT realizado FROM ff),0) - (SELECT overhead FROM ff))
      + ((SELECT ingreso FROM rentas) - (SELECT costo_directo FROM rentas) - (SELECT overhead FROM rentas))),
  round((SELECT realizado FROM ff)), round((SELECT inyectado FROM ff));
