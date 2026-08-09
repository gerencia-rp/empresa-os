-- ════════════════════════════════════════════════════════════════
-- 🧭 EJECUTOR rentas-gerente — promoción + schedule (aditivo).
-- 1) Gerente de Rentas dry-run → 'asistido' (eval ≈98%, GE2/GE5=100%) + audit.
-- 2) SIN grants nuevos: el rol agentes_ia_exec ya lee todo lo que el Gerente
--    consolida (agent_proposals, v_cartera_kpi, pm_informes, agent_registry).
--    Escribe solo la foto a pm_informes + agent_audit_log (ya concedido).
--    PII/UPDATE/DELETE siguen negados por la DB.
-- 3) Cron: 07:30 Austin (12:30 UTC CDT) — después de los 4 ejecutores, antes del
--    brief al CEO (07:45). Consolida la cola persistente de las 4 líneas.
--    Kill switch (agent_registry.enabled). Dedup por corte (día) → 1 foto/día.
--    Con el Gerente en asistido, la Escuadra Rentas queda 100% completa.
-- ════════════════════════════════════════════════════════════════

update public.agent_registry
  set estado='asistido', eval_score=98, eval_fecha=current_date, updated_at=now()
  where nombre='Gerente de Rentas' and deleted_at is null;

insert into public.agent_audit_log (agent_id, input, output, resultado)
select id,
  jsonb_build_object('accion','promocion','de','dry-run','a','asistido','corte',current_date::text),
  jsonb_build_object('eval_score',98,'veredicto','CUMPLE','no_negociables',jsonb_build_object('GE2_no_inventa',100,'GE5_cero_accion',100),'nota','Gerente de Rentas pasó el eval; promovido a asistido. Consolida las 4 líneas en una foto ejecutiva; solo lee. Escuadra Rentas completa.'),
  'ok'
from public.agent_registry where nombre='Gerente de Rentas' and deleted_at is null;

do $$ begin perform cron.unschedule(jobname) from cron.job where jobname like 'rentas-gerente-%'; exception when others then null; end $$;
select cron.schedule('rentas-gerente-foto', '30 12 * * *', $$select public.cron_invoke_function('rentas-gerente?mode=foto')$$);  -- 07:30 Austin (CDT)

-- ── ROLLBACK ──
--   update public.agent_registry set estado='dry-run', eval_score=null, eval_fecha=null where nombre='Gerente de Rentas';
--   select cron.unschedule('rentas-gerente-foto');
