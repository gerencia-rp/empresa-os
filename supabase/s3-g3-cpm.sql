-- ============================================================
-- S3-G3 · Critical Path Method (dependencias entre actividades)
-- UPDATE de los 70 seed items con depends_on text[] según
-- lógica constructiva estándar de remodelación residencial.
-- Cada operador puede sobreescribir per proyecto desde la UI.
-- ============================================================

-- Helper: solo actualiza si depends_on está vacío (no piso customizaciones del user)
do $$ begin

  -- Fase 1 (Demolición) — sin deps, todo arranca acá
  update public.remodel_catalog_items set depends_on = '{}' where is_seed and phase = '1' and (depends_on is null or array_length(depends_on,1) is null);

  -- Fase 2 (Cimentación) — Foundation eval primero, después reparaciones
  update public.remodel_catalog_items set depends_on = '{}'           where code = '2.1.1' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{2.1.1}'      where code = '2.1.4' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{}'           where code = '2.2.1' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{2.1.4}'      where code = '2.2.6' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{2.2.6}'      where code = '2.2.9' and is_seed and (depends_on is null or array_length(depends_on,1) is null);

  -- Fase 4 (Estructura) — depende de cimentación (la pongo antes que fase 3 porque exterior depende de framing)
  update public.remodel_catalog_items set depends_on = '{}'           where code = '4.2.1' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{}'           where code = '4.2.2' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{}'           where code = '4.2.3' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{2.2.6,4.2.1}' where code = '4.1.2' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{2.1.4}'      where code = '4.1.3' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{4.1.2}'      where code = '4.1.4' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{4.1.2}'      where code = '4.1.5' and is_seed and (depends_on is null or array_length(depends_on,1) is null);

  -- Fase 3 (Exterior) — paralelo con interior una vez framing listo
  update public.remodel_catalog_items set depends_on = '{4.1.4}'      where code = '3.1.1' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{3.1.1}'      where code = '3.1.2' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{3.1.1}'      where code = '3.1.3' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{4.1.2}'      where code = '3.4.1' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{3.4.1}'      where code = '3.4.3' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{4.1.2}'      where code = '3.5.1' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{4.1.2}'      where code = '3.5.2' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{2.2.1}'      where code = '3.6.1' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{4.1.2}'      where code = '3.7.1' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{2.2.1}'      where code = '3.13.1' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{}'           where code = '3.14.1' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{3.4.3,3.13.1}' where code = '3.15.1' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{4.1.2}'      where code = '3.16.1' and is_seed and (depends_on is null or array_length(depends_on,1) is null);

  -- Fase 5 (Interior) — rough-in primero, luego insulation, drywall, paint, finishes
  -- Redes (eléctrica, plomería, HVAC rough-in)
  update public.remodel_catalog_items set depends_on = '{4.1.2}'      where code = '5.1.5' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{5.1.5}'      where code = '5.1.6' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{4.1.2}'      where code = '5.2.1p' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{4.1.2}'      where code = '5.2.2p' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{5.2.1p}'     where code = '5.2.3p' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{4.1.2}'      where code = '5.5.1h' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{4.1.2}'      where code = '5.5.2h' and is_seed and (depends_on is null or array_length(depends_on,1) is null);

  -- Insulation depende de rough-in
  update public.remodel_catalog_items set depends_on = '{5.1.6,5.2.1p,5.5.1h}' where code = '5.1.3' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{5.1.6}'      where code = '5.2.3' and is_seed and (depends_on is null or array_length(depends_on,1) is null);

  -- Drywall después de insulation
  update public.remodel_catalog_items set depends_on = '{5.1.3}'      where code = '5.1.1' and is_seed and (depends_on is null or array_length(depends_on,1) is null);

  -- Pintura interior después de drywall
  update public.remodel_catalog_items set depends_on = '{5.1.1}'      where code = '5.1.2' and is_seed and (depends_on is null or array_length(depends_on,1) is null);

  -- Trim después de pintura
  update public.remodel_catalog_items set depends_on = '{5.1.2}'      where code = '5.2.1' and is_seed and (depends_on is null or array_length(depends_on,1) is null);

  -- Pisos después de pintura
  update public.remodel_catalog_items set depends_on = '{5.1.2}'      where code = '5.6.1' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{5.1.2}'      where code = '5.6.2' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{5.6.1}'      where code = '5.6.3' and is_seed and (depends_on is null or array_length(depends_on,1) is null);

  -- Puertas y closets después de pisos
  update public.remodel_catalog_items set depends_on = '{5.6.1}'      where code = '5.8.1' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{5.6.1}'      where code = '5.8.2' and is_seed and (depends_on is null or array_length(depends_on,1) is null);

  -- Electrical final (outlets, fixtures, smoke)
  update public.remodel_catalog_items set depends_on = '{5.1.1}'      where code = '5.1.4' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{5.1.2}'      where code = '5.1.7' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{5.1.1}'      where code = '5.1.9' and is_seed and (depends_on is null or array_length(depends_on,1) is null);

  -- Plumbing fixtures finales
  update public.remodel_catalog_items set depends_on = '{5.6.1}'      where code = '5.2.4p' and is_seed and (depends_on is null or array_length(depends_on,1) is null);

  -- Baños (pisos + plumbing primero)
  update public.remodel_catalog_items set depends_on = '{5.6.1,5.2.4p}' where code = '5.3.1' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{5.3.1}'      where code = '5.3.2' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{5.3.2}'      where code = '5.3.3' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{5.1.2}'      where code = '5.3.4' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{5.6.1,5.2.4p}' where code = '5.3.5' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{5.2.4p}'     where code = '5.3.6' and is_seed and (depends_on is null or array_length(depends_on,1) is null);

  -- Cocina (cabinets → countertops → backsplash → appliances)
  update public.remodel_catalog_items set depends_on = '{5.6.1}'      where code = '5.4.1' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{5.4.1}'      where code = '5.4.2' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{5.4.2}'      where code = '5.4.3' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{5.4.2,5.2.4p}' where code = '5.4.4' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{5.6.1}'      where code = '5.4.5' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{5.4.2,5.4.5}' where code = '5.4.6' and is_seed and (depends_on is null or array_length(depends_on,1) is null);

  -- Fase 6 (Limpieza) — todo después de phase 5 finishes
  update public.remodel_catalog_items set depends_on = '{5.1.2,5.4.6,5.3.6}' where code = '6.1.1' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{6.1.1}'      where code = '6.2.1' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{6.2.1}'      where code = '6.2.2' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{6.2.2}'      where code = '6.2.3' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{6.2.2}'      where code = '6.3.1' and is_seed and (depends_on is null or array_length(depends_on,1) is null);
  update public.remodel_catalog_items set depends_on = '{6.2.2}'      where code = '6.3.2' and is_seed and (depends_on is null or array_length(depends_on,1) is null);

end $$;

-- Smoke test
-- select code, depends_on from public.remodel_catalog_items where array_length(depends_on,1) > 0 order by code;
