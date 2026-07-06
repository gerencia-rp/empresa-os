-- LOCKDOWN ANON (verificación CEO 6-jul): anon no lee NINGUNA tabla/vista sensible.
-- 1) Policies con rol anon → authenticated (mismas condiciones, sin anon)
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname='public' AND cmd='SELECT' AND 'anon' = ANY(roles)
      AND tablename NOT IN ('edu_diagnostic_invites','edu_students','edu_student_plans','edu_student_plan_tasks')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', r.policyname, r.tablename);
  END LOOP;
END $$;
-- 2) TODAS las vistas → security_invoker (dejan de saltarse el RLS de las tablas base)
DO $$
DECLARE v record;
BEGIN
  FOR v IN SELECT viewname FROM pg_views WHERE schemaname='public'
  LOOP
    EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', v.viewname);
  END LOOP;
END $$;
-- 3) Materialized views (no soportan security_invoker): revocar anon
DO $$
DECLARE m record;
BEGIN
  FOR m IN SELECT matviewname FROM pg_matviews WHERE schemaname='public'
  LOOP
    EXECUTE format('REVOKE SELECT ON public.%I FROM anon', m.matviewname);
  END LOOP;
END $$;
-- 4) Cinturón y tiradores: revocar anon de TODAS las vistas (agregados devuelven fila con NULLs aun con invoker)
DO $$
DECLARE v record;
BEGIN
  FOR v IN SELECT viewname FROM pg_views WHERE schemaname='public'
  LOOP
    EXECUTE format('REVOKE SELECT ON public.%I FROM anon', v.viewname);
  END LOOP;
END $$;
