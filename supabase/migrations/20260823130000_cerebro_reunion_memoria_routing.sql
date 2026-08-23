-- ════════════════════════════════════════════════════════════════════
-- 🧠 CEREBRO · capa de INTELIGENCIA proactiva (reunión diaria + memoria que
--    aprende + ruteo de modelo por rol). Aditiva, sin DROP.
--
-- 1) pm_brain_memory: columnas para COMPACTACIÓN auditable (freshness-wins,
--    reversible: activo=false, nunca DELETE) + grants al rol de ejecución.
-- 2) agent_registry.modelo: RUTEO DE MODELO POR ROL declarado en datos
--    (los que DECIDEN = Opus; los que barren VOLUMEN = Haiku barato).
-- 3) Alta del agente "Cerebro Matutino" (reunión diaria) con kill switch.
-- ════════════════════════════════════════════════════════════════════

-- ─── 1) Memoria que aprende ───
alter table public.pm_brain_memory add column if not exists superseded_by uuid references public.pm_brain_memory(id);
alter table public.pm_brain_memory add column if not exists hits int not null default 1;
comment on column public.pm_brain_memory.superseded_by is 'Compactación 3am: si esta memoria fue reemplazada por otra más nueva/idéntica, apunta a la ganadora (activo=false). Reversible.';
comment on column public.pm_brain_memory.hits is 'Cuántas veces se re-afirmó este aprendizaje (dedup lo incrementa en la ganadora).';

-- El rol de ejecución (least-privilege) puede leer/escribir la MEMORIA del negocio
-- (notas de gestión, no PII). El test de aislamiento sigue negando pm_credentials / PII.
grant select, insert, update on public.pm_brain_memory to agentes_ia_exec;

-- ─── 2) Ruteo de modelo por rol (ahorro: Opus decide, Haiku barre volumen) ───
alter table public.agent_registry add column if not exists modelo text;
comment on column public.agent_registry.modelo is 'Modelo LLM asignado por ROL: los que DECIDEN (Comando/Gerente/Financiero/Finance/Signal/Meta/Integrity) = claude-opus-4-8; los que barren VOLUMEN (Reportes/Optimizacion/Ejecucion/Ops) = claude-haiku-4-5-20251001. Declarado por rol, no global.';

update public.agent_registry set modelo = case
  when lower(coalesce(capa,'')) in ('comando','gerente','financiero','finance','signal','meta','integrity') then 'claude-opus-4-8'
  when unaccent(lower(coalesce(capa,''))) in ('reportes','report','optimizacion','ejecucion','ops') then 'claude-haiku-4-5-20251001'
  else 'claude-haiku-4-5-20251001'
end
where deleted_at is null and modelo is null;

-- ─── 3) Alta del agente de la reunión diaria del holding ───
insert into public.agent_registry (nombre, proceso, empresa, capa, area, linea, squad, equipo, nivel_riesgo, estado, dueno_humano, responsabilidad, modelo, enabled)
select 'Cerebro Matutino', 'Reunión diaria del holding', 'Rental Profitss', 'Comando', 'holding', 'Comando', 'Comando', 'Comando',
       'P1', 'activo', 'gerencia@rentalprofitss.com',
       'Consolida las 3 fotos ejecutivas de área (FF/Rentas/Remodelación) + los números transversales en UNA Directiva del día + la cola de decisiones que necesitan el sí del CEO, y deja un ACTA en memoria. SOLO LEE.',
       'claude-opus-4-8', true
where not exists (select 1 from public.agent_registry where nombre='Cerebro Matutino' and deleted_at is null);
