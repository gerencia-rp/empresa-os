-- Sistema de conocimiento del equipo IA.
-- Objetivo: conocimiento común del holding + especialidad profunda por área,
-- con fuentes y frescura verificables. No concede acceso nuevo a datos sensibles:
-- declara qué debe conocer cada agente y deja la autorización a RLS/rol ejecutor.

create table if not exists public.agent_knowledge_domains (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  area text not null,
  descripcion text not null,
  fuentes jsonb not null default '[]'::jsonb,
  metricas_clave jsonb not null default '[]'::jsonb,
  sistemas jsonb not null default '[]'::jsonb,
  freshness_hours int not null default 24 check (freshness_hours > 0),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_knowledge_assignments (
  agent_id uuid not null references public.agent_registry(id) on delete cascade,
  domain_id uuid not null references public.agent_knowledge_domains(id) on delete cascade,
  profundidad text not null check (profundidad in ('contexto','especialista')),
  obligatorio boolean not null default true,
  verified_at timestamptz,
  verification_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (agent_id, domain_id)
);

alter table public.agent_knowledge_domains enable row level security;
alter table public.agent_knowledge_assignments enable row level security;

drop policy if exists agent_knowledge_domains_read on public.agent_knowledge_domains;
create policy agent_knowledge_domains_read on public.agent_knowledge_domains
  for select to authenticated using (true);

drop policy if exists agent_knowledge_assignments_read on public.agent_knowledge_assignments;
create policy agent_knowledge_assignments_read on public.agent_knowledge_assignments
  for select to authenticated using (true);

grant select on public.agent_knowledge_domains to authenticated, agentes_ia_exec;
grant select on public.agent_knowledge_assignments to authenticated, agentes_ia_exec;

insert into public.agent_knowledge_domains
  (codigo,nombre,area,descripcion,fuentes,metricas_clave,sistemas,freshness_hours)
values
  ('holding', 'Holding y dirección', 'holding',
   'Visión transversal: prioridades, caja, decisiones, riesgos y resultados consolidados.',
   '["v_holding_pnl","pm_informes:foto_ejecutiva_holding","pm_brain_memory","agent_proposals"]',
   '["ingresos","gastos","resultado","caja atrapada","decisiones pendientes","riesgos"]',
   '["Empresa OS","Supabase","Airtable","Vercel"]', 24),
  ('fix-flip', 'Fix & Flip', 'fix-flip',
   'Pipeline de compra, underwriting, capital, HML, remodelación, venta e inversionistas.',
   '["ff_deals","v_ff_portafolio_kpi","v_pnl_casa","inv_ledger","pm_informes:foto_ejecutiva_ff"]',
   '["ARV","MAO","costo total","margen","deficit_total","capital","interés HML","días por etapa"]',
   '["Airtable Flipping","Suite de Underwriting","Portal del inversionista"]', 24),
  ('rentas', 'Rentas y Property Management', 'rentas',
   'Ocupación, contratos, cobranza, gastos, tareas, mantenimiento y rentabilidad por propiedad.',
   '["v_ocupacion","v_cartera_kpi","v_cartera_inquilino","pm_properties","pm_units","pm_bookings","pm_payments","pm_expenses","pm_informes:foto_ejecutiva_rentas"]',
   '["ocupación","renta objetivo","cobrado","vencido neto","morosos","NOI","tareas vencidas"]',
   '["Airtable Rentas","Property Manager","ClickUp"]', 12),
  ('remodelacion', 'Remodelación y obra', 'remodelacion',
   'Presupuesto, avance físico, nómina, materiales, draws, HML, inspecciones y calidad.',
   '["v_remodel_avance_vivo","remodel_at_properties","remodel_worker_hours","remodel_payroll_receipts","insp_checklist_items","pm_informes:foto_ejecutiva_remodelacion"]',
   '["avance físico","avance financiero","presupuesto","gastado","desviación","draws","calidad","retrabajo"]',
   '["Airtable Remodelación","Panel de Obra","Inspecciones"]', 12),
  ('gobernanza-ia', 'Gobernanza del equipo IA', 'meta',
   'Roles, horarios, ejecuciones, calidad, duplicados, modelos, permisos y trazabilidad del equipo IA.',
   '["agent_registry","agent_audit_log","agent_proposals","pm_informes","cron.job"]',
   '["última ejecución real","éxito","errores","frescura","cobertura","decisiones pendientes"]',
   '["Agentic OS","Supabase Edge Functions","Cron"]', 24)
on conflict (codigo) do update set
  nombre=excluded.nombre, area=excluded.area, descripcion=excluded.descripcion,
  fuentes=excluded.fuentes, metricas_clave=excluded.metricas_clave,
  sistemas=excluded.sistemas, freshness_hours=excluded.freshness_hours,
  activo=true, updated_at=now();

-- Todos conocen el holding a nivel contexto.
insert into public.agent_knowledge_assignments (agent_id, domain_id, profundidad)
select a.id, d.id, 'contexto'
from public.agent_registry a
join public.agent_knowledge_domains d on d.codigo='holding'
where a.deleted_at is null
on conflict (agent_id,domain_id) do update set profundidad='contexto', updated_at=now();

-- Especialidad profunda según el equipo/área real del agente.
insert into public.agent_knowledge_assignments (agent_id, domain_id, profundidad)
select a.id, d.id, 'especialista'
from public.agent_registry a
join public.agent_knowledge_domains d on d.codigo = case
  when lower(coalesce(a.linea,a.area,a.equipo,'')) like '%renta%' then 'rentas'
  when lower(coalesce(a.linea,a.area,a.equipo,'')) like '%remodel%' then 'remodelacion'
  when lower(coalesce(a.linea,a.area,a.equipo,'')) like '%fix%' then 'fix-flip'
  when lower(coalesce(a.linea,a.area,a.equipo,'')) like '%meta%'
    or lower(coalesce(a.capa,'')) in ('meta','integrity') then 'gobernanza-ia'
  else 'holding'
end
where a.deleted_at is null
on conflict (agent_id,domain_id) do update set profundidad='especialista', updated_at=now();

-- Cerebro y gerentes reciben contexto transversal de todas las empresas; su área
-- sigue marcada como especialista por la asignación anterior.
insert into public.agent_knowledge_assignments (agent_id, domain_id, profundidad)
select a.id, d.id, case when d.codigo='holding' then 'especialista' else 'contexto' end
from public.agent_registry a
cross join public.agent_knowledge_domains d
where a.deleted_at is null and d.activo
  and (a.nombre like 'Cerebro%' or a.nombre like 'Gerente de %')
on conflict (agent_id,domain_id) do update set
  profundidad=excluded.profundidad, updated_at=now();

create or replace view public.v_agent_knowledge_readiness
with (security_invoker=true) as
select
  a.id as agent_id,
  a.nombre,
  a.linea,
  a.estado,
  count(k.domain_id) filter (where d.activo) as dominios_asignados,
  count(k.domain_id) filter (where d.activo and k.profundidad='especialista') as dominios_especialista,
  count(k.domain_id) filter (where d.activo and k.verified_at is not null) as dominios_verificados,
  bool_and(k.verified_at is not null) filter (where d.activo and k.obligatorio) as conocimiento_verificado,
  jsonb_agg(jsonb_build_object(
    'codigo', d.codigo,
    'nombre', d.nombre,
    'profundidad', k.profundidad,
    'fuentes', d.fuentes,
    'metricas', d.metricas_clave,
    'sistemas', d.sistemas,
    'frescura_horas', d.freshness_hours,
    'verificado_en', k.verified_at
  ) order by d.codigo) filter (where d.id is not null and d.activo) as dominios
from public.agent_registry a
left join public.agent_knowledge_assignments k on k.agent_id=a.id
left join public.agent_knowledge_domains d on d.id=k.domain_id
where a.deleted_at is null
group by a.id,a.nombre,a.linea,a.estado;

grant select on public.v_agent_knowledge_readiness to authenticated, agentes_ia_exec;

comment on view public.v_agent_knowledge_readiness is
  'Contrato auditable de conocimiento por agente. Asignado no significa verificado: verified_at solo se llena después de una prueba con datos reales, fuente y fecha de corte.';
