-- Candidatos basados únicamente en acceso vigente. No asigna responsabilidades:
-- experiencia, disponibilidad y aceptación siguen requiriendo confirmación humana.
create or replace view public.v_operational_role_candidates
with (security_invoker=true) as
select r.role_code,r.role_name,r.area,r.criticality,p.id profile_id,
  coalesce(nullif(p.full_name,''),p.email) candidate_name,p.email,p.role,p.allowed_areas,
  case
    when r.required_areas <@ coalesce(p.allowed_areas,'{}'::text[])
      and cardinality(coalesce(p.allowed_areas,'{}'::text[]))=cardinality(r.required_areas) then 3
    when r.required_areas <@ coalesce(p.allowed_areas,'{}'::text[]) then 2
    when p.role='admin' then 1 else 0 end suitability_score,
  case
    when r.required_areas <@ coalesce(p.allowed_areas,'{}'::text[])
      and cardinality(coalesce(p.allowed_areas,'{}'::text[]))=cardinality(r.required_areas)
      then 'acceso enfocado en el área'
    when r.required_areas <@ coalesce(p.allowed_areas,'{}'::text[])
      then 'acceso vigente a todas las áreas requeridas'
    when p.role='admin' then 'acceso administrativo; competencia no verificada'
    else 'no elegible' end access_evidence
from public.operational_role_assignments r
join public.profiles p on p.active is true and p.archived_at is null
  and (p.role='admin' or r.required_areas <@ coalesce(p.allowed_areas,'{}'::text[]))
where r.active and p.email !~* '(^qa-|test|rls-)';

grant select on public.v_operational_role_candidates to authenticated;
comment on view public.v_operational_role_candidates is
 'Lista candidatos por acceso real vigente; no prueba competencia, disponibilidad ni aceptación del rol.';
