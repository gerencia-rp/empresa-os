-- Auditoría CC Remodelación P0-1: soft-delete de obras + paridad de sync vs Airtable. Aditivo.
ALTER TABLE public.remodel_at_properties ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
ALTER TABLE public.remodel_at_properties ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- tabla de paridad (1 fila por fuente): el sync escribe airtable_count vs mirror_count
CREATE TABLE IF NOT EXISTS public.remodel_sync_parity (
  source text PRIMARY KEY,
  airtable_count int,
  mirror_count int,
  in_sync boolean,
  checked_at timestamptz DEFAULT now()
);
ALTER TABLE public.remodel_sync_parity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rsp_read ON public.remodel_sync_parity;
CREATE POLICY rsp_read ON public.remodel_sync_parity FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS rsp_write ON public.remodel_sync_parity;
CREATE POLICY rsp_write ON public.remodel_sync_parity FOR ALL USING (auth.role() = 'service_role') WITH CHECK (true);

-- Archivar el/los registros no vistos en el último sync (fantasmas borrados en Airtable).
-- Referencia: el último sync corrió 2026-07-03; el fantasma "909 Neans" quedó en 2026-06-05.
UPDATE public.remodel_at_properties
  SET active = false, archived_at = now()
  WHERE last_synced_at < (SELECT max(last_synced_at) - interval '2 days' FROM public.remodel_at_properties);

-- Sembrar la paridad con el conteo real (activos) — el sync la mantendrá.
INSERT INTO public.remodel_sync_parity (source, airtable_count, mirror_count, in_sync, checked_at)
SELECT 'remodel_at_properties',
       (SELECT count(*) FROM public.remodel_at_properties WHERE active),
       (SELECT count(*) FROM public.remodel_at_properties WHERE active),
       true, now()
ON CONFLICT (source) DO UPDATE SET
  airtable_count = EXCLUDED.airtable_count, mirror_count = EXCLUDED.mirror_count,
  in_sync = EXCLUDED.in_sync, checked_at = EXCLUDED.checked_at;
