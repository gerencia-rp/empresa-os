-- One-time compatibility cleanup after introducing stable proposal dedup keys.
-- Keep the freshly validated row visible and soft-hide only older open copies
-- that represent the same Rentas business subject. No decision is executed.

with ranked as (
  select p.id,
    row_number() over (
      partition by p.agent_id,p.tipo_accion,
        case
          when p.tipo_accion='recordatorio_cobro' then
            'cobro:'||coalesce(p.evidencia->>'casa','')||'|'||coalesce(p.evidencia->>'inquilino','')
          when p.tipo_accion='conciliacion' and p.evidencia->>'tipo'='descuadre' then
            'descuadre:'||coalesce(p.evidencia->>'casa','')
          when p.tipo_accion='conciliacion' and p.evidencia->>'tipo'='descuadre_servicio' then
            'svc:'||concat_ws('|',p.evidencia->>'casa',p.evidencia->>'servicio',p.evidencia->>'mes',p.evidencia->>'subtipo')
          else p.id::text
        end
      order by coalesce(p.last_validated_at,p.created_at) desc,p.created_at desc
    ) as rn
  from public.agent_proposals p
  join public.agent_registry r on r.id=p.agent_id
  where r.nombre='Financiero Rentas'
    and p.estado='propuesta' and p.deleted_at is null
    and (
      p.tipo_accion='recordatorio_cobro'
      or (p.tipo_accion='conciliacion' and p.evidencia->>'tipo' in ('descuadre','descuadre_servicio'))
    )
)
update public.agent_proposals p
set deleted_at=now(),
    evidencia=coalesce(p.evidencia,'{}'::jsonb)||jsonb_build_object(
      'superseded_reason','Evidencia renovada en una propuesta canónica con dedup_key estable',
      'superseded_at',now()
    )
from ranked r
where p.id=r.id and r.rn>1;

