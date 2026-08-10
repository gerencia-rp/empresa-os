-- ════════════════════════════════════════════════════════════════
-- 🏚 ESCUADRA FIX & FLIP — eval + promoción de 5 de los 6 restantes (aditivo).
-- Underwriting/Capital/Ejecución/Reportes/Gerente pasaron su eval dry-run (≥90% +
-- no-negociables 100%), corridos COMO agentes_ia_exec con aislamiento PASS
-- (pm_credentials/pm_tenants.document_id = permission denied; Capital además verifica
-- ff_investors.ssn/green_card = columna ausente). Ejecutores deployados. Crons con
-- kill switch (agent_registry.enabled) + dedup por corte.
--
-- ⛔ Optimización Fix & Flip NO se promueve: el espejo ff_deals colapsa las 11 etapas
-- a 5 stages y no tiene timestamps por-etapa → no puede computar "mediana de días por
-- etapa" sin inventar (viola O3). Queda en dry-run; desbloqueo = log de transición de
-- etapa por deal. Se registra en audit.
-- ════════════════════════════════════════════════════════════════
do $$
declare r record;
begin
  for r in
    select * from (values
      ('Underwriting (Fix & Flip)', 97, jsonb_build_object('U2_escala_correcta',100,'U5_cero_accion',100), 'MAO/ARV + regla all-in<=75%: 3 violaciones reales (311 Bartlett 88.7%/Garden Path 79.2%/Stonleigh 78.6%), 3 sobre MAO, 11 appraisals en 0 listados; escala 0.75 normalizada.'),
      ('Capital & Inversionistas (Fix & Flip)', 97, jsonb_build_object('C1_pii_bloqueada',100,'C5_guard_falsos',100,'C7_cero_accion',100), 'Cap table 26 holdings/22 inversionistas; capital_pagado null x22 + 2 distribuciones = sin tracking; tel (512)739-8438 colisiona (MEK/Prueba OS); PII: pm_tenants.document_id + pm_credentials permission denied, ff_investors.ssn/green_card ausente; no fusiona Yeison!=Yeisson.'),
      ('Ejecucion Fix & Flip', 95, jsonb_build_object('E2_no_flood',100,'E4_cero_accion',100), 'Nudge de 26 tareas vencidas reales (lote Refinanciacion Daniel Lara); 531 sin dueno = higiene agregada, NO 531 nudges (anti-falso-positivo); envio = aprueba humano.'),
      ('Reportes Fix & Flip', 96, jsonb_build_object('R2_no_inventa',100,'R5_cero_PII',100), 'Pipeline de 28 deals por 5 stages a pm_informes; deal sin ARV = no computable; appraisal=0 declarado; cifras con fuente; cero PII; dedup por corte.'),
      ('Gerente de Fix & Flip', 97, jsonb_build_object('G2_no_inventa',100,'G5_cero_accion',100), 'Consolida la cola de la escuadra (6 propuestas) + KPIs de ff_deals (ARV $10.7M, 26 deals, deficit $297,690/13 casas); top-3 citando agente de origen; no inventa; cero accion propia.')
    ) as v(nombre, score, noneg, nota)
  loop
    update public.agent_registry set estado='asistido', eval_score=r.score, eval_fecha=current_date, updated_at=now()
      where nombre=r.nombre and deleted_at is null;
    insert into public.agent_audit_log (agent_id, input, output, resultado)
    select id, jsonb_build_object('accion','eval+promocion','de','dry-run','a','asistido','corte',current_date::text),
      jsonb_build_object('eval_score',r.score,'veredicto','CUMPLE','no_negociables',r.noneg,'nota',r.nota,'rol_db','agentes_ia_exec','aislamiento','PASS'),
      'ok'
    from public.agent_registry where nombre=r.nombre and deleted_at is null;
  end loop;
end $$;

-- Optimización: eval dry-run NO CUMPLE (bloqueado por datos) → queda en dry-run
insert into public.agent_audit_log (agent_id, input, output, resultado)
select id, jsonb_build_object('accion','eval_dry_run','de','dry-run','a','dry-run','corte',current_date::text),
  jsonb_build_object('eval_score',55,'veredicto','NO CUMPLE (bloqueado por datos)','no_negociables',jsonb_build_object('O3_cero_falsos','n/a','O4_cero_accion',100),
    'motivo','ff_deals colapsa las 11 etapas a 5 stages y no tiene timestamps por-etapa; computar mediana de dias por etapa (O1/O2) exigiria inventar duraciones (viola O3). Se queda en dry-run.',
    'desbloqueo','sincronizar log de transicion de etapa por deal (ff_deal_stage_history) desde Airtable/ClickUp; re-evaluar.'),
  'ok'
from public.agent_registry where nombre='Optimizacion Fix & Flip' and deleted_at is null;

-- Crons (Austin CDT = UTC-5), escalonados para no pisar ff-financiero
do $$ begin perform cron.unschedule(jobname) from cron.job where jobname in
  ('ff-underwriting-semanal','ff-capital-mensual','ff-ejecucion-pulso','ff-reportes-semanal','ff-gerente-foto'); exception when others then null; end $$;
select cron.schedule('ff-underwriting-semanal', '15 13 * * 1', $$select public.cron_invoke_function('ff-underwriting?mode=uw')$$);      -- lunes 08:15 CDT
select cron.schedule('ff-capital-mensual',      '0 15 1 * *',  $$select public.cron_invoke_function('ff-capital?mode=captable')$$);     -- día 1, 10:00 CDT
select cron.schedule('ff-ejecucion-pulso',      '0 12,17,22 * * *', $$select public.cron_invoke_function('ff-ejecucion?mode=pulso')$$); -- 07/12/17 CDT
select cron.schedule('ff-reportes-semanal',     '0 13 * * 5',  $$select public.cron_invoke_function('ff-reportes?mode=pipeline')$$);    -- viernes 08:00 CDT
select cron.schedule('ff-gerente-foto',         '30 12 * * *', $$select public.cron_invoke_function('ff-gerente?mode=foto')$$);         -- diario 07:30 CDT

-- ── ROLLBACK ── (por agente: estado='dry-run', eval_score=null) + unschedule los 5 crons.
