-- Traspasos verificables entre agentes y responsables humanos.
-- Deriva únicamente de propuestas abiertas y políticas vigentes; no crea tareas,
-- reuniones, aprobaciones ni actividad simulada.
create or replace view public.v_agent_handoff_queue
with (security_invoker=true) as
with prepared as (
  select p.id proposal_id,p.agent_id,p.tipo_accion,p.property_id,p.payload,p.evidencia,
    p.created_at,p.last_validated_at,a.nombre from_agent,a.linea from_area,
    coalesce(dp.rol_primario,'Gerente del área') to_role,
    coalesce(dp.rol_respaldo,'Respaldo del área') backup_role,
    coalesce(dp.rol_escalamiento,'Dirección') escalation_role,
    coalesce(dp.sla_hours,24) sla_hours,
    coalesce(p.property_id::text,p.payload->>'task_id',p.evidencia->>'task_id',
      p.evidencia->>'property_id',p.evidencia->>'address',p.evidencia->>'casa',
      p.evidencia->>'inquilino',p.evidencia->>'servicio',p.payload->>'dedup_key',p.id::text) subject_key
  from public.agent_proposals p
  join public.agent_registry a on a.id=p.agent_id and a.deleted_at is null
  left join public.agent_decision_policies dp using(tipo_accion)
  where p.estado='propuesta' and p.deleted_at is null and p.tipo_accion<>'informe'
), ranked as (
  select *,min(created_at) over(partition by agent_id,tipo_accion,subject_key) opened_at,
    row_number() over(partition by agent_id,tipo_accion,subject_key
      order by coalesce(last_validated_at,created_at) desc,created_at desc,proposal_id desc) row_rank
  from prepared
)
select proposal_id,agent_id from_agent_id,from_agent,from_area,tipo_accion,property_id,
  subject_key,to_role,backup_role,escalation_role,sla_hours,opened_at,
  coalesce(last_validated_at,created_at) evidence_at,
  round((extract(epoch from(now()-opened_at))/3600)::numeric,1) age_hours,
  case when now()>opened_at+make_interval(hours=>sla_hours)
    then 'overdue' else 'waiting' end handoff_state,
  (evidencia is not null and evidencia<>'{}'::jsonb) evidence_present,
  payload->>'accion' requested_action
from ranked where row_rank=1;

grant select on public.v_agent_handoff_queue to authenticated;
comment on view public.v_agent_handoff_queue is
  'Cola de traspasos reales: agente origen, rol destino, respaldo, escalamiento, evidencia y SLA. No ejecuta decisiones.';
