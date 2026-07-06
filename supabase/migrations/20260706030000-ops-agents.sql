-- Registrar los 4 agentes de Operación en el contrato (agent_registry). Idempotente por nombre.
INSERT INTO public.agent_registry (nombre, empresa, proceso, inputs, outputs, acciones, nivel_riesgo, estado, dueno)
SELECT v.nombre, 'transversal (Operación)', v.proceso,
       '["clickup_tasks_mirror","clickup_snapshots"]'::jsonb, '["agent_proposals"]'::jsonb,
       v.acciones::jsonb, v.riesgo, 'dry-run', 'Nicolás Lara'
FROM (VALUES
  ('Ops · Auditor',            'Detecta duplicadas, tareas zombis (+60d vencidas) y tareas en casas cerradas → propone archivar', '["read","propose"]', 'P1'),
  ('Ops · Coordinador',        'Propone el plan del día: re-fechar vencidas recientes, asignar urgentes sin dueño',               '["read","propose"]', 'P1'),
  ('Ops · Analista de Calidad','Mide tiempos de entrega y % a tiempo semanal → informe de calidad',                               '["read","propose"]', 'P2'),
  ('Ops · Líder',              'Arma el matutino diario (tareas de hoy por persona, vencidas, urgentes sin dueño)',               '["read","propose"]', 'P2')
) AS v(nombre, proceso, acciones, riesgo)
WHERE NOT EXISTS (SELECT 1 FROM public.agent_registry r WHERE r.nombre = v.nombre AND r.deleted_at IS NULL);
