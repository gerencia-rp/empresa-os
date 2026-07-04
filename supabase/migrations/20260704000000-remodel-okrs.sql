-- Reportes CEO: metas/OKRs desde Airtable (tabla OKRs / Metas). Aditivo, RLS.
CREATE TABLE IF NOT EXISTS public.remodel_okrs (
  airtable_id text PRIMARY KEY,
  metrica text, clave text, objetivo numeric, comparador text, unidad text, periodo text, descripcion text,
  active boolean DEFAULT true, archived_at timestamptz, last_synced_at timestamptz DEFAULT now()
);
ALTER TABLE public.remodel_okrs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rokr_read ON public.remodel_okrs;
CREATE POLICY rokr_read ON public.remodel_okrs FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS rokr_write ON public.remodel_okrs;
CREATE POLICY rokr_write ON public.remodel_okrs FOR ALL USING (auth.role() = 'service_role') WITH CHECK (true);
