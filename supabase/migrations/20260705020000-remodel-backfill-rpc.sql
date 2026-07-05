-- Self-healing del property_id: RPC idempotente que el sync llama cada corrida.
-- Mint de casas nuevas en properties + link de las 3 tablas por dirección normalizada.
CREATE OR REPLACE FUNCTION public.remodel_backfill_property_ids() RETURNS jsonb AS $$
DECLARE minted int; linked_obras int; linked_proj int; linked_wa int;
BEGIN
  INSERT INTO public.properties (address, city, state, user_id, property_type, status)
  SELECT DISTINCT ON (norm_casa(r.address)) r.address, r.city, 'TX',
    '203f8d94-fea1-4031-b468-2580887bbfca'::uuid, 'remodel', 'remodeling'
  FROM public.remodel_at_properties r
  WHERE r.active AND coalesce(norm_casa(r.address),'') <> '' AND r.property_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.properties p WHERE norm_casa(p.address) = norm_casa(r.address))
  ORDER BY norm_casa(r.address);
  GET DIAGNOSTICS minted = ROW_COUNT;

  UPDATE public.remodel_at_properties r SET property_id = p.id
  FROM public.properties p WHERE r.active AND r.property_id IS NULL AND norm_casa(p.address) = norm_casa(r.address);
  GET DIAGNOSTICS linked_obras = ROW_COUNT;

  UPDATE public.remodel_projects rp SET property_id = p.id
  FROM public.properties p
  WHERE rp.archived_at IS NULL AND rp.property_id IS NULL AND norm_casa(p.address) <> ''
    AND (norm_casa(p.address) = norm_casa(coalesce(rp.name, rp.address))
      OR (length(norm_casa_name(coalesce(rp.name, rp.address))) > 3 AND norm_casa_name(p.address) = norm_casa_name(coalesce(rp.name, rp.address))));
  GET DIAGNOSTICS linked_proj = ROW_COUNT;

  UPDATE public.weekly_activities wa SET property_id = p.id
  FROM public.properties p
  WHERE wa.property_name IS NOT NULL AND wa.property_id IS NULL AND norm_casa(p.address) <> ''
    AND (norm_casa(p.address) = norm_casa(wa.property_name)
      OR (length(norm_casa_name(wa.property_name)) > 3 AND norm_casa_name(p.address) = norm_casa_name(wa.property_name)));
  GET DIAGNOSTICS linked_wa = ROW_COUNT;

  RETURN jsonb_build_object('minted', minted, 'linked_obras', linked_obras, 'linked_projects', linked_proj, 'linked_activities', linked_wa);
END; $$ LANGUAGE plpgsql;
