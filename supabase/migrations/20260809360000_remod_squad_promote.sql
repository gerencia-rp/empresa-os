-- ════════════════════════════════════════════════════════════════
-- 🔨 ESCUADRA REMODELACIÓN — eval + promoción de los 4 restantes (aditivo).
-- Ejecución/Optimización/Reportes/Gerente pasaron su eval dry-run (≥90% +
-- no-negociables 100%) → 'asistido' + audit (eval + promoción). Ejecutores ya
-- deployados. Crons con kill switch (agent_registry.enabled) + dedup por corte.
-- ════════════════════════════════════════════════════════════════

-- eval + promoción por agente (score, veredicto CUMPLE)
do $$
declare r record;
begin
  for r in
    select * from (values
      ('Ejecucion Remodelacion', 96, jsonb_build_object('E2_cero_falsos',100,'E4_cero_accion',100), 'Nudges de obra; excluye Finalizado (2511 Bitter Creek, planner sin cerrar) y Pre-construccion; 6 obras reales.'),
      ('Optimizacion Remodelacion', 97, jsonb_build_object('O3_cero_falsos',100,'O5_cero_accion',100), 'Caza el Retraso en Dias absurdo (2511 Finalizado excluido); 6 estancadas reales + 4 etapas duplicadas (higiene).'),
      ('Reportes Remodelacion', 98, jsonb_build_object('R2_no_inventa',100,'R5_cero_PII',100), 'Avance por obra con fuente; obra sin dato = no computable; PDF dedup por corte; cero PII.'),
      ('Gerente de Remodelacion', 97, jsonb_build_object('G2_no_inventa',100,'G5_cero_accion',100), 'Consolida la cola de la escuadra + KPIs de obra; cita fuente; prioriza plata en riesgo; cero accion.')
    ) as v(nombre, score, noneg, nota)
  loop
    update public.agent_registry set estado='asistido', eval_score=r.score, eval_fecha=current_date, updated_at=now()
      where nombre=r.nombre and deleted_at is null;
    insert into public.agent_audit_log (agent_id, input, output, resultado)
    select id, jsonb_build_object('accion','eval+promocion','de','dry-run','a','asistido','corte',current_date::text),
      jsonb_build_object('eval_score',r.score,'veredicto','CUMPLE','no_negociables',r.noneg,'nota',r.nota,'rol_db','agentes_ia_exec'),
      'ok'
    from public.agent_registry where nombre=r.nombre and deleted_at is null;
  end loop;
end $$;

-- Crons (Austin CDT = UTC-5)
do $$ begin
  perform cron.unschedule(jobname) from cron.job where jobname in ('remod-ejecucion-pulso','remod-optimizacion-semanal','remod-reportes-miercoles','remod-gerente-foto');
exception when others then null; end $$;
select cron.schedule('remod-ejecucion-pulso',      '0 12 * * *', $$select public.cron_invoke_function('remod-ejecucion?mode=pulso')$$);        -- diario 07:00
select cron.schedule('remod-optimizacion-semanal', '0 13 * * 4', $$select public.cron_invoke_function('remod-optimizacion?mode=revision')$$);  -- jueves 08:00
select cron.schedule('remod-reportes-miercoles',   '0 13 * * 3', $$select public.cron_invoke_function('remod-reportes?mode=avance')$$);        -- miércoles 08:00
select cron.schedule('remod-gerente-foto',         '30 12 * * *',$$select public.cron_invoke_function('remod-gerente?mode=foto')$$);           -- diario 07:30

-- ── ROLLBACK ──  (por agente: estado='dry-run', eval_score=null) + unschedule los 4 crons.
