-- ════════════════════════════════════════════════════════════════
-- 🎓 EDUCACIÓN FUERA DE ALCANCE — soft-reject de las 5 propuestas del Arquitecto.
-- Decisión del CEO: sacar Educación por ahora. SOFT: estado='rechazada', NUNCA
-- hard-delete (deleted_at queda null → reversible). Los agentes transversales
-- 'Verificador/Reportero Educación' (linea='Transversal (legacy)') NO se tocan.
-- ════════════════════════════════════════════════════════════════
update public.agent_proposals
  set estado='rechazada'
where tipo_accion='nuevo_agente' and estado='propuesta' and deleted_at is null
  and payload->>'empresa'='Educacion';

-- Audit (trazabilidad) atado al Arquitecto de Agentes
insert into public.agent_audit_log (agent_id, input, output, resultado)
select id,
  jsonb_build_object('accion','rechazo_propuestas','empresa','Educacion','corte',current_date::text),
  jsonb_build_object('motivo','CEO: Educacion fuera de alcance por ahora','propuestas_rechazadas',
    array['edu-gerente','edu-ejecucion','edu-optimizacion','edu-reportes','edu-financiero'],
    'modo','soft (estado=rechazada, sin hard-delete; reversible)'),
  'ok'
from public.agent_registry where nombre='Arquitecto de Agentes' and deleted_at is null;

-- ── ROLLBACK ──
--   update public.agent_proposals set estado='propuesta' where tipo_accion='nuevo_agente' and payload->>'empresa'='Educacion' and estado='rechazada';
