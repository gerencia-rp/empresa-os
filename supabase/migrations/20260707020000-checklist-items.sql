-- Checklist de inspección: catálogo de ítems (config en tabla, editable). Aditivo, soft-delete.
CREATE TABLE IF NOT EXISTS public.insp_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  division text NOT NULL,      -- key de insp_divisiones
  subdivision text,            -- agrupador (Vigas, Columnas…)
  item text NOT NULL,          -- ítem concreto a inspeccionar
  orden int DEFAULT 0,
  active boolean DEFAULT true, archived_at timestamptz
);
ALTER TABLE public.insp_checklist_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ici_r ON public.insp_checklist_items;
CREATE POLICY ici_r ON public.insp_checklist_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS ici_w ON public.insp_checklist_items;
CREATE POLICY ici_w ON public.insp_checklist_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.insp_checklist_items (division, subdivision, item, orden) VALUES
 -- Estructura (8)
 ('estructura','Cimientos','Zapatas y cimientos',1),
 ('estructura','Cimientos','Muros de contención',2),
 ('estructura','Vigas','Vigas de carga',3),
 ('estructura','Vigas','Viguetas de entrepiso',4),
 ('estructura','Columnas','Columnas / pilares',5),
 ('estructura','Losas','Losa de contrapiso',6),
 ('estructura','Nivelación','Desplome / hundimiento',7),
 ('estructura','Nivelación','Nivelación de pisos',8),
 -- Muros (4)
 ('muros','Interiores','Muros interiores (grietas)',9),
 ('muros','Interiores','Revoques / estuco interior',10),
 ('muros','Exteriores','Muros exteriores (fachada)',11),
 ('muros','Exteriores','Impermeabilización de muros',12),
 -- Placa (2)
 ('placa','Entrepiso','Placa de entrepiso',13),
 ('placa','Escaleras','Escaleras y barandas',14),
 -- Piso (3)
 ('piso','Acabado','Piso interior (acabado)',15),
 ('piso','Acabado','Zócalos / guardaescobas',16),
 ('piso','Base','Contrapiso / base de piso',17),
 -- Techo (3)
 ('techo','Cubierta','Cubierta / tejado (exterior)',18),
 ('techo','Cielorraso','Cielorraso / techo interior',19),
 ('techo','Estructura','Estructura de techo (correas)',20),
 -- Redes (3)
 ('redes','Hidráulica','Red de plomería / agua',21),
 ('redes','Gas','Red de gas',22),
 ('redes','Eléctrica','Red eléctrica',23),
 -- Carpintería (3)
 ('carpinteria','Aberturas','Ventanería',24),
 ('carpinteria','Aberturas','Puertas interiores',25),
 ('carpinteria','Mobiliario','Gabinetes (cocina/baños)',26),
 -- Acceso Externo (3)
 ('acceso_externo','Ingreso','Puerta / portón de acceso',27),
 ('acceso_externo','Cerramiento','Cerramiento / muro perimetral',28),
 ('acceso_externo','Exterior','Patio / jardín / andenes',29)
ON CONFLICT DO NOTHING;
