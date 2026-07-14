-- 💎 Portal del inversionista v2 — seed aditivo de la casa EJEMPLO del Excel
-- (2315 Dove Springs Dr): params que el portal muestra en "Info del deal" y el
-- evento de refinanciación. Idempotente (on conflict do nothing) — NO pisa nada.
-- Los valores 'real:*' salen del espejo ff_deals de Airtable a la fecha del seed;
-- si cambian en Airtable, se editan desde /inversionistas (admin) como cualquier param.

insert into inv_model_params (property_id, key, value, fuente, descripcion)
values
  ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606', 'estrategia', 'Fix and hold', 'real:ff_deals', 'Estrategia del deal (campo Estrategia de Airtable)'),
  ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606', 'plan_salida', 'Hold a 31 años: refinanciación a 30 años y la renta paga la deuda; salida por venta o nuevo refi', 'modelo', 'Plan de salida comunicado al inversionista'),
  ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606', 'cashout_real', '22207.13', 'real:ff_deals', 'Cash-out REAL del refi (campo Cashout de Airtable) — el portal lo prefiere sobre el calculado'),
  ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606', 'es_ejemplo', 'true', 'seed', 'Casa de ejemplo del Excel "Modelo financiero - Renta VF" (badge solo en admin)')
on conflict (property_id, key) do nothing;
