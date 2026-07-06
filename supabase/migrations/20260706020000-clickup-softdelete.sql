-- Panel Operaciones: soft-delete en el espejo ClickUp (molde mirror-sync). Aditivo.
ALTER TABLE public.clickup_tasks_mirror ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
ALTER TABLE public.clickup_tasks_mirror ADD COLUMN IF NOT EXISTS archived_at timestamptz;
-- one-time: archivar residuo no visto en el último sync (>2h más viejo que el máximo)
UPDATE public.clickup_tasks_mirror
SET active = false, archived_at = now()
WHERE active IS DISTINCT FROM false
  AND last_synced_at < (SELECT max(last_synced_at) FROM public.clickup_tasks_mirror) - interval '2 hours';

-- Lectura para el Panel de Operaciones (como el resto de espejos del OS)
DROP POLICY IF EXISTS ckt_read ON public.clickup_tasks_mirror;
CREATE POLICY ckt_read ON public.clickup_tasks_mirror FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS cks_read ON public.clickup_snapshots;
CREATE POLICY cks_read ON public.clickup_snapshots FOR SELECT TO anon, authenticated USING (true);
