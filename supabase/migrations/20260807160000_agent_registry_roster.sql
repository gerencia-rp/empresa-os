-- ════════════════════════════════════════════════════════════════
-- 🤖 AGENT REGISTRY · Roster completo (EQUIPOS-Y-SKILLS.md) para el Command Center /jarvis.
-- Aditivo. Agrega columnas capa/area, hace backfill de los 7 existentes y da de alta
-- los 11 agentes que faltaban (Cerebro, Líder Contable&Datos, Auditor de Datos,
-- 4 Verificadores, 4 Reporteros). Idempotente por nombre. NO renombra los existentes
-- (sync-clickup los busca por 'Ops%' y os-ct-sabueso por 'Sabueso Contable').
-- ════════════════════════════════════════════════════════════════

-- 1) Columnas nuevas (capa = Command/Finance/Ops/Integrity/Report/Signal · area = slug del OS)
alter table public.agent_registry add column if not exists capa text;
alter table public.agent_registry add column if not exists area text;

-- 2) Backfill de los 7 existentes (por nombre; no toca su riesgo/estado/nombre)
update public.agent_registry set capa='Finance', area='contable'   where nombre='Datos & Conciliación'      and capa is null;
update public.agent_registry set capa='Finance', area='contable'   where nombre='Analista de Cobranza'       and capa is null;
update public.agent_registry set capa='Ops',     area='operacion'  where nombre='Ops · Auditor'              and capa is null;
update public.agent_registry set capa='Ops',     area='operacion'  where nombre='Ops · Líder'                and capa is null;
update public.agent_registry set capa='Ops',     area='operacion'  where nombre='Ops · Coordinador'          and capa is null;
update public.agent_registry set capa='Ops',     area='operacion'  where nombre='Ops · Analista de Calidad'  and capa is null;
update public.agent_registry set capa='Signal',  area='holding'    where nombre='Sabueso Contable'           and capa is null;

-- 3) Alta de los 11 nuevos (idempotente por nombre + deleted_at is null)
insert into public.agent_registry (nombre, proceso, empresa, area, capa, inputs, outputs, acciones, nivel_riesgo, estado, dueno)
select v.nombre, v.proceso, v.empresa, v.area, v.capa,
       v.inputs::jsonb, v.outputs::jsonb, v.acciones::jsonb, v.nivel_riesgo, v.estado, v.dueno
from (values
  ('Cerebro Ejecutivo',
   'Orquesta: lee todos los informes de los equipos → 1 foto ejecutiva + decisiones para el CEO (matutino 7:45).',
   'holding','holding','Command',
   '["informes de todos los agentes","KPIs del holding","alertas del Sabueso"]',
   '["foto ejecutiva diaria","matutino WhatsApp/Command Center"]',
   '["consolidar informes → brief (no ejecuta acciones de negocio; el CEO decide)"]',
   'P1','asistido','CEO'),

  ('Líder Contable & Datos',
   'Lidera el equipo de Contable & Datos: coordina auditoría, conciliación y cobranza; consolida hallazgos financieros.',
   'transversal (Contable & Datos)','contable','Finance',
   '["hallazgos de auditoría/conciliación/cobranza"]',
   '["resumen financiero del día para el Cerebro"]',
   '["priorizar y enrutar hallazgos (propone, no ejecuta)"]',
   'P2','dry-run','Nicolás Lara'),

  ('Auditor de Datos',
   'Barre las 3 bases (Airtable/OS/QB): reporta inconsistencias, duplicados y pagos huérfanos.',
   'transversal (Contable & Datos)','contable','Finance',
   '["airtable mirror","pm_*","ff_*","qb_*"]',
   '["lista de inconsistencias/duplicados/huérfanos"]',
   '["reporta (solo lectura)"]',
   'P2','dry-run','Nicolás Lara'),

  ('Verificador Fix & Flip',
   'Chequeo profundo por empresa: Airtable ↔ OS ↔ QuickBooks ↔ ClickUp (Fix & Flip).',
   'fix-flip','fix-flip','Integrity',
   '["ff_* / airtable FF / qb_* / clickup_*"]','["descuadres Airtable↔OS↔QB↔ClickUp"]',
   '["reporta descuadres (solo lectura)"]','P2','dry-run','Nicolás Lara'),
  ('Verificador Remodelación',
   'Chequeo profundo por empresa: Airtable ↔ OS ↔ QuickBooks ↔ ClickUp (Remodelación).',
   'remodelacion','remodelacion','Integrity',
   '["remodel_* / airtable remodel / qb_* / clickup_*"]','["descuadres Airtable↔OS↔QB↔ClickUp"]',
   '["reporta descuadres (solo lectura)"]','P2','dry-run','Nicolás Lara'),
  ('Verificador Rentas',
   'Chequeo profundo por empresa: Airtable ↔ OS ↔ QuickBooks ↔ ClickUp (Rentas).',
   'rentas','rentas','Integrity',
   '["pm_* / airtable rentas / qb_* / clickup_*"]','["descuadres Airtable↔OS↔QB↔ClickUp"]',
   '["reporta descuadres (solo lectura)"]','P2','dry-run','Nicolás Lara'),
  ('Verificador Educación',
   'Chequeo profundo por empresa: Airtable ↔ OS ↔ QuickBooks ↔ ClickUp (Educación).',
   'education','education','Integrity',
   '["edu_* / airtable edu / qb_*"]','["descuadres Airtable↔OS↔QB"]',
   '["reporta descuadres (solo lectura)"]','P2','dry-run','Nicolás Lara'),

  ('Reportero Fix & Flip',
   'Briefing diario de la empresa: qué hacer hoy, qué se cumplió ayer, por persona y plata (Fix & Flip).',
   'fix-flip','fix-flip','Report',
   '["ff_* / tareas / cobranza"]','["briefing diario Fix & Flip"]',
   '["arma briefing (solo lectura)"]','P2','dry-run','Nicolás Lara'),
  ('Reportero Remodelación',
   'Briefing diario de la empresa: qué hacer hoy, qué se cumplió ayer, por persona y plata (Remodelación).',
   'remodelacion','remodelacion','Report',
   '["remodel_* / tareas / nómina"]','["briefing diario Remodelación"]',
   '["arma briefing (solo lectura)"]','P2','dry-run','Nicolás Lara'),
  ('Reportero Rentas',
   'Briefing diario de la empresa: qué hacer hoy, qué se cumplió ayer, por persona y plata (Rentas).',
   'rentas','rentas','Report',
   '["pm_* / ocupación / cobranza"]','["briefing diario Rentas"]',
   '["arma briefing (solo lectura)"]','P2','dry-run','Nicolás Lara'),
  ('Reportero Educación',
   'Briefing diario de la empresa: qué hacer hoy, qué se cumplió ayer, por persona (Educación).',
   'education','education','Report',
   '["edu_* / alumnos / planes"]','["briefing diario Educación"]',
   '["arma briefing (solo lectura)"]','P2','dry-run','Nicolás Lara')
) as v(nombre, proceso, empresa, area, capa, inputs, outputs, acciones, nivel_riesgo, estado, dueno)
where not exists (
  select 1 from public.agent_registry r where r.nombre = v.nombre and r.deleted_at is null
);

-- ── ROLLBACK ──
--   delete from public.agent_registry where nombre in (
--     'Cerebro Ejecutivo','Líder Contable & Datos','Auditor de Datos',
--     'Verificador Fix & Flip','Verificador Remodelación','Verificador Rentas','Verificador Educación',
--     'Reportero Fix & Flip','Reportero Remodelación','Reportero Rentas','Reportero Educación');
--   -- columnas capa/area quedan (aditivas, inocuas).
