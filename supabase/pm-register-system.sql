-- ════════════════════════════════════════════════════════════════
-- 🏠 Registrar Property Management dentro del área EXISTENTE
-- "Rentas / Property Mgmt" (NO crear área nueva)
-- IDEMPOTENTE: corrá varias veces sin duplicar.
-- ════════════════════════════════════════════════════════════════

-- 0) Limpieza: si la corrida anterior creó un área "rentals" duplicada, borrarla.
--    Solo borra si no tiene sistemas adentro (safety check).
DO $$
BEGIN
  -- Borrar el sistema pm-rental-mgmt si está colgando del área 'rentals' equivocada
  DELETE FROM public.systems WHERE type = 'pm-rental-mgmt' AND area_id = 'rentals';
  -- Si el área 'rentals' está vacía, borrarla
  IF EXISTS (SELECT 1 FROM public.areas WHERE id = 'rentals')
     AND NOT EXISTS (SELECT 1 FROM public.systems WHERE area_id = 'rentals') THEN
    DELETE FROM public.areas WHERE id = 'rentals';
  END IF;
END $$;

-- 1) Detectar el ID del área EXISTENTE "Rentas / Property Mgmt"
--    y registrar el sistema ahí. Si ya existe, no duplicar.
DO $$
DECLARE
  v_area_id TEXT;
BEGIN
  -- Buscar el área por nombre (sin importar si usa "/" o "·" o variaciones)
  SELECT id INTO v_area_id
  FROM public.areas
  WHERE name ILIKE '%rentas%property%mgmt%' OR name ILIKE '%rentas / property%' OR id IN ('rentas','rentas-pm','rental','rentals-pm')
  ORDER BY position NULLS LAST
  LIMIT 1;

  IF v_area_id IS NULL THEN
    RAISE NOTICE 'No encontré el área existente. Listale los IDs:';
    RAISE NOTICE 'SELECT id, name FROM areas ORDER BY position;';
    RETURN;
  END IF;

  -- Registrar el sistema si no existe
  IF NOT EXISTS (SELECT 1 FROM public.systems WHERE type = 'pm-rental-mgmt') THEN
    INSERT INTO public.systems (id, area_id, type, name, description, icon, position)
    VALUES (gen_random_uuid(), v_area_id, 'pm-rental-mgmt',
            'Property Management',
            'Propiedades, calendario de ocupación tipo Airbnb, reservas y finanzas. Importar de Airtable.',
            '🏠', 99);
    RAISE NOTICE 'Sistema "Property Management" creado en área %', v_area_id;
  ELSE
    -- Si ya existe, asegurarse que está en el área correcta
    UPDATE public.systems
    SET area_id = v_area_id
    WHERE type = 'pm-rental-mgmt' AND area_id != v_area_id;
    RAISE NOTICE 'Sistema ya existía. Moví/verifiqué que esté en área %', v_area_id;
  END IF;
END $$;

-- ✅ Verificá con:
--   SELECT s.name, s.type, a.name AS area_name
--   FROM systems s JOIN areas a ON a.id = s.area_id
--   WHERE s.type = 'pm-rental-mgmt';
-- Tiene que devolver 1 fila con area_name = "Rentas / Property Mgmt"

-- Si la consulta de arriba devuelve 0 filas, listame los IDs de áreas y los corrijo:
--   SELECT id, name FROM areas ORDER BY position;
