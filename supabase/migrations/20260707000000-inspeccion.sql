-- INSPECCIÓN / Diagnóstico Patológico de Vivienda (port de Taskade) — config en tablas, cero hardcode.
CREATE TABLE IF NOT EXISTS public.insp_divisiones (
  key text PRIMARY KEY, nombre text, emoji text, peso_pct numeric, orden int, active boolean DEFAULT true
);
CREATE TABLE IF NOT EXISTS public.insp_patologias (
  key text PRIMARY KEY, nombre text, emoji text, peso_pct numeric, pregunta text, descripcion text, orden int, active boolean DEFAULT true
);
CREATE TABLE IF NOT EXISTS public.insp_etapas_map (
  etapa text PRIMARY KEY, emoji text, divisiones jsonb, orden int, active boolean DEFAULT true
);
CREATE TABLE IF NOT EXISTS public.insp_config (key text PRIMARY KEY, value numeric, label text);
CREATE TABLE IF NOT EXISTS public.remodel_inspecciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid, nombre_ref text NOT NULL, direccion text, uso text,
  numero_pisos int DEFAULT 1,
  scores jsonb DEFAULT '{}'::jsonb,          -- {division:{patologia:1..5}}
  raw_answers jsonb DEFAULT '{}'::jsonb,     -- TODAS las respuestas crudas (regla: nunca null)
  limpieza_items jsonb DEFAULT '[]'::jsonb,
  checklist jsonb DEFAULT '{}'::jsonb,
  fotos jsonb DEFAULT '[]'::jsonb,
  dano_global_pct numeric, dano_divisiones jsonb, dano_patologias jsonb, dano_etapas jsonb,
  veredicto text, estado text DEFAULT 'completa',   -- borrador | completa
  fecha_evaluacion timestamptz DEFAULT now(),
  created_by text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
  active boolean DEFAULT true, archived_at timestamptz
);
DO $$ BEGIN
  PERFORM 1;
  EXECUTE 'ALTER TABLE public.insp_divisiones ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.insp_patologias ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.insp_etapas_map ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.insp_config ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.remodel_inspecciones ENABLE ROW LEVEL SECURITY';
END $$;
DROP POLICY IF EXISTS insp_div_r ON public.insp_divisiones;   CREATE POLICY insp_div_r ON public.insp_divisiones FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS insp_pat_r ON public.insp_patologias;   CREATE POLICY insp_pat_r ON public.insp_patologias FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS insp_eta_r ON public.insp_etapas_map;   CREATE POLICY insp_eta_r ON public.insp_etapas_map FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS insp_cfg_r ON public.insp_config;       CREATE POLICY insp_cfg_r ON public.insp_config FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS insp_rw ON public.remodel_inspecciones; CREATE POLICY insp_rw ON public.remodel_inspecciones FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.insp_divisiones (key, nombre, emoji, peso_pct, orden) VALUES
 ('estructura','Estructura','🔩',35,1),('muros','Muros','🧱',20,2),('redes','Redes','🔌',10,3),
 ('piso','Piso','⬜',10,4),('placa','Placa','🏗️',10,5),('techo','Techo','🏠',5,6),
 ('carpinteria','Carpintería','🪚',5,7),('acceso_externo','Acceso Externo','🚧',5,8)
ON CONFLICT (key) DO NOTHING;
INSERT INTO public.insp_patologias (key, nombre, emoji, peso_pct, pregunta, descripcion, orden) VALUES
 ('antropogenica','Antrópica','🏚️',40,'¿Se nota desgaste por el tiempo, mal uso o reparaciones anteriores mal hechas?','Desgaste por uso, mal uso, reparaciones mal hechas',1),
 ('mecanica','Mecánica','⚙️',30,'¿Hay grietas, fisuras, partes rotas o que se están desprendiendo?','Golpes y grietas',2),
 ('fisica','Física','🌡️',20,'¿Hay manchas de humedad, goteras, condensación o filtraciones de agua?','Humedad y agua',3),
 ('quimica','Química','⚗️',5,'¿Hay partes oxidadas, manchas blancas (salitre), corrosión o materiales degradados?','Óxido y manchas',4),
 ('biologica','Biológica','🍄',5,'¿Hay manchas de hongos, moho, musgo, rastros de insectos o raíces que dañen el material?','Hongos y plagas',5)
ON CONFLICT (key) DO NOTHING;
INSERT INTO public.insp_etapas_map (etapa, emoji, divisiones, orden) VALUES
 ('Demolición','🔨','["estructura","muros","placa"]',1),
 ('Cimentación','⚓','["estructura","placa"]',2),
 ('Estructura','🔩','["estructura","muros","placa","techo"]',3),
 ('Externo','🏠','["acceso_externo","techo","muros"]',4),
 ('Interno','🪟','["piso","carpinteria","redes"]',5),
 ('Limpieza','🧹','[]',6)
ON CONFLICT (etapa) DO NOTHING;
INSERT INTO public.insp_config (key, value, label) VALUES
 ('cimentacion_subcontrato_pct',30,'Daño de cimentación que requiere subcontrato'),
 ('pergola_max_pct',2,'Tope de aporte de pérgola/hangar/depósito al daño total'),
 ('red_peso_pct',33.33,'Peso de cada red (plomería/gas/electricidad) dentro de Redes'),
 ('escala_min',1,'Score mínimo'),('escala_max',5,'Score máximo')
ON CONFLICT (key) DO NOTHING;
