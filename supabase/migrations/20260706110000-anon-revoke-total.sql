-- SEGURIDAD (verificación CEO x2): anon SIN privilegios en public — inmune a regresiones de policies.
-- RLS queda como segunda capa; esto hace que anon reciba ERROR (permission denied), no "0 filas".
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
-- que las tablas FUTURAS tampoco otorguen a anon (creadas por postgres/migraciones)
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;
-- ÚNICO acceso anon que queda: páginas públicas por token (diag / mi-plan) — P1: migrar a RPC por token
GRANT SELECT ON public.edu_diagnostic_invites, public.edu_students, public.edu_student_plans, public.edu_student_plan_tasks TO anon;
GRANT UPDATE (answers, perfil, completed_at, result_plan_id) ON public.edu_diagnostic_invites TO anon;
