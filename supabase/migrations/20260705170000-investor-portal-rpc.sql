-- FF M4: RPC del portal del inversionista — AISLAMIENTO por email del JWT (SECURITY DEFINER).
-- El portal usa SOLO este RPC. Un inversionista autenticado recibe únicamente SUS proyectos/capital.
CREATE OR REPLACE FUNCTION public.investor_portal() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE em text; inv record; deals jsonb; resumen jsonb;
BEGIN
  em := lower(coalesce(auth.jwt() ->> 'email', ''));
  IF em = '' THEN RETURN jsonb_build_object('ok', false, 'error', 'sin sesión'); END IF;
  SELECT * INTO inv FROM ff_investors WHERE active AND lower(coalesce(email,'')) = em LIMIT 1;
  IF inv IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'email no registrado como inversionista'); END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'address', d.address, 'city', d.city, 'stage', d.stage,
    'capital', d.capital_inversionista, 'rentabilidad_prometida', d.rentabilidad_prometida,
    'utilidad_entregada', d.utilidad_entregada, 'ownership_pct', d.ownership_pct,
    'renta_mensual', d.renta_mensual, 'gastos_mensuales', d.gastos_mensuales,
    'avance_obra', r.avance_real, 'avance_pct', r.avance_pct, 'proceso_obra', r.proceso
  ) ORDER BY d.address), '[]'::jsonb) INTO deals
  FROM ff_deals d
  LEFT JOIN remodel_at_properties r ON r.property_id = d.property_id AND r.active
  WHERE d.active AND d.investor_rec_ids IS NOT NULL
    AND position(inv.airtable_id in d.investor_rec_ids) > 0;

  resumen := jsonb_build_object(
    'capital_aportado', inv.capital_aportado, 'capital_pagado', inv.capital_pagado,
    'capital_pendiente', coalesce(inv.capital_aportado,0) - coalesce(inv.capital_pagado,0),
    'n_proyectos', jsonb_array_length(deals));
  RETURN jsonb_build_object('ok', true, 'nombre', inv.name, 'label', inv.label, 'resumen', resumen, 'proyectos', deals);
END; $$;
REVOKE ALL ON FUNCTION public.investor_portal() FROM public;
GRANT EXECUTE ON FUNCTION public.investor_portal() TO authenticated;
