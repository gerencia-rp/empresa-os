-- ════════════════════════════════════════════════════════════════
-- 🔧 FIX · forzar que el sistema "Property Management" tenga el
--    type correcto ('pm-rental-mgmt') y esté en el área correcta.
-- v2: fix de UUID/text mismatch.
-- ════════════════════════════════════════════════════════════════

-- 1) Ver el estado actual (para diagnóstico)
SELECT s.id, s.name, s.type, a.name AS area_name
FROM systems s
JOIN areas a ON a.id = s.area_id
WHERE s.name ILIKE '%property management%' OR s.type = 'pm-rental-mgmt';

-- 2) ARREGLO — actualiza/inserta el sistema con type correcto en área correcta
DO $$
DECLARE
  v_area_id  TEXT;
  v_system_id TEXT;   -- ← TEXT en lugar de UUID (compatible con cualquier id)
BEGIN
  -- Buscar área "Rentas / Property Mgmt" existente
  SELECT id::TEXT INTO v_area_id
  FROM public.areas
  WHERE name ILIKE '%rentas%property%' OR name ILIKE '%property%mgmt%'
  ORDER BY position NULLS LAST
  LIMIT 1;

  IF v_area_id IS NULL THEN
    RAISE EXCEPTION 'No encontré el área. Corré: SELECT id, name FROM areas;';
  END IF;

  -- Buscar si ya hay un sistema con nombre "Property Management" o type 'pm-rental-mgmt'
  SELECT id::TEXT INTO v_system_id
  FROM public.systems
  WHERE type = 'pm-rental-mgmt' OR (name = 'Property Management' AND area_id::TEXT = v_area_id)
  LIMIT 1;

  IF v_system_id IS NOT NULL THEN
    -- Forzar type y área correctos
    UPDATE public.systems
    SET type = 'pm-rental-mgmt',
        area_id = v_area_id,
        name = 'Property Management',
        description = 'Propiedades, calendario de ocupación tipo Airbnb, reservas y finanzas.',
        icon = '🏠',
        config = NULL  -- limpiar si tenía url tipo link
    WHERE id::TEXT = v_system_id;
    RAISE NOTICE '✅ Sistema actualizado: id=%, area=%, type=pm-rental-mgmt', v_system_id, v_area_id;
  ELSE
    -- Crear nuevo
    INSERT INTO public.systems (id, area_id, type, name, description, icon, position)
    VALUES (gen_random_uuid(), v_area_id, 'pm-rental-mgmt',
            'Property Management',
            'Propiedades, calendario de ocupación tipo Airbnb, reservas y finanzas.',
            '🏠', 99);
    RAISE NOTICE '✅ Sistema creado en área %', v_area_id;
  END IF;
END $$;

-- 3) Confirmación final
SELECT s.id, s.name, s.type, s.icon, a.name AS area_name
FROM systems s
JOIN areas a ON a.id = s.area_id
WHERE s.type = 'pm-rental-mgmt';
