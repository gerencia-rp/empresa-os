-- P0: property_id (properties.id) como columna vertebral de la casa (Planner ↔ Estimador ↔ Command Center).
-- properties = registro canónico que cruza empresas (FF, Rentas, ops, remodel). Aditivo, soft-delete.

-- Normalización de dirección (baja, saca país/estado/ciudad/zip/sufijos → alfanumérico)
CREATE OR REPLACE FUNCTION public.norm_casa(txt text) RETURNS text AS $$
  SELECT regexp_replace(regexp_replace(regexp_replace(
    lower(regexp_replace(coalesce(txt,''),
      '(ee\.?\s*uu\.?|\yusa\y|\ytx\y|\ytexas\y|austin|round rock|marlin|pflugerville|manor|del valle)', '', 'gi')),
    '[0-9]{5}(-[0-9]{4})?', '', 'g'),
    '\y(dr|st|rd|ave|ln|trail|cove|way|path|blvd|ct|pl|street|drive|road|avenue|lane|place|court)\y', '', 'g'),
    '[^a-z0-9]', '', 'g');
$$ LANGUAGE sql IMMUTABLE;
CREATE OR REPLACE FUNCTION public.norm_casa_name(txt text) RETURNS text AS $$
  SELECT regexp_replace(public.norm_casa(txt), '^[0-9]+', '', 'g');
$$ LANGUAGE sql IMMUTABLE;

-- 1) columna property_id en el espejo de obras (sin FK: es espejo, se repuebla por sync)
ALTER TABLE public.remodel_at_properties ADD COLUMN IF NOT EXISTS property_id uuid;

-- 2) MINT: crear en properties las casas de Remodelación que aún no existen (por norma)
INSERT INTO public.properties (address, city, state, user_id, property_type, status)
SELECT DISTINCT ON (norm_casa(r.address)) r.address, r.city, 'TX',
  '203f8d94-fea1-4031-b468-2580887bbfca'::uuid, 'remodel', 'remodeling'
FROM public.remodel_at_properties r
WHERE r.active AND coalesce(norm_casa(r.address),'') <> ''
  AND NOT EXISTS (SELECT 1 FROM public.properties p WHERE norm_casa(p.address) = norm_casa(r.address))
ORDER BY norm_casa(r.address);

-- 3) backfill remodel_at_properties.property_id = properties.id
UPDATE public.remodel_at_properties r SET property_id = p.id
FROM public.properties p
WHERE r.active AND norm_casa(p.address) = norm_casa(r.address);

-- 4) soft-delete 909 Neans en projects (existe en espejo, NO en Airtable)
UPDATE public.remodel_projects SET archived_at = now()
WHERE (name ILIKE '%neans%' OR address ILIKE '%neans%') AND archived_at IS NULL;

-- 5) backfill remodel_projects.property_id (por nf del name/address, o nn si el nombre-calle es distintivo)
UPDATE public.remodel_projects rp SET property_id = p.id
FROM public.properties p
WHERE rp.archived_at IS NULL AND rp.property_id IS NULL AND norm_casa(p.address) <> ''
  AND (norm_casa(p.address) = norm_casa(coalesce(rp.name, rp.address))
    OR norm_casa(p.address) = norm_casa(rp.address)
    OR (length(norm_casa_name(coalesce(rp.name, rp.address))) > 3 AND norm_casa_name(p.address) = norm_casa_name(coalesce(rp.name, rp.address))));

-- 6) backfill weekly_activities.property_id (por property_name)
UPDATE public.weekly_activities wa SET property_id = p.id
FROM public.properties p
WHERE wa.property_name IS NOT NULL AND wa.property_id IS NULL AND norm_casa(p.address) <> ''
  AND (norm_casa(p.address) = norm_casa(wa.property_name)
    OR (length(norm_casa_name(wa.property_name)) > 3 AND norm_casa_name(p.address) = norm_casa_name(wa.property_name)));

CREATE INDEX IF NOT EXISTS idx_wa_property ON public.weekly_activities(property_id) WHERE property_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rap_property ON public.remodel_at_properties(property_id) WHERE property_id IS NOT NULL;

-- 7) reporte de casas no matcheadas (revisión manual)
CREATE OR REPLACE VIEW public.v_remodel_casas_unmatched AS
  SELECT 'proyecto'::text AS fuente, coalesce(name, address) AS casa, id::text AS ref
  FROM public.remodel_projects WHERE archived_at IS NULL AND property_id IS NULL
  UNION ALL
  SELECT DISTINCT 'planner'::text AS fuente, property_name AS casa, property_name AS ref
  FROM public.weekly_activities WHERE property_name IS NOT NULL AND property_id IS NULL
  UNION ALL
  SELECT 'obra'::text AS fuente, address AS casa, id::text AS ref
  FROM public.remodel_at_properties WHERE active AND property_id IS NULL;
