-- Validación de solo lectura posterior al release Jarvis.
-- Ejecutar como postgres/service role en el proyecto canónico nezbaljfhhyznhltpjnk.
-- Falla de forma explícita si una compuerta estructural no se cumple.

do $$
declare v_count int;
begin
  select count(*) into v_count from public.v_automation_expectation_gaps;
  if v_count<>0 then raise exception '% trabajos activos carecen de dueño/frecuencia',v_count; end if;

  select count(*) into v_count
  from public.v_automation_effective_health
  where effective_health='healthy' and (
    evidence_at is null
    or evidence_error is not null
    or (jobname='sync-clickup-every-60min' and evidence_at<now()-interval '2 hours')
    or (jobname='pm-sync-airtable-every-15min' and evidence_at<now()-interval '1 hour')
    or (jobname in('sync-remodel-workers-hourly','sync-airtable-every-30min') and evidence_at<now()-interval '2 hours')
  );
  if v_count<>0 then raise exception '% automatizaciones tienen un verde falso',v_count; end if;

  select count(*) into v_count from public.v_business_agent_coverage where not cobertura_completa;
  if v_count<>0 then raise exception '% empresas carecen de alguna capacidad operativa',v_count; end if;

  select count(*) into v_count from public.v_financial_findings_actionable
  where responsable is null or evidencia_requerida is null or siguiente_accion is null or prioridad_operativa is null;
  if v_count<>0 then raise exception '% hallazgos financieros carecen de resolución accionable',v_count; end if;
end $$;

select jobname,area,owner_agent,criticality,effective_health,evidence_source,evidence_at,evidence_error
from public.v_automation_effective_health
where effective_health<>'healthy'
order by case criticality when 'P1' then 1 when 'P2' then 2 else 3 end,jobname;

select role_code,role_name,area,criticality,primary_ready,backup_ready,verified_at
from public.v_operational_role_coverage
where not primary_ready or not backup_ready
order by case criticality when 'P1' then 1 when 'P2' then 2 else 3 end,role_name;

select id,slug,name,capacidades_faltantes,cobertura_completa
from public.v_business_agent_coverage
order by name;

select check_id,empresa,clave,frente,responsable,prioridad_operativa,evidencia_requerida,siguiente_accion
from public.v_financial_findings_actionable
order by prioridad_operativa,check_id,id;

select tipo,corte,estado,payload->>'estado' estado_operativo,updated_at
from public.pm_informes
where tipo in('salud_automatizaciones','salud_integraciones','continuidad_ausencia_6_meses')
  and archived_at is null
order by tipo,corte desc;
