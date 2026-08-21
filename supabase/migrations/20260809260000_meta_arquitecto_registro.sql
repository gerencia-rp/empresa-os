-- ════════════════════════════════════════════════════════════════
-- 🏛 META · Arquitecto de Agentes — registro operativo (planificado → dry-run).
-- Aditivo: NO crea fila nueva (la canónica ya sembró 'Arquitecto de Agentes' en
-- capa Meta como 'planificado'); la completa con la ficha de prompts/meta-arquitecto.md
-- y la pasa a dry-run para correr su eval. Riesgo 🟡 PROPONE — nunca registra ni
-- promueve por su cuenta (guardrail duro). No duplica: verifica agent_registry antes.
-- ════════════════════════════════════════════════════════════════

update public.agent_registry set
  estado='dry-run',
  nivel_riesgo='P2',
  dueno='CEO',
  dueno_humano='Nicolás Lara',
  responsabilidad='Analiza la operación del holding y PROPONE los agentes que faltan, con ficha canónica completa + golden set, listos para dry-run sólo tras aprobación de Nicolás. Nunca registra ni promueve por su cuenta.',
  skills=jsonb_build_array(
    'Análisis de la operación real (ClickUp/Airtable por empresa)',
    'Detección de procesos repetitivos sin dueño y cuellos de botella',
    'Redacción de ficha canónica de agente (responsabilidad, skills, tareas, disparadores, I/O, riesgo, dueño)',
    'Diseño del golden set / eval sugerido de cada agente propuesto',
    'Verificación anti-duplicado contra agent_registry',
    'Respeto del molde de 5 roles por escuadra + específicos sólo cuando la operación lo justifica'
  ),
  tareas=jsonb_build_array(
    jsonb_build_object('tarea','Escanear operación + blueprints y proponer las escuadras faltantes','salida','agent_proposals (tipo=nuevo_agente)'),
    jsonb_build_object('tarea','Revisión semanal de procesos nuevos sin dueño','salida','propuestas de agente/ajuste'),
    jsonb_build_object('tarea','Proponer ajustes a agentes existentes (skill de más, tarea que falta)','salida','agent_proposals (tipo=ajuste_agente)')
  ),
  disparadores=jsonb_build_array('on-demand (Nicolás pide)','revisión semanal'),
  updated_at=now()
where nombre='Arquitecto de Agentes' and capa='Meta' and deleted_at is null;

-- ── ROLLBACK ──  update ... set estado='planificado' where nombre='Arquitecto de Agentes';
