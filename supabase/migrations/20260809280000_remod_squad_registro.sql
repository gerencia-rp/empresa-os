-- ════════════════════════════════════════════════════════════════
-- 🔨 ESCUADRA REMODELACIÓN — registro de los 7 agentes (aditivo, dry-run).
-- Aprobado por Nicolás. Copia las fichas EXACTAS del Arquitecto (agent_proposals
-- tipo=nuevo_agente, empresa=Remodelacion) a agent_registry. Jerarquía: Gerente de
-- Remodelación = parent; los otros 6 cuelgan de él. Todos estado='dry-run', enabled=true
-- (kill switch). NINGUNO se promueve. Idempotente (no re-inserta por nombre).
-- ════════════════════════════════════════════════════════════════

-- (1) Gerente primero (raíz de la jerarquía, orden 1)
insert into public.agent_registry
  (nombre, proceso, empresa, area, linea, equipo, squad, capa, nivel_riesgo, estado, enabled,
   dueno, dueno_humano, responsabilidad, skills, tareas, disparadores, inputs, outputs, orden, parent_id)
select p.payload->>'nombre_propuesto', p.payload->>'responsabilidad', 'Remodelacion', 'remodelacion',
       'Remodelación', 'Escuadra Remodelación', p.payload->>'key', p.payload->>'capa',
       p.payload->>'nivel_riesgo', 'dry-run', true, 'CEO', p.payload->>'dueno_humano',
       p.payload->>'responsabilidad', p.payload->'skills', p.payload->'tareas', p.payload->'disparadores',
       p.payload->'inputs', p.payload->'outputs', 1, null
from public.agent_proposals p
where p.tipo_accion='nuevo_agente' and p.estado='propuesta' and p.deleted_at is null
  and p.payload->>'key'='remod-gerente'
  and not exists (select 1 from public.agent_registry r where r.nombre=p.payload->>'nombre_propuesto' and r.deleted_at is null);

-- (2) Los otros 6, colgando del Gerente
insert into public.agent_registry
  (nombre, proceso, empresa, area, linea, equipo, squad, capa, nivel_riesgo, estado, enabled,
   dueno, dueno_humano, responsabilidad, skills, tareas, disparadores, inputs, outputs, orden, parent_id)
select p.payload->>'nombre_propuesto', p.payload->>'responsabilidad', 'Remodelacion', 'remodelacion',
       'Remodelación', 'Escuadra Remodelación', p.payload->>'key', p.payload->>'capa',
       p.payload->>'nivel_riesgo', 'dry-run', true, 'CEO', p.payload->>'dueno_humano',
       p.payload->>'responsabilidad', p.payload->'skills', p.payload->'tareas', p.payload->'disparadores',
       p.payload->'inputs', p.payload->'outputs',
       case p.payload->>'key'
         when 'remod-ejecucion' then 2 when 'remod-optimizacion' then 3 when 'remod-reportes' then 4
         when 'remod-financiero' then 5 when 'remod-draws-hml' then 6 when 'remod-calidad' then 7 else 9 end,
       (select id from public.agent_registry where nombre='Gerente de Remodelacion' and deleted_at is null limit 1)
from public.agent_proposals p
where p.tipo_accion='nuevo_agente' and p.estado='propuesta' and p.deleted_at is null
  and p.payload->>'empresa'='Remodelacion' and p.payload->>'key'<>'remod-gerente'
  and not exists (select 1 from public.agent_registry r where r.nombre=p.payload->>'nombre_propuesto' and r.deleted_at is null);

-- (3) Marcar las propuestas como aprobadas/registradas (trazabilidad; no las borra)
update public.agent_proposals
  set estado='aprobada'
where tipo_accion='nuevo_agente' and estado='propuesta' and deleted_at is null
  and payload->>'empresa'='Remodelacion';

-- ── ROLLBACK ──
--   update public.agent_registry set deleted_at=now() where linea='Remodelación' and equipo='Escuadra Remodelación';
--   update public.agent_proposals set estado='propuesta' where tipo_accion='nuevo_agente' and payload->>'empresa'='Remodelacion' and estado='aprobada';
