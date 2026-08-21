-- ════════════════════════════════════════════════════════════════
-- 🗂 AGENT REGISTRY · Modelo canónico (MODELO-OPERATIVO-AGENTES.md). Aditivo/soft.
-- Extiende la ficha canónica, amplía el dominio de estado, da de alta la capa Meta
-- (planificado) y agrega la policy UPDATE admin para el editor del "Mapa de Agentes".
-- NADA se borra: los transversales legacy quedan estado='en-consolidación'.
-- (La reconciliación de datos por agente —linea/equipo/parent/orden/skills/tareas/
--  eval— se aplicó junto con esta migración; ver agent_audit_log 'reconciliacion_modelo_canonico'.)
-- ════════════════════════════════════════════════════════════════

-- Columnas de la ficha canónica
alter table public.agent_registry add column if not exists linea text;
alter table public.agent_registry add column if not exists equipo text;
alter table public.agent_registry add column if not exists responsabilidad text;
alter table public.agent_registry add column if not exists skills jsonb;
alter table public.agent_registry add column if not exists tareas jsonb;
alter table public.agent_registry add column if not exists disparadores jsonb;
alter table public.agent_registry add column if not exists eval_score numeric;
alter table public.agent_registry add column if not exists eval_fecha date;
alter table public.agent_registry add column if not exists parent_id uuid;
alter table public.agent_registry add column if not exists orden int;
alter table public.agent_registry add column if not exists dueno_humano text;

-- Dominio de estado ampliado al ciclo de vida canónico
alter table public.agent_registry drop constraint if exists agent_registry_estado_check;
alter table public.agent_registry add constraint agent_registry_estado_check
  check (estado = any (array['dry-run','asistido','activo','live','planificado','en-consolidación','pausado']::text[]));

-- Capa Meta (planificado) — idempotente por nombre
insert into public.agent_registry (nombre, proceso, empresa, area, capa, linea, equipo, nivel_riesgo, estado, dueno, dueno_humano, orden)
select v.nombre, v.proceso, 'holding','holding','Meta','Meta','Capa Meta','P2','planificado','CEO','Nicolás Lara', v.orden
from (values
  ('Arquitecto de Agentes','Analiza la operación y propone agentes nuevos (ficha borrador) → Nicolás aprueba la promoción.',1),
  ('Auditor de Agentes','Vigila que los agentes existentes sigan precisos (regresión de evals), sin duplicados.',2)
) as v(nombre, proceso, orden)
where not exists (select 1 from public.agent_registry r where r.nombre=v.nombre and r.deleted_at is null);

-- Editor del Mapa de Agentes: UPDATE solo admin (el front escribe como el usuario admin)
drop policy if exists agent_registry_admin_upd on public.agent_registry;
create policy agent_registry_admin_upd on public.agent_registry for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ── ROLLBACK ──  (soft) delete de los Meta + drop de la policy; columnas quedan (aditivas).
