-- RN-M3: property_id backbone completo en Rentas + norm_casa mejorada (abreviaturas). Aditivo.
CREATE OR REPLACE FUNCTION public.norm_casa(txt text) RETURNS text AS $$
  SELECT regexp_replace(regexp_replace(regexp_replace(
    lower(regexp_replace(coalesce(txt,''),
      '(ee\.?\s*uu\.?|\yusa\y|\ytx\y|\ytexas\y|austin|round rock|marlin|pflugerville|manor|del valle)', '', 'gi')),
    '[0-9]{5}(-[0-9]{4})?', '', 'g'),
    '\y(dr|st|rd|ave|ln|trail|trl|cove|cv|way|path|blvd|ct|pl|crst|crest|street|drive|road|avenue|lane|place|court)\y', '', 'g'),
    '[^a-z0-9]', '', 'g');
$$ LANGUAGE sql IMMUTABLE;

-- RPC self-healing para Rentas (molde FF/Remodel): mint + link por dirección normalizada
CREATE OR REPLACE FUNCTION public.pm_backfill_property_ids() RETURNS jsonb AS $$
DECLARE minted int; linked int;
BEGIN
  INSERT INTO public.properties (address, city, state, user_id, property_type, status)
  SELECT DISTINCT ON (norm_casa(pm.address)) pm.address, NULL, 'TX',
    '203f8d94-fea1-4031-b468-2580887bbfca'::uuid, 'rental', 'renting'
  FROM public.pm_properties pm
  WHERE pm.active AND coalesce(norm_casa(pm.address),'') <> '' AND pm.property_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.properties p WHERE norm_casa(p.address) = norm_casa(pm.address))
  ORDER BY norm_casa(pm.address);
  GET DIAGNOSTICS minted = ROW_COUNT;
  UPDATE public.pm_properties pm SET property_id = p.id
  FROM public.properties p
  WHERE pm.active AND pm.property_id IS NULL AND norm_casa(p.address) <> '' AND norm_casa(p.address) = norm_casa(pm.address);
  GET DIAGNOSTICS linked = ROW_COUNT;
  RETURN jsonb_build_object('minted', minted, 'linked', linked);
END; $$ LANGUAGE plpgsql;
SELECT public.pm_backfill_property_ids();
