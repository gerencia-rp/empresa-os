-- Las decisiones provenientes de un espejo cuya autenticación está rota no
-- son aprobables. Se conservan como historial y se regenerarán tras una sync
-- válida mediante los agentes canónicos.
update public.agent_proposals p
set deleted_at=now(),
    evidencia=coalesce(p.evidencia,'{}'::jsonb)||jsonb_build_object(
      'retired_reason','Evidencia ClickUp expirada; requiere sincronización válida y nueva corrida canónica',
      'retired_at',now()
    )
from public.agent_registry a
where p.agent_id=a.id and p.estado='propuesta' and p.deleted_at is null
  and coalesce(p.last_validated_at,p.created_at)<now()-interval '48 hours'
  and (
    (a.nombre='Ops · Auditor' and p.tipo_accion='archivar_tarea')
    or (a.nombre='Ops · Coordinador' and p.tipo_accion='refechar_tarea')
    or (a.nombre in ('Ejecucion Fix & Flip','Ejecución Rentas') and p.tipo_accion='nudge')
    or (a.nombre='Optimización Rentas' and p.tipo_accion='cuello_botella' and p.evidencia->>'fuente'='clickup_tasks_mirror')
  );
