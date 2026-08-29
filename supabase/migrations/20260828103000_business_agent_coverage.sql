-- Cobertura verificable de las empresas activas por capacidades operativas.
-- La fuente de empresas es pm_companies; los agentes legacy absorbidos no cuentan.

create or replace view public.v_business_agent_coverage
with (security_invoker=true) as
with current_agents as (
  select a.*,
    case
      when lower(coalesce(a.area,''))='rentas' or lower(coalesce(a.empresa,''))='rentas' then 'rentas'
      when lower(coalesce(a.area,''))='remodelacion' or lower(coalesce(a.empresa,''))='remodelacion' then 'remodelacion'
      when lower(coalesce(a.area,''))='fix-flip' or lower(coalesce(a.empresa,'')) in('fix-flip','fix & flip') then 'fix-flip'
      when lower(coalesce(a.empresa,'')) in('holding','rental profitss')
        or lower(coalesce(a.area,'')) in('holding','contable','operacion') then 'holding'
      else null
    end business_slug
  from public.agent_registry a
  where a.deleted_at is null and a.enabled
    and coalesce(a.linea,'') !~* '^transversal'
), coverage as (
  select c.id,c.slug,c.name,c.is_holding,c.active,
    count(a.id) agentes,
    bool_or(case when c.slug='holding'
      then a.nombre ~* '(Cerebro Ejecutivo|Director de Continuidad)'
      else a.nombre ~* '^Gerente de ' end) direccion,
    bool_or(case when c.slug='holding'
      then a.nombre ~* '(Director de Continuidad|Cerebro Matutino)'
      else a.nombre ~* '(Ejecuci[oó]n|Control de Draws|Underwriting)' end) ejecucion,
    bool_or(case when c.slug='holding'
      then a.nombre ~* '(Auditor de Integridad Financiera|Sabueso Contable)'
      else a.nombre ~* '(Financiero|Capital & Inversionistas)' end) finanzas,
    bool_or(case when c.slug='holding'
      then a.nombre ~* '(Auditor de Agentes|Arquitecto de Agentes)'
      else a.nombre ~* '(Optimizaci[oó]n|Calidad de Obra)' end) optimizacion,
    bool_or(case when c.slug='holding'
      then a.nombre ~* '(Cerebro Matutino|Cerebro Ejecutivo)'
      else a.nombre ~* '(Reportes|Reportero)' end) reportes,
    bool_or(case when c.slug='holding'
      then a.nombre ~* '(Auditor de Integridad|Auditor de Agentes)'
      else a.nombre ~* '(Verificador|Gerente de |Control de Draws|Underwriting)' end) integridad
  from public.pm_companies c
  left join current_agents a on a.business_slug=c.slug
  where c.active
  group by c.id,c.slug,c.name,c.is_holding,c.active
)
select *,
  (direccion::int+ejecucion::int+finanzas::int+optimizacion::int+reportes::int+integridad::int) capacidades_cubiertas,
  array_remove(array[
    case when not direccion then 'dirección' end,
    case when not ejecucion then 'ejecución' end,
    case when not finanzas then 'finanzas' end,
    case when not optimizacion then 'optimización' end,
    case when not reportes then 'reportes' end,
    case when not integridad then 'integridad' end
  ],null) capacidades_faltantes,
  direccion and ejecucion and finanzas and optimizacion and reportes and integridad cobertura_completa
from coverage;

grant select on public.v_business_agent_coverage to authenticated;
comment on view public.v_business_agent_coverage is
  'Prueba por empresa activa seis capacidades mínimas: dirección, ejecución, finanzas, optimización, reportes e integridad.';
