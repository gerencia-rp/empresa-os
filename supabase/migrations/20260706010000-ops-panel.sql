-- Panel de Operaciones: cola de propuestas de agentes (contrato Ops Brain) + paridad clickup. Aditivo.
CREATE TABLE IF NOT EXISTS public.agent_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agente text,              -- auditor | coordinador | analista_calidad | lider
  tipo text,                -- reasignar | refechar | archivar | decidir | otro
  titulo text, detalle text,
  payload jsonb,            -- { task_id, url, de, a, fecha_nueva, ... }
  empresa text, task_id text, task_url text,
  estado text DEFAULT 'propuesta',   -- propuesta | aprobada | rechazada | aplicada
  decidido_por text, decidido_at timestamptz,
  created_at timestamptz DEFAULT now(),
  active boolean DEFAULT true, archived_at timestamptz
);
ALTER TABLE public.agent_proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agp_read ON public.agent_proposals;
CREATE POLICY agp_read ON public.agent_proposals FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS agp_upd ON public.agent_proposals;
CREATE POLICY agp_upd ON public.agent_proposals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
