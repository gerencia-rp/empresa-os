-- Estimador Pro — blindaje (soft-delete) + recuperación de proyectos desde el histórico de obras.
--
-- CONTEXTO: remodel_projects quedó con 3 filas (borrado en duro, sin PITR/backup restaurable; el 2º proyecto
-- Supabase "fliptrack-prod" NO tiene copia — verificado). Se re-derivan las obras reales de
-- remodel_at_properties (mirror de Airtable/Remodelación), respetando las 3 existentes (dedup por substring
-- de dirección normalizada) y adjuntando los diagnósticos que matcheen. IDEMPOTENTE (re-correr no duplica).

-- 1) CAUSA RAÍZ — soft-delete: el 🗑 (rmDeleteProject) borraba en duro e irreversible. archived_at lo hace reversible.
ALTER TABLE public.remodel_projects ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- 2) RE-DERIVAR proyectos desde las obras reales (22 finalizadas + 9 en curso), sin sobrescribir las 3 actuales.
INSERT INTO public.remodel_projects
  (name, address, sqft, status, budget_total, real_material, real_labor, real_total,
   start_date, end_date_estimated, end_date_real, completed_at, created_by, remodel_type, notes)
SELECT
  trim(split_part(o.address, ',', 1)),
  o.address,
  o.sqft,
  case when o.proceso = 'Finalizado' then 'completed' else 'active' end,
  o.presupuesto_interno,
  o.gasto_materiales,
  o.gasto_trabajadores,
  coalesce(o.gasto_materiales, 0) + coalesce(o.gasto_trabajadores, 0),
  o.fecha_inicio,
  o.fecha_estimada_fin,
  o.fecha_real_fin,
  case when o.proceso = 'Finalizado' then o.fecha_real_fin::timestamptz else null end,
  '3a3df398-c53e-498b-a7cf-7be343132e4b'::uuid,
  'full',
  'Recuperado del histórico de obras (Remodelación/Airtable).' ||
  coalesce((select ' · Diagnóstico previo: ' || d.direccion ||
                   coalesce(' · compra $' || round(d.precio_compra)::text, '')
            from public.remodel_forecast_diagnoses d
            where length(regexp_replace(lower(coalesce(d.direccion, '')), '[^a-z0-9]', '', 'g')) >= 4
              and position(regexp_replace(lower(coalesce(d.direccion, '')), '[^a-z0-9]', '', 'g')
                           in regexp_replace(lower(o.address), '[^a-z0-9]', '', 'g')) > 0
            limit 1), '')
FROM public.remodel_at_properties o
WHERE not exists (
  select 1 from public.remodel_projects p
  where length(regexp_replace(lower(p.name), '[^a-z0-9]', '', 'g')) >= 4
    and position(regexp_replace(lower(p.name), '[^a-z0-9]', '', 'g')
                 in regexp_replace(lower(o.address), '[^a-z0-9]', '', 'g')) > 0
);
