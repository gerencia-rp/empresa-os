-- RM-C2: control exhaustivo de presupuesto por casa. Aditivo.
CREATE TABLE IF NOT EXISTS public.remodel_material_payments (
  airtable_id text PRIMARY KEY,
  address text, address_norm text, property_id uuid,
  precio numeric, fecha date, categoria text, orden text,
  active boolean DEFAULT true, archived_at timestamptz, last_synced_at timestamptz DEFAULT now()
);
ALTER TABLE public.remodel_material_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rmp_read ON public.remodel_material_payments;
CREATE POLICY rmp_read ON public.remodel_material_payments FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_rmp_norm ON public.remodel_material_payments(address_norm) WHERE active;

-- umbral de alerta de sobrecosto (config, no hardcode)
INSERT INTO public.remodel_forecast_params (key, value, label) VALUES
  ('alerta_sobrecosto_pct', 10, 'Alerta de sobrecosto: costo real > presupuesto × (1 + pct/100)')
ON CONFLICT (key) DO NOTHING;

-- Vista: presupuesto vs real EXHAUSTIVO por casa (material de pagos + MO de horas×rate)
CREATE OR REPLACE VIEW public.v_remodel_presupuesto_casa AS
WITH mo AS (
  SELECT r.airtable_id, sum(ps.pago) mo_real, sum(ps.horas) horas
  FROM public.remodel_at_properties r
  JOIN public.remodel_worker_pay_summary ps
    ON length(ps.casa_norm) >= 4 AND position(ps.casa_norm in norm_casa(r.address)) > 0
  WHERE r.active GROUP BY r.airtable_id
),
mat AS (
  SELECT r.airtable_id, sum(mp.precio) mat_pagos
  FROM public.remodel_at_properties r
  JOIN public.remodel_material_payments mp ON mp.active AND mp.address_norm = norm_casa(r.address)
  WHERE r.active GROUP BY r.airtable_id
)
SELECT r.airtable_id, r.property_id, r.address, r.proceso,
  r.presupuesto_interno presupuesto,
  coalesce(mat.mat_pagos, r.gasto_materiales) mat_real,
  r.gasto_materiales mat_espejo,
  mo.mo_real, mo.horas,
  coalesce(mat.mat_pagos, r.gasto_materiales, 0) + coalesce(mo.mo_real, 0) total_real,
  CASE WHEN coalesce(r.presupuesto_interno,0) > 0
    THEN round((coalesce(mat.mat_pagos, r.gasto_materiales, 0) + coalesce(mo.mo_real, 0)) / r.presupuesto_interno * 100)
    ELSE NULL END pct_gastado,
  CASE WHEN coalesce(r.presupuesto_interno,0) > 0 THEN
    (coalesce(mat.mat_pagos, r.gasto_materiales, 0) + coalesce(mo.mo_real, 0)) >
    r.presupuesto_interno * (1 + coalesce((SELECT value FROM public.remodel_forecast_params WHERE key='alerta_sobrecosto_pct'), 10) / 100)
  ELSE false END sobrecosto
FROM public.remodel_at_properties r
LEFT JOIN mo ON mo.airtable_id = r.airtable_id
LEFT JOIN mat ON mat.airtable_id = r.airtable_id
WHERE r.active;
