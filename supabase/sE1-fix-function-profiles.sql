-- ============================================================================
-- HOTFIX · is_mentor_or_admin() debe usar la tabla `profiles` (no `users`)
-- Causa del error: en sE1-education-area.sql escribí `FROM users` pero la
-- tabla real en este proyecto es `profiles` (vista con id, email, role).
-- IDEMPOTENTE: usa CREATE OR REPLACE.
-- ============================================================================

CREATE OR REPLACE FUNCTION is_mentor_or_admin() RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('admin','mentor')
  );
$$;

-- Verificación: ejecuta esto para confirmar que la función responde:
-- SELECT is_mentor_or_admin();
-- (Debe devolver true si tu profile tiene role='admin', false si no.)
