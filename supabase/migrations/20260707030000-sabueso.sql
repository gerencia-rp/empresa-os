-- SABUESO (scrum-master automático): config de umbrales + hallazgos. Aditivo, soft-delete.
CREATE TABLE IF NOT EXISTS public.sabueso_config (
  check_key text PRIMARY KEY, nombre text, umbral numeric, severidad text, categoria text, activo boolean DEFAULT true
);
CREATE TABLE IF NOT EXISTS public.sabueso_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_key text, categoria text, severidad text,
  task_id text, task_name text, task_url text,
  empresa text, lista text,
  dueno_sugerido text, accion text, detalle text,
  estado text DEFAULT 'abierto',   -- abierto | resuelto
  run_at timestamptz DEFAULT now(),
  active boolean DEFAULT true, archived_at timestamptz
);
CREATE INDEX IF NOT EXISTS sab_find_active ON public.sabueso_findings(active, severidad) WHERE active;
ALTER TABLE public.sabueso_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sabueso_findings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sabc_r ON public.sabueso_config; CREATE POLICY sabc_r ON public.sabueso_config FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS sabc_w ON public.sabueso_config; CREATE POLICY sabc_w ON public.sabueso_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS sabf_r ON public.sabueso_findings; CREATE POLICY sabf_r ON public.sabueso_findings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS sabf_w ON public.sabueso_findings; CREATE POLICY sabf_w ON public.sabueso_findings FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.sabueso_config (check_key, nombre, umbral, severidad, categoria) VALUES
 ('H1','Sin fecha',0,'media','higiene'),
 ('H2','Sin dueño',0,'media','higiene'),
 ('H3','Sin estimación',0,'baja','higiene'),
 ('F1_urgente','Congelada (urgente)',3,'alta','flujo'),
 ('F1_alta','Congelada (alta)',7,'alta','flujo'),
 ('F1_normal','Congelada (normal)',14,'alta','flujo'),
 ('F2_wip','WIP por persona sobre umbral',40,'alta','flujo'),
 ('P1','Estado terminal abierto',0,'critica','proceso'),
 ('P2','Duplicado / clon',0,'media','proceso'),
 ('P3','Huérfana (sin lista/casa)',0,'media','proceso'),
 ('S1_sla_plata','SLA plata/inversionista (días)',5,'critica','sla'),
 ('U1','Urgente sin dueño',0,'alta','flujo')
ON CONFLICT (check_key) DO NOTHING;
