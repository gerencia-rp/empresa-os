-- Cierra colas históricas que no deben ejecutarse hoy sin revalidación.
-- Se preserva todo el contenido y solo se oculta del trabajo pendiente.

-- Propuestas de creación cuyo agente ya existe y está automatizado.
update public.agent_proposals p
set deleted_at=now(),
    evidencia=coalesce(p.evidencia,'{}'::jsonb)||jsonb_build_object(
      'retired_reason','El agente propuesto ya existe en agent_registry y tiene ejecutor versionado',
      'retired_at',now()
    )
where p.estado='aprobada' and p.deleted_at is null and p.tipo_accion='nuevo_agente'
  and exists(select 1 from public.agent_registry a
    where a.deleted_at is null and lower(a.nombre)=lower(p.payload->>'nombre_propuesto'));

-- Aprobaciones de julio anteriores al contrato de evidencia vigente. Enviar
-- mensajes o corregir datos ahora sería inseguro; cualquier hallazgo real será
-- recreado por los agentes canónicos con last_validated_at actual.
update public.agent_proposals p
set deleted_at=now(),
    evidencia=coalesce(p.evidencia,'{}'::jsonb)||jsonb_build_object(
      'retired_reason','Aprobación histórica expirada; requiere una propuesta canónica con evidencia actual',
      'retired_at',now()
    )
from public.agent_registry a
where p.agent_id=a.id and p.estado='aprobada' and p.deleted_at is null
  and a.nombre in ('Datos & Conciliación','Analista de Cobranza')
  and p.created_at<'2026-08-01'::timestamptz;
