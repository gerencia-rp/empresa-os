-- ClickUp no está autenticado: las propuestas derivadas de su espejo viejo
-- dejan de ser decisiones vigentes. Se conserva el historial y se reabrirán
-- hallazgos frescos cuando la sincronización vuelva a estar sana.
with latest as (
  select error,synced_at from public.clickup_sync_log order by synced_at desc limit 1
)
update public.agent_proposals p
set estado='rechazada',payload=coalesce(p.payload,'{}'::jsonb)||jsonb_build_object(
  'retired_reason','Evidencia ClickUp no vigente; esperar sincronización autenticada.',
  'retired_at',now())
from public.agent_registry a,latest l
where p.agent_id=a.id and p.deleted_at is null and p.estado='propuesta'
  and a.nombre in('Ejecución Rentas','Ejecucion Fix & Flip')
  and lower(coalesce(p.evidencia->>'fuente','')) like '%clickup%'
  and (l.error is not null or l.synced_at<now()-interval '2 hours');

select public.run_decision_sla_review();
select public.run_absence_readiness_review();
