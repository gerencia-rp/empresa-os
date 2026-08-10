-- ════════════════════════════════════════════════════════════════
-- 🏚 ESCUADRA FIX & FLIP — registro de los 7 agentes (aditivo, dry-run).
-- Empresa madre (la más delicada: underwriting, HML, cap table, PII inversionistas).
-- Aprobado por Nicolás. Copia las fichas EXACTAS del Arquitecto (agent_proposals
-- tipo=nuevo_agente, empresa='Fix & Flip') a agent_registry. Jerarquía: Gerente de
-- Fix & Flip = parent; los otros 6 cuelgan de él. Todos estado='dry-run', enabled=true
-- (kill switch). NINGUNO se promueve. Idempotente (no re-inserta por nombre).
-- ════════════════════════════════════════════════════════════════

-- (1) Gerente primero (raíz de la jerarquía, orden 1)
insert into public.agent_registry
  (nombre, proceso, empresa, area, linea, equipo, squad, capa, nivel_riesgo, estado, enabled,
   dueno, dueno_humano, responsabilidad, skills, tareas, disparadores, inputs, outputs, orden, parent_id)
select p.payload->>'nombre_propuesto', p.payload->>'responsabilidad', 'Fix & Flip', 'fix-flip',
       'Fix & Flip', 'Escuadra Fix & Flip', p.payload->>'key', p.payload->>'capa',
       p.payload->>'nivel_riesgo', 'dry-run', true, 'CEO', p.payload->>'dueno_humano',
       p.payload->>'responsabilidad', p.payload->'skills', p.payload->'tareas', p.payload->'disparadores',
       p.payload->'inputs', p.payload->'outputs', 1, null
from public.agent_proposals p
where p.tipo_accion='nuevo_agente' and p.estado='propuesta' and p.deleted_at is null
  and p.payload->>'key'='ff-gerente'
  and not exists (select 1 from public.agent_registry r where r.nombre=p.payload->>'nombre_propuesto' and r.deleted_at is null);

-- (2) Los otros 6, colgando del Gerente
insert into public.agent_registry
  (nombre, proceso, empresa, area, linea, equipo, squad, capa, nivel_riesgo, estado, enabled,
   dueno, dueno_humano, responsabilidad, skills, tareas, disparadores, inputs, outputs, orden, parent_id)
select p.payload->>'nombre_propuesto', p.payload->>'responsabilidad', 'Fix & Flip', 'fix-flip',
       'Fix & Flip', 'Escuadra Fix & Flip', p.payload->>'key', p.payload->>'capa',
       p.payload->>'nivel_riesgo', 'dry-run', true, 'CEO', p.payload->>'dueno_humano',
       p.payload->>'responsabilidad', p.payload->'skills', p.payload->'tareas', p.payload->'disparadores',
       p.payload->'inputs', p.payload->'outputs',
       case p.payload->>'key'
         when 'ff-ejecucion' then 2 when 'ff-optimizacion' then 3 when 'ff-reportes' then 4
         when 'ff-financiero' then 5 when 'ff-underwriting' then 6 when 'ff-capital' then 7 else 9 end,
       (select id from public.agent_registry where nombre='Gerente de Fix & Flip' and deleted_at is null limit 1)
from public.agent_proposals p
where p.tipo_accion='nuevo_agente' and p.estado='propuesta' and p.deleted_at is null
  and p.payload->>'empresa'='Fix & Flip' and p.payload->>'key'<>'ff-gerente'
  and not exists (select 1 from public.agent_registry r where r.nombre=p.payload->>'nombre_propuesto' and r.deleted_at is null);

-- (3) Marcar las propuestas como aprobadas/registradas (trazabilidad; no las borra)
update public.agent_proposals
  set estado='aprobada'
where tipo_accion='nuevo_agente' and estado='propuesta' and deleted_at is null
  and payload->>'empresa'='Fix & Flip';

-- ── ROLLBACK ──
--   update public.agent_registry set deleted_at=now() where linea='Fix & Flip' and equipo='Escuadra Fix & Flip';
--   update public.agent_proposals set estado='propuesta' where tipo_accion='nuevo_agente' and payload->>'empresa'='Fix & Flip' and estado='aprobada';
