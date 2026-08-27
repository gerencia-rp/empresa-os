-- La alerta precontrato no tenía dedup_key ni podía refrescarse. El ejecutor
-- actual ya verifica saldos a favor por inquilino con evidencia vigente.
update public.agent_proposals p
set deleted_at=now(),
    evidencia=coalesce(p.evidencia,'{}'::jsonb)||jsonb_build_object(
      'superseded_reason','Reemplazada por revisión vigente de saldos a favor con dedup_key estable',
      'superseded_at',now()
    )
from public.agent_registry a
where p.agent_id=a.id
  and a.nombre='Financiero Rentas'
  and p.estado='propuesta'
  and p.deleted_at is null
  and p.tipo_accion='conciliacion'
  and p.payload->>'dedup_key' is null
  and p.payload->>'accion'='verificar_sobrepagos'
  and p.evidencia->>'tipo'='descuadre';
