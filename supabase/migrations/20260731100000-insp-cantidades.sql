-- Take-off de cantidades de la Visita Previa (Diagnóstico Patológico).
-- ADITIVA e idempotente: no toca el scoring ni ninguna tabla existente.
-- Grano = una fila por (inspección, división, ítem). El único índice permite el upsert
-- idempotente: re-guardar la misma inspección actualiza, nunca duplica.
CREATE TABLE IF NOT EXISTS public.insp_cantidades (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspeccion_id uuid NOT NULL REFERENCES public.remodel_inspecciones(id) ON DELETE CASCADE,
  property_id   uuid,                -- espejo de remodel_inspecciones.property_id (alimenta al Estimador)
  division      text NOT NULL,       -- key de insp_divisiones
  item          text NOT NULL,       -- nombre del ítem (deriva de insp_checklist_items)
  cantidad      numeric,
  unidad        text,                -- 'u' | 'ft2' | 'ft'
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS insp_cant_uk  ON public.insp_cantidades (inspeccion_id, division, item);
CREATE INDEX        IF NOT EXISTS insp_cant_pid ON public.insp_cantidades (property_id);

ALTER TABLE public.insp_cantidades ENABLE ROW LEVEL SECURITY;
-- Mismo patrón que insp_rw sobre remodel_inspecciones (la inspección y sus cantidades van juntas).
DROP POLICY IF EXISTS insp_cant_rw ON public.insp_cantidades;
CREATE POLICY insp_cant_rw ON public.insp_cantidades FOR ALL TO authenticated USING (true) WITH CHECK (true);
