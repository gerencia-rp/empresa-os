-- Optimización Fix & Flip pasa a asistido porque ya tiene una función útil
-- antes de reunir historia suficiente: observa salud/frescura del pipeline.
-- El análisis de medianas continúa bloqueado hasta tener intervalos reales.

update public.agent_registry
set estado = 'asistido',
    responsabilidad = 'Supervisa la salud y frescura del pipeline Fix & Flip. Con historial suficiente también detecta cuellos por duración observada; nunca reconstruye fechas ni ejecuta cambios sin aprobación.',
    updated_at = now()
where nombre = 'Optimizacion Fix & Flip'
  and deleted_at is null;

comment on table public.ff_deal_stage_history is
  'Transiciones observadas reales para estadísticas de Optimización Fix & Flip. El agente opera mientras tanto en modo observabilidad sobre ff_deals.';

-- ROLLBACK:
-- update public.agent_registry set estado='dry-run' where nombre='Optimizacion Fix & Flip' and deleted_at is null;
